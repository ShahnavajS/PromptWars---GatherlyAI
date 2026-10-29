import { NextRequest, NextResponse } from 'next/server';
import { GeneratePlanRequestSchema } from '@/lib/ai/schemas';
import { isGeminiConfigured, generateStructuredPlanWithGemini } from '@/lib/ai/gemini';
import { getStarterPlanTemplate } from '@/lib/ai/fallbacks';
import { getEventById } from '@/lib/services/eventService';
import { savePlanSuggestion, getLatestPlanSuggestion } from '@/lib/services/planReviewService';
import { getCurrentSessionUser } from '@/lib/auth/session';
import { ZodError } from 'zod';

export async function GET(req: NextRequest) {
  try {
    const session = getCurrentSessionUser();
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ success: false, error: 'eventId parameter required.' }, { status: 400 });
    }

    const suggestion = await getLatestPlanSuggestion(eventId, session.id);
    return NextResponse.json({
      success: true,
      isGeminiConfigured: isGeminiConfigured(),
      suggestion,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve suggestion.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getCurrentSessionUser();
    const body = await req.json();
    const validated = GeneratePlanRequestSchema.parse(body);

    // Fetch existing event data
    const eventDetail = await getEventById(validated.eventId, session.id);
    if (!eventDetail) {
      return NextResponse.json({ success: false, error: 'Event not found or unauthorized.' }, { status: 404 });
    }

    const totalBudgetRupees = Math.round(eventDetail.budget.totalBudgetPaise / 100);
    const promptCtx = {
      eventTitle: eventDetail.event.title,
      eventType: eventDetail.event.eventType,
      startDate: eventDetail.event.startDate,
      endDate: eventDetail.event.endDate,
      venueCity: eventDetail.event.venueCity,
      venueName: eventDetail.event.venueName,
      targetGuestCount: eventDetail.event.targetGuestCount,
      totalBudgetRupees,
      additionalContext: validated.additionalContext,
    };

    let generatedPlan;
    let modelUsed: string;
    let isFallback = false;

    if (isGeminiConfigured()) {
      try {
        const result = await generateStructuredPlanWithGemini(promptCtx);
        generatedPlan = result.plan;
        modelUsed = result.modelUsed;
      } catch (geminiError: unknown) {
        console.error('[Gemini Generation Error]', geminiError);
        const errMsg = geminiError instanceof Error ? geminiError.message : 'Gemini call failed.';
        return NextResponse.json({ success: false, error: errMsg }, { status: 502 });
      }
    } else {
      // Honest deterministic fallback template when Gemini is not configured
      const fallback = getStarterPlanTemplate(
        eventDetail.event.eventType,
        eventDetail.event.title,
        eventDetail.event.venueCity,
        eventDetail.event.targetGuestCount,
        totalBudgetRupees,
        eventDetail.event.startDate
      );
      generatedPlan = fallback.plan;
      modelUsed = fallback.modelUsed;
      isFallback = true;
    }

    // Save as reviewable suggestion
    const saved = await savePlanSuggestion(
      validated.eventId,
      validated.additionalContext.slice(0, 200) || 'General event plan',
      generatedPlan,
      modelUsed
    );

    return NextResponse.json(
      {
        success: true,
        suggestionId: saved.id,
        plan: generatedPlan,
        modelUsed,
        isFallback,
        status: saved.status,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed.',
          issues: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : 'Internal server error.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


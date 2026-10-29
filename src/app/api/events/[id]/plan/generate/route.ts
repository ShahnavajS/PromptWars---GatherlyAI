import { NextRequest, NextResponse } from 'next/server';
import { GeneratePlanRequestSchema } from '@/lib/ai/schemas';
import { isGeminiConfigured, generateStructuredPlanWithGemini } from '@/lib/ai/gemini';
import { getStarterPlanTemplate } from '@/lib/ai/fallbacks';
import { getEventById } from '@/lib/services/eventService';
import { getPreferences } from '@/lib/services/preferencesService';
import { savePlanSuggestion } from '@/lib/services/planReviewService';
import { getCurrentSessionUser, UnauthorizedSessionError } from '@/lib/auth/session';
import { ZodError } from 'zod';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = getCurrentSessionUser(req);
    const body = await req.json();
    const validated = GeneratePlanRequestSchema.parse(body);

    // Fetch existing event data
    const eventDetail = await getEventById(id, session.id);
    if (!eventDetail) {
      return NextResponse.json({ success: false, error: 'Event not found or unauthorized.' }, { status: 404 });
    }

    // Fetch cultural preferences and append to context
    let enrichedContext = validated.additionalContext || '';
    try {
      const preferences = await getPreferences(id, session.id);
      if (preferences) {
        const prefContext = [
          preferences.culturalPreset ? `Cultural preset: ${preferences.culturalPreset}` : '',
          preferences.dietaryPreference ? `Dietary preference: ${preferences.dietaryPreference}` : '',
          preferences.decorStyle ? `Decor style: ${preferences.decorStyle}` : '',
          preferences.entertainmentStyle ? `Entertainment style: ${preferences.entertainmentStyle}` : '',
          preferences.accessibilityNotes ? `Accessibility: ${preferences.accessibilityNotes}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        if (prefContext) {
          enrichedContext = enrichedContext
            ? `${enrichedContext}\n\n[Cultural Preferences]\n${prefContext}`
            : `[Cultural Preferences]\n${prefContext}`;
        }
      }
    } catch {
      // Preferences fetch failure is non-blocking
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
      additionalContext: enrichedContext,
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
      id,
      enrichedContext.slice(0, 200) || 'General event plan',
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
    if (error instanceof UnauthorizedSessionError) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

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


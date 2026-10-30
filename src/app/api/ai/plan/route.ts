import { NextRequest, NextResponse } from 'next/server';
import { GeneratePlanRequestSchema } from '@/lib/ai/schemas';
import { isGeminiConfigured, generateStructuredPlanWithGemini } from '@/lib/ai/gemini';
import { getStarterPlanTemplate } from '@/lib/ai/fallbacks';
import { getEventById } from '@/lib/services/eventService';
import { savePlanSuggestion, getLatestPlanSuggestion } from '@/lib/services/planReviewService';
import { getPreferences } from '@/lib/services/preferencesService';
import { getCurrentSessionUser, UnauthorizedSessionError } from '@/lib/auth/session';
import { allowRequest } from '@/lib/auth/rateLimit';
import { ZodError } from 'zod';

export async function GET(req: NextRequest) {
  try {
    const session = getCurrentSessionUser(req);
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
    if (err instanceof UnauthorizedSessionError) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getCurrentSessionUser(req);
    const body = await req.json();
    const validated = GeneratePlanRequestSchema.parse(body);

    // Fetch existing event data
    const eventDetail = await getEventById(validated.eventId, session.id);
    if (!eventDetail) {
      return NextResponse.json({ success: false, error: 'Event not found or unauthorized.' }, { status: 404 });
    }
    if (!allowRequest('ai-plan', session.id, 10, 60 * 60_000)) {
      return NextResponse.json({ success: false, error: 'Plan generation limit reached. Try again later.' }, { status: 429 });
    }

    const totalBudgetRupees = Math.round(eventDetail.budget.totalBudgetPaise / 100);
    const preferences = await getPreferences(validated.eventId, session.id);
    const preferenceNotes = preferences ? [
      `Cultural preset: ${validated.culturalTraditionOverride || preferences.culturalPreset}`,
      `Dietary preference: ${validated.dietaryPreferenceOverride || preferences.dietaryPreference}`,
      preferences.accessibilityNotes ? `Accessibility: ${preferences.accessibilityNotes}` : '',
      preferences.decorStyle ? `Decor style: ${preferences.decorStyle}` : '',
      preferences.entertainmentStyle ? `Entertainment style: ${preferences.entertainmentStyle}` : '',
    ].filter(Boolean).join('\n') : '';
    const promptCtx = {
      eventTitle: eventDetail.event.title,
      eventType: eventDetail.event.eventType,
      startDate: eventDetail.event.startDate,
      endDate: eventDetail.event.endDate,
      venueCity: eventDetail.event.venueCity,
      venueName: eventDetail.event.venueName,
      targetGuestCount: eventDetail.event.targetGuestCount,
      totalBudgetRupees,
      additionalContext: [validated.additionalContext, preferenceNotes].filter(Boolean).join('\n\n'),
    };

    let generatedPlan;
    let modelUsed: string;
    let isFallback = false;

    if (isGeminiConfigured()) {
      try {
        const result = await generateStructuredPlanWithGemini(promptCtx);
        generatedPlan = result.plan;
        modelUsed = result.modelUsed;
      } catch {
        return NextResponse.json({ success: false, error: 'AI planning service is temporarily unavailable.' }, { status: 502 });
      }
    } else {
      // Honest deterministic fallback template when Gemini is not configured
      const fallback = getStarterPlanTemplate(
        eventDetail.event.eventType,
        eventDetail.event.title,
        eventDetail.event.venueCity,
        eventDetail.event.targetGuestCount,
        totalBudgetRupees,
        eventDetail.event.startDate,
        preferences?.culturalPreset
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
    if (error instanceof UnauthorizedSessionError) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed.',
          issues: error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}


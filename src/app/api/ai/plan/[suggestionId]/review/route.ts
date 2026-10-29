import { NextRequest, NextResponse } from 'next/server';
import { ReviewActionSchema } from '@/lib/ai/schemas';
import { applyPlanReview } from '@/lib/services/planReviewService';
import { getCurrentSessionUser } from '@/lib/auth/session';
import { ZodError } from 'zod';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ suggestionId: string }> }
) {
  try {
    const session = getCurrentSessionUser(req);
    const { suggestionId } = await params;
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');

    if (!suggestionId || !eventId) {
      return NextResponse.json(
        { success: false, error: 'suggestionId and eventId query parameter required.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validated = ReviewActionSchema.parse(body);

    const result = await applyPlanReview(
      eventId,
      suggestionId,
      {
        action: validated.action,
        selectedCategoryNames: validated.selectedCategoryNames,
        selectedTaskIds: validated.selectedTaskIds,
      },
      session.id
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
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
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}


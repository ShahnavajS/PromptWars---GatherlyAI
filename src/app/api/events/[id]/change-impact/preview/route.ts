import { NextRequest, NextResponse } from 'next/server';
import { ChangePreviewRequestSchema } from '@/lib/domain/impact/schemas';
import { generateChangePreview, UnauthorizedEventError } from '@/lib/services/changeImpactService';
import { getCurrentSessionUser } from '@/lib/auth/session';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid event ID.' }, { status: 400 });
    }

    const sessionUser = getCurrentSessionUser();
    const body = await req.json();

    const parseResult = ChangePreviewRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        { success: false, error: `${issue.path.join('.')}: ${issue.message}` },
        { status: 400 }
      );
    }

    const preview = await generateChangePreview(eventId, parseResult.data, sessionUser.id);
    return NextResponse.json({ success: true, preview });
  } catch (error: unknown) {
    if (error instanceof UnauthorizedEventError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : 'Internal server error.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getEventHistory, UnauthorizedEventError } from '@/lib/services/changeImpactService';
import { getCurrentSessionUser, UnauthorizedSessionError } from '@/lib/auth/session';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid event ID.' }, { status: 400 });
    }

    const sessionUser = getCurrentSessionUser(req);
    const history = await getEventHistory(eventId, sessionUser.id);

    return NextResponse.json({ success: true, history });
  } catch (error: unknown) {
    if (error instanceof UnauthorizedSessionError) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    if (error instanceof UnauthorizedEventError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : 'Internal server error.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

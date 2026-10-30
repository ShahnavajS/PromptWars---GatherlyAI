import { NextRequest, NextResponse } from 'next/server';
import { getEventById } from '@/lib/services/eventService';
import { getCurrentSessionUser, UnauthorizedSessionError } from '@/lib/auth/session';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid event ID.' }, { status: 400 });
    }

    const session = getCurrentSessionUser(req);
    const eventDetail = await getEventById(id, session.id);
    if (!eventDetail) {
      return NextResponse.json({ success: false, error: 'Event not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: eventDetail });
  } catch (error: unknown) {
    if (error instanceof UnauthorizedSessionError) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

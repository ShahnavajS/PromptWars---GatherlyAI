import { NextRequest, NextResponse } from 'next/server';
import { getEventById } from '@/lib/services/eventService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid event ID.' }, { status: 400 });
    }

    const eventDetail = await getEventById(id);
    if (!eventDetail) {
      return NextResponse.json({ success: false, error: 'Event not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: eventDetail });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

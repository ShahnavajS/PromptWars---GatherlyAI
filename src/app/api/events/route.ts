import { NextRequest, NextResponse } from 'next/server';
import { createEvent, listEvents } from '@/lib/services/eventService';
import { CreateEventSchema } from '@/lib/validation/events';
import { getCurrentSessionUser, UnauthorizedSessionError } from '@/lib/auth/session';
import { ZodError } from 'zod';

export async function GET(req: NextRequest) {
  try {
    const session = getCurrentSessionUser(req);
    const events = await listEvents(session.id);
    return NextResponse.json({ success: true, events });
  } catch (error: unknown) {
    if (error instanceof UnauthorizedSessionError) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch events.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getCurrentSessionUser(req);
    const body = await req.json();
    const validated = CreateEventSchema.parse(body);

    const eventDetail = await createEvent(validated, session.id);
    return NextResponse.json({ success: true, data: eventDetail }, { status: 201 });
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

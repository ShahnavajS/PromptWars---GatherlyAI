import { readJsonBody, jsonBodyErrorResponse } from '@/lib/api/jsonBody';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSessionUser, UnauthorizedSessionError } from '@/lib/auth/session';
import { getScheduleItems, createScheduleItem, detectConflicts } from '@/lib/services/scheduleService';
import { CreateScheduleItemSchema } from '@/lib/validation/schedule';
import { ZodError } from 'zod';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = getCurrentSessionUser(req);

    const items = await getScheduleItems(id, session.id);
    const conflicts = detectConflicts(items);

    return NextResponse.json({ success: true, data: { items, conflicts } });
  } catch (error: unknown) {
    if (error instanceof UnauthorizedSessionError) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : 'Internal server error.';
    if (message === 'NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Event not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = getCurrentSessionUser(req);

    const body = await readJsonBody(req);
    const validated = CreateScheduleItemSchema.parse(body);

    const item = await createScheduleItem(id, session.id, validated);
    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error: unknown) {
    const bodyError = jsonBodyErrorResponse(error);
    if (bodyError) return bodyError;
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
    const message = error instanceof Error ? error.message : 'Internal server error.';
    if (message === 'NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Event not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}


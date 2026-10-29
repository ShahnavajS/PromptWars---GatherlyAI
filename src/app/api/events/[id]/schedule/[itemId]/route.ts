import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSessionUser } from '@/lib/auth/session';
import { updateScheduleItem, deleteScheduleItem } from '@/lib/services/scheduleService';
import { UpdateScheduleItemSchema } from '@/lib/validation/schedule';
import { ZodError } from 'zod';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const session = getCurrentSessionUser(req);

    const body = await req.json();
    const validated = UpdateScheduleItemSchema.parse(body);

    const item = await updateScheduleItem(id, session.id, itemId, validated);
    return NextResponse.json({ success: true, data: item });
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
    if (message === 'NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Schedule item not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const session = getCurrentSessionUser(req);

    await deleteScheduleItem(id, session.id, itemId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error.';
    if (message === 'NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Schedule item not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


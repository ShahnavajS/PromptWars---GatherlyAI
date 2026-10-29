import { NextRequest, NextResponse } from 'next/server';
import { updateTask } from '@/lib/services/eventService';
import { UpdateTaskSchema } from '@/lib/validation/events';
import { ZodError } from 'zod';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id, taskId } = await params;
    if (!id || !taskId) {
      return NextResponse.json({ success: false, error: 'Invalid parameters.' }, { status: 400 });
    }

    const body = await req.json();
    const validated = UpdateTaskSchema.parse(body);

    const updatedTask = await updateTask(id, taskId, validated);
    return NextResponse.json({ success: true, data: updatedTask });
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

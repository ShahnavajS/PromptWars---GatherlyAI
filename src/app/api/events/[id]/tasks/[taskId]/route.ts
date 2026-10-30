import { readJsonBody, jsonBodyErrorResponse } from '@/lib/api/jsonBody';
import { NextRequest, NextResponse } from 'next/server';
import { updateTask } from '@/lib/services/eventService';
import { UpdateTaskSchema } from '@/lib/validation/events';
import { getCurrentSessionUser, UnauthorizedSessionError } from '@/lib/auth/session';
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

    const session = getCurrentSessionUser(req);
    const body = await readJsonBody(req);
    const validated = UpdateTaskSchema.parse(body);

    const updatedTask = await updateTask(id, taskId, validated, session.id);
    return NextResponse.json({ success: true, data: updatedTask });
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
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

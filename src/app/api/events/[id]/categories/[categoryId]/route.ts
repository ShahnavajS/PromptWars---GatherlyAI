import { NextRequest, NextResponse } from 'next/server';
import { updateCategoryAllocation } from '@/lib/services/eventService';
import { UpdateCategoryAllocationSchema } from '@/lib/validation/events';
import { getCurrentSessionUser, UnauthorizedSessionError } from '@/lib/auth/session';
import { ZodError } from 'zod';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; categoryId: string }> }
) {
  try {
    const { id, categoryId } = await params;
    if (!id || !categoryId) {
      return NextResponse.json({ success: false, error: 'Invalid parameters.' }, { status: 400 });
    }

    const session = getCurrentSessionUser(req);
    const body = await req.json();
    const validated = UpdateCategoryAllocationSchema.parse(body);

    const result = await updateCategoryAllocation(id, categoryId, validated.allocatedPaise, session.id);
    return NextResponse.json({ success: true, data: result });
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
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

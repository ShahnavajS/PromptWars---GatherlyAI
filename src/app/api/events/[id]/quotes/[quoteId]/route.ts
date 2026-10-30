import { readJsonBody, jsonBodyErrorResponse } from '@/lib/api/jsonBody';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSessionUser, UnauthorizedSessionError } from '@/lib/auth/session';
import { updateQuoteStatus } from '@/lib/services/vendorService';
import { ZodError, z } from 'zod';

const UpdateQuoteStatusSchema = z.object({
  status: z.enum(['RECEIVED', 'SHORTLISTED', 'REJECTED', 'SUPERSEDED']),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; quoteId: string }> }
) {
  try {
    const { id, quoteId } = await params;
    const session = getCurrentSessionUser(req);

    const body = await readJsonBody(req);
    const validated = UpdateQuoteStatusSchema.parse(body);

    const quote = await updateQuoteStatus(id, session.id, quoteId, validated.status);
    return NextResponse.json({ success: true, data: quote });
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
      return NextResponse.json({ success: false, error: 'Quote not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSessionUser } from '@/lib/auth/session';
import { applyQuoteToBudget } from '@/lib/services/vendorService';
import { ZodError, z } from 'zod';

const ApplyToBudgetSchema = z.object({
  categoryId: z.string().trim().min(5),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; quoteId: string }> }
) {
  try {
    const { id, quoteId } = await params;
    const session = getCurrentSessionUser(req);

    const body = await req.json();
    const validated = ApplyToBudgetSchema.parse(body);

    const result = await applyQuoteToBudget(id, session.id, quoteId, validated.categoryId);
    return NextResponse.json({ success: true, data: result });
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
      return NextResponse.json({ success: false, error: 'Quote not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


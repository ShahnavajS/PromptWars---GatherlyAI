import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSessionUser } from '@/lib/auth/session';
import { getVendors, createVendor } from '@/lib/services/vendorService';
import { CreateVendorSchema } from '@/lib/validation/vendor';
import { ZodError } from 'zod';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = getCurrentSessionUser(req);

    const vendors = await getVendors(id, session.id);
    return NextResponse.json({ success: true, data: vendors });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error.';
    if (message === 'NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Event not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = getCurrentSessionUser(req);

    const body = await req.json();
    const validated = CreateVendorSchema.parse(body);

    const vendor = await createVendor(id, session.id, validated);
    return NextResponse.json({ success: true, data: vendor }, { status: 201 });
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
      return NextResponse.json({ success: false, error: 'Event not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


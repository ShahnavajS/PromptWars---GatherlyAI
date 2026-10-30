import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSessionUser, UnauthorizedSessionError } from '@/lib/auth/session';
import { getVendorById, updateVendor, deleteVendor } from '@/lib/services/vendorService';
import { UpdateVendorSchema } from '@/lib/validation/vendor';
import { ZodError } from 'zod';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; vendorId: string }> }
) {
  try {
    const { id, vendorId } = await params;
    const session = getCurrentSessionUser(req);

    const vendor = await getVendorById(id, session.id, vendorId);
    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Vendor not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: vendor });
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; vendorId: string }> }
) {
  try {
    const { id, vendorId } = await params;
    const session = getCurrentSessionUser(req);

    const body = await req.json();
    const validated = UpdateVendorSchema.parse(body);

    const vendor = await updateVendor(id, session.id, vendorId, validated);
    return NextResponse.json({ success: true, data: vendor });
  } catch (error: unknown) {
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
      return NextResponse.json({ success: false, error: 'Vendor not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; vendorId: string }> }
) {
  try {
    const { id, vendorId } = await params;
    const session = getCurrentSessionUser(req);

    await deleteVendor(id, session.id, vendorId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof UnauthorizedSessionError) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : 'Internal server error.';
    if (message === 'NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Vendor not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}


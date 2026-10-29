import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSessionUser, UnauthorizedSessionError } from '@/lib/auth/session';
import { getPreferences, updatePreferences } from '@/lib/services/preferencesService';
import { CULTURAL_PRESETS } from '@/lib/services/preferencesService';
import { UpdatePreferencesSchema } from '@/lib/validation/preferences';
import { ZodError } from 'zod';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = getCurrentSessionUser(req);

    const preferences = await getPreferences(id, session.id);
    return NextResponse.json({ success: true, data: { preferences, presets: CULTURAL_PRESETS } });
  } catch (error: unknown) {
    if (error instanceof UnauthorizedSessionError) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : 'Internal server error.';
    if (message === 'NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Event not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = getCurrentSessionUser(req);

    const body = await req.json();
    const validated = UpdatePreferencesSchema.parse(body);

    const preferences = await updatePreferences(id, session.id, validated);
    return NextResponse.json({ success: true, data: preferences });
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
    if (message === 'NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Event not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


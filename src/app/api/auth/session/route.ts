import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentSessionUser,
  createSignedSessionToken,
  DEMO_USER,
} from '@/lib/auth/session';
import { z } from 'zod';

const CreateSessionSchema = z.object({
  userId: z.string().trim().min(3).max(50),
  name: z.string().trim().min(2).max(100),
  email: z.string().email(),
  isDemo: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const user = getCurrentSessionUser(req);
    return NextResponse.json({ success: true, data: user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CreateSessionSchema.parse(body);

    const token = createSignedSessionToken({
      id: validated.userId,
      name: validated.name,
      email: validated.email,
      isDemo: validated.isDemo,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        id: validated.userId,
        name: validated.name,
        email: validated.email,
        isDemoMode: validated.isDemo,
      },
      token,
    });

    // Set secure HTTP-only cookie
    response.cookies.set('gatherly_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 86400 * 7,
    });

    return response;
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid session input.', issues: err.errors },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : 'Session creation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    data: DEMO_USER,
    message: 'Session cleared. Reverted to default demo.',
  });

  response.cookies.delete('gatherly_session');
  return response;
}


import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSessionToken, getCurrentSessionUser, readSessionCookie, revokeSessionToken, SESSION_COOKIE, SESSION_SECONDS, validateCsrfOrigin } from '@/lib/auth/session';
import { authenticateUser, ensureExampleAccount, exampleAccountConfig, registerUser } from '@/lib/auth/accounts';
import { allowRequest } from '@/lib/auth/rateLimit';

const Credentials = z.object({
  mode: z.enum(['login', 'register']).optional(),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(256),
}).strict();
const Register = Credentials.extend({ name: z.string().trim().min(2).max(100) });

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({ success: true, data: getCurrentSessionUser(req) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(req: NextRequest) {
  if (!validateCsrfOrigin(req)) {
    return NextResponse.json({ success: false, error: 'Origin validation failed.' }, { status: 403 });
  }
  try {
    if (Number(req.headers.get('content-length') || 0) > 4096) {
      return NextResponse.json({ success: false, error: 'Request too large.' }, { status: 413 });
    }
    const raw = await req.text();
    if (Buffer.byteLength(raw) > 4096) {
      return NextResponse.json({ success: false, error: 'Request too large.' }, { status: 413 });
    }
    const body = JSON.parse(raw);
    const mode = body?.mode === 'register' ? 'register' : 'login';
    const input = (mode === 'register' ? Register : Credentials).parse(body);
    if (!allowRequest('auth-global', 'all', 200, 15 * 60_000)) {
      return NextResponse.json({ success: false, error: 'Too many attempts. Try again later.' }, { status: 429 });
    }
    if (!allowRequest(`auth-${mode}`, input.email.toLowerCase(), 10, 15 * 60_000)) {
      return NextResponse.json({ success: false, error: 'Too many attempts. Try again later.' }, { status: 429 });
    }
    let user;
    if (mode === 'register') {
      user = await registerUser((input as z.infer<typeof Register>).name, input.email, input.password);
    } else {
      if (exampleAccountConfig().enabled && input.email.toLowerCase() === exampleAccountConfig().email) {
        await ensureExampleAccount();
      }
      user = await authenticateUser(input.email, input.password);
      if (!user || (user.id === 'usr_example' && !exampleAccountConfig().enabled)) {
        return NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 401 });
      }
    }
    const token = createSessionToken(user);
    const response = NextResponse.json({ success: true, data: { ...user, isDemoMode: user.id === 'usr_example' } }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_SECONDS,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: 'Enter a valid email and a password of at least 12 characters.' }, { status: 400 });
    }
    if (error instanceof Error && /UNIQUE constraint failed: users.email/.test(error.message)) {
      return NextResponse.json({ success: false, error: 'An account with this email already exists.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: 'Could not complete sign in.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!validateCsrfOrigin(req)) {
    return NextResponse.json({ success: false, error: 'Origin validation failed.' }, { status: 403 });
  }
  revokeSessionToken(readSessionCookie(req));
  const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  return response;
}


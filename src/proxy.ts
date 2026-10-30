import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSessionUser } from '@/lib/auth/session';

export function proxy(request: NextRequest) {
  try {
    getCurrentSessionUser(request);
    return NextResponse.next();
  } catch {
    const url = new URL('/sign-in', request.url);
    url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
}

export const config = { matcher: ['/events/:path*'] };

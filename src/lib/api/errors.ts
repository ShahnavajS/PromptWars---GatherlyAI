/**
 * Gatherly AI — Production-safe API error utilities
 *
 * Internal error messages (DB paths, SQL errors, stack traces) must not be
 * leaked to clients. Only known service sentinels are preserved.
 */

import { UnauthorizedSessionError } from '@/lib/auth/session';
import { NextResponse } from 'next/server';

/**
 * Returns the NOT_FOUND sentinel or a generic fallback.
 */
export function safeErrorMessage(error: unknown, fallback = 'Internal server error.'): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message === 'NOT_FOUND') return message;
  return fallback;
}

/**
 * Converts an unknown catch error to the appropriate NextResponse.
 * Handles UnauthorizedSessionError → 401, NOT_FOUND sentinel → 404,
 * and all other errors → 500 with safe message.
 */
export function apiErrorResponse(error: unknown): NextResponse {
  if (error instanceof UnauthorizedSessionError) {
    return NextResponse.json(
      { success: false, error: 'Authentication required.' },
      { status: 401 }
    );
  }

  const message = safeErrorMessage(error);

  if (message === 'NOT_FOUND') {
    return NextResponse.json({ success: false, error: 'Event not found.' }, { status: 404 });
  }

  return NextResponse.json({ success: false, error: message }, { status: 500 });
}


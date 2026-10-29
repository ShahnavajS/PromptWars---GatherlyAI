/**
 * Gatherly AI — Production-safe API error utilities
 *
 * In production, internal error messages (DB paths, SQL errors, stack traces)
 * must not be leaked to clients. This module provides a sanitize helper that
 * returns the original message in development and a generic fallback in production.
 */

import { UnauthorizedSessionError } from '@/lib/auth/session';
import { NextResponse } from 'next/server';

/**
 * Known safe-to-surface error message prefixes from application services.
 * These are sentinel strings returned by services (never raw DB errors).
 */
const SAFE_MESSAGE_PATTERNS: RegExp[] = [
  /^Event not found/i,
  /^Unauthorized/i,
  /^Invalid/i,
  /^Not found/i,
  /^Validation failed/i,
  /^Budget category/i,
  /^Gemini/i,
  /^GEMINI_API_KEY/i,
  /^Authentication/i,
  /^Demo mode disabled/i,
  /^AUTH_SECRET/i,
];

/**
 * Returns a client-safe error message.
 * In development: returns the full message for easier debugging.
 * In production: returns the message only if it matches known-safe patterns,
 * otherwise returns a generic fallback to prevent information leakage.
 */
export function safeErrorMessage(error: unknown, fallback = 'Internal server error.'): string {
  const message = error instanceof Error ? error.message : String(error);

  if (process.env.NODE_ENV !== 'production') {
    return message;
  }

  for (const pattern of SAFE_MESSAGE_PATTERNS) {
    if (pattern.test(message)) return message;
  }

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


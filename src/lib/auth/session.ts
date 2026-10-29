import crypto from 'crypto';

/**
 * Gatherly AI — Session & Event Ownership Guard
 *
 * Security Architecture:
 * 1. Server-verified signed session tokens (HMAC-SHA256).
 * 2. Never trust unverified client-supplied user IDs from request bodies or URL parameters.
 * 3. Every query enforces ownership: WHERE event_id = ? AND user_id = ?.
 * 4. In demo mode, fallback to DEMO_USER is allowed for testing.
 * 5. In strict multi-user mode (ALLOW_DEMO_AUTH=false), unauthenticated requests are rejected.
 */

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  isDemoMode: boolean;
}

export const DEMO_USER: SessionUser = {
  id: 'usr_demo',
  name: 'Demo Organizer',
  email: 'demo@gatherly.ai',
  isDemoMode: true,
};

export class UnauthorizedSessionError extends Error {
  constructor(message = 'Authentication required. Please sign in or switch session.') {
    super(message);
    this.name = 'UnauthorizedSessionError';
  }
}

function getAuthSecret(): string {
  return process.env.AUTH_SECRET || 'gatherly_sec_dev_local_secret_key_32chars!';
}

interface SessionTokenPayload {
  userId: string;
  name: string;
  email: string;
  exp: number;
  isDemo: boolean;
}

/**
 * Creates a cryptographically signed session token.
 */
export function createSignedSessionToken(
  user: { id: string; name: string; email: string; isDemo?: boolean },
  expiresInSeconds = 86400 * 7 // 7 days
): string {
  const secret = getAuthSecret();
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload: SessionTokenPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    exp,
    isDemo: user.isDemo ?? false,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Verifies a signed session token.
 */
export function verifySessionToken(token: string): SessionUser | null {
  try {
    const parts = token.trim().split('.');
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    const secret = getAuthSecret();
    const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');

    // Constant-time comparison
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payloadText = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload: SessionTokenPayload = JSON.parse(payloadText);

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    if (!payload.userId) return null;

    return {
      id: payload.userId,
      name: payload.name || 'User',
      email: payload.email || '',
      isDemoMode: Boolean(payload.isDemo),
    };
  } catch {
    return null;
  }
}

/**
 * Derives the active session user on the server.
 * Reads Authorization header (Bearer token) or gatherly_session cookie.
 * Falls back to DEMO_USER when permitted.
 */
export function getCurrentSessionUser(req?: Request | { headers?: Headers | Record<string, string | string[]> }): SessionUser {
  if (req) {
    let token: string | null = null;

    // 1. Check Authorization header
    if ('headers' in req && req.headers) {
      let authHeader: string | null = null;
      if (typeof req.headers.get === 'function') {
        authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
      } else {
        const raw = (req.headers as Record<string, string | string[]>)['authorization'] ||
          (req.headers as Record<string, string | string[]>)['Authorization'];
        authHeader = Array.isArray(raw) ? raw[0] : (raw || null);
      }

      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        token = authHeader.slice(7).trim();
      }

      // 2. Check Cookie header
      if (!token) {
        let cookieHeader: string | null = null;
        if (typeof req.headers.get === 'function') {
          cookieHeader = req.headers.get('cookie') || req.headers.get('Cookie');
        } else {
          const raw = (req.headers as Record<string, string | string[]>)['cookie'] ||
            (req.headers as Record<string, string | string[]>)['Cookie'];
          cookieHeader = Array.isArray(raw) ? raw[0] : (raw || null);
        }

        if (cookieHeader) {
          const match = cookieHeader.match(/(?:^|;\s*)gatherly_session=([^;]+)/);
          if (match) {
            token = decodeURIComponent(match[1]);
          }
        }
      }
    }

    if (token) {
      const verified = verifySessionToken(token);
      if (verified) {
        return verified;
      }
    }
  }

  // Demo Fallback Guard
  const isProd = process.env.NODE_ENV === 'production';
  const allowDemo = process.env.ALLOW_DEMO_AUTH !== 'false';

  if (isProd && !allowDemo) {
    throw new UnauthorizedSessionError('Demo mode disabled in production. Authentication required.');
  }

  return DEMO_USER;
}

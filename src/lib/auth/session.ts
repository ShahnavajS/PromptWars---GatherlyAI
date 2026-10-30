import crypto from 'node:crypto';
import { getRawSqlite } from '@/lib/db';
import { exampleAccountConfig } from './accounts';
import { SESSION_COOKIE } from './constants';

export { SESSION_COOKIE } from './constants';
export const SESSION_SECONDS = 12 * 60 * 60;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  isDemoMode: boolean;
}

export class UnauthorizedSessionError extends Error {
  constructor(message = 'Authentication required.') {
    super(message);
    this.name = 'UnauthorizedSessionError';
  }
}

function header(req: Request | { headers?: Headers | Record<string, string | string[]> }, name: string): string | null {
  const headers = req.headers;
  if (!headers) return null;
  if (typeof headers.get === 'function') return headers.get(name);
  const record = headers as Record<string, string | string[]>;
  const value = record[name] ?? record[name.toLowerCase()] ?? record[name.toUpperCase()];
  return Array.isArray(value) ? value[0] : value ?? null;
}

/** Browser mutations must originate on this host; bearer clients are not cookie-CSRF targets. */
export function validateCsrfOrigin(req: Request | { headers?: Headers | Record<string, string | string[]> }): boolean {
  const fetchSite = header(req, 'sec-fetch-site');
  if (fetchSite === 'cross-site') return false;
  const source = header(req, 'origin') || header(req, 'referer');
  if (!source || source === 'null') return false;
  if (process.env.NODE_ENV === 'production' && !process.env.APP_ORIGIN) return false;
  try {
    const url = new URL(source);
    const expected = process.env.APP_ORIGIN || ('url' in req && typeof req.url === 'string' ? new URL(req.url).origin : '');
    if (!expected) return false;
    const target = new URL(expected);
    if (process.env.NODE_ENV === 'production' && target.protocol !== 'https:') return false;
    return ['http:', 'https:'].includes(url.protocol) && url.origin.toLowerCase() === target.origin.toLowerCase();
  } catch {
    return false;
  }
}

function tokenHash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** The browser gets only a random token. The database keeps its hash for revocation. */
export function createSessionToken(user: { id: string }): string {
  const token = `v1.${crypto.randomBytes(32).toString('base64url')}`;
  const now = Date.now();
  const sqlite = getRawSqlite();
  sqlite.prepare('DELETE FROM user_sessions WHERE expires_at <= ?').run(now);
  sqlite.prepare('INSERT INTO user_sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(tokenHash(token), user.id, now + SESSION_SECONDS * 1000, now);
  return token;
}

export function verifySessionToken(token: string): SessionUser | null {
  if (!/^v1\.[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const session = getRawSqlite().prepare(`
    SELECT u.id, u.name, u.email, s.expires_at
    FROM user_sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
  `).get(tokenHash(token)) as { id: string; name: string; email: string; expires_at: number } | undefined;
  if (!session || session.expires_at <= Date.now()) return null;
  if (session.id === 'usr_example' && !exampleAccountConfig().enabled) return null;
  return { id: session.id, name: session.name, email: session.email, isDemoMode: session.id === 'usr_example' };
}

export function revokeSessionToken(token: string | null): void {
  if (token && /^v1\.[A-Za-z0-9_-]{43}$/.test(token)) {
    getRawSqlite().prepare('DELETE FROM user_sessions WHERE token_hash = ?').run(tokenHash(token));
  }
}

export function readSessionCookie(req: Request | { headers?: Headers | Record<string, string | string[]> }): string | null {
  const cookie = header(req, 'cookie');
  const match = cookie?.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return null; }
}

export function getCurrentSessionUser(req: Request | { headers?: Headers | Record<string, string | string[]> }): SessionUser {
  const method = 'method' in req && typeof req.method === 'string' ? req.method.toUpperCase() : 'GET';
  const auth = header(req, 'authorization');
  const bearer = auth?.match(/^Bearer ([A-Za-z0-9._-]+)$/i)?.[1] ?? null;
  const token = bearer ?? readSessionCookie(req);
  if (!token) throw new UnauthorizedSessionError();
  if (!bearer && !['GET', 'HEAD', 'OPTIONS'].includes(method) && !validateCsrfOrigin(req)) {
    throw new UnauthorizedSessionError('Request origin is not allowed.');
  }
  const user = verifySessionToken(token);
  if (!user) throw new UnauthorizedSessionError();
  return user;
}

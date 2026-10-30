import { beforeEach, describe, expect, it } from 'vitest';
import { getRawSqlite } from '@/lib/db';
import {
  getCurrentSessionUser, revokeSessionToken, UnauthorizedSessionError,
  validateCsrfOrigin, verifySessionToken,
} from '@/lib/auth/session';
import { testSession } from '../helpers/auth';

describe('session isolation', () => {
  beforeEach(() => {
    getRawSqlite().exec('DELETE FROM user_sessions; DELETE FROM users;');
  });

  it('requires a real session in development and production', () => {
    const req = new Request('http://localhost:3000/api/events');
    expect(() => getCurrentSessionUser(req)).toThrow(UnauthorizedSessionError);
  });

  it('accepts a stored bearer session and rejects tampering', () => {
    const token = testSession({ id: 'usr_sarah', name: 'Sarah', email: 'sarah@example.com' });
    const req = new Request('http://localhost:3000/api/events', { headers: { authorization: `Bearer ${token}` } });
    expect(getCurrentSessionUser(req).id).toBe('usr_sarah');
    expect(verifySessionToken(token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A'))).toBeNull();
    expect(verifySessionToken('bad')).toBeNull();
  });

  it('revokes a session on logout', () => {
    const token = testSession({ id: 'usr_sarah', name: 'Sarah', email: 'sarah@example.com' });
    expect(verifySessionToken(token)).not.toBeNull();
    revokeSessionToken(token);
    expect(verifySessionToken(token)).toBeNull();
  });

  it('rejects expired sessions and sessions for deleted users', () => {
    const token = testSession({ id: 'usr_sarah', name: 'Sarah', email: 'sarah@example.com' });
    getRawSqlite().prepare('UPDATE user_sessions SET expires_at = 0').run();
    expect(verifySessionToken(token)).toBeNull();
    const fresh = testSession({ id: 'usr_sarah', name: 'Sarah', email: 'sarah@example.com' });
    getRawSqlite().prepare('DELETE FROM users WHERE id = ?').run('usr_sarah');
    expect(verifySessionToken(fresh)).toBeNull();
  });

  it('requires same-origin browser mutations', () => {
    const token = testSession({ id: 'usr_sarah', name: 'Sarah', email: 'sarah@example.com' });
    const headers = { host: 'localhost:3000', cookie: `gatherly_session=${token}` };
    expect(() => getCurrentSessionUser(new Request('http://localhost:3000/api/events', {
      method: 'POST', headers,
    }))).toThrow(UnauthorizedSessionError);
    expect(validateCsrfOrigin(new Request('http://localhost:3000/api/events', {
      method: 'POST', headers: { ...headers, origin: 'https://evil.example' },
    }))).toBe(false);
    expect(getCurrentSessionUser(new Request('http://localhost:3000/api/events', {
      method: 'POST', headers: { ...headers, origin: 'http://localhost:3000' },
    })).id).toBe('usr_sarah');
  });
});

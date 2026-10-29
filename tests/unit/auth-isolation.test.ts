import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createSignedSessionToken,
  verifySessionToken,
  getCurrentSessionUser,
  UnauthorizedSessionError,
  DEMO_USER,
} from '@/lib/auth/session';

describe('Authentication, Signed Tokens & Session Isolation (Unit)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('createSignedSessionToken & verifySessionToken', () => {
    it('creates and verifies a valid signed session token', () => {
      const user = {
        id: 'usr_sarah_123',
        name: 'Sarah Planner',
        email: 'sarah@example.com',
        isDemo: false,
      };

      const token = createSignedSessionToken(user, 3600);
      expect(typeof token).toBe('string');
      expect(token).toContain('.');

      const verified = verifySessionToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.id).toBe('usr_sarah_123');
      expect(verified?.name).toBe('Sarah Planner');
      expect(verified?.email).toBe('sarah@example.com');
      expect(verified?.isDemoMode).toBe(false);
    });

    it('rejects tampered tokens when signature does not match payload', () => {
      const user = {
        id: 'usr_normal',
        name: 'Normal User',
        email: 'normal@example.com',
      };

      const token = createSignedSessionToken(user, 3600);
      const [, sig] = token.split('.');

      // Attacker attempts to change userId to admin
      const tamperedPayload = Buffer.from(
        JSON.stringify({ userId: 'usr_admin', name: 'Admin', email: 'admin@example.com', exp: Math.floor(Date.now() / 1000) + 3600 })
      ).toString('base64url');

      const tamperedToken = `${tamperedPayload}.${sig}`;
      const result = verifySessionToken(tamperedToken);
      expect(result).toBeNull();
    });

    it('rejects expired session tokens', () => {
      const user = {
        id: 'usr_expired',
        name: 'Expired User',
        email: 'expired@example.com',
      };

      // Expired 10 seconds ago
      const token = createSignedSessionToken(user, -10);
      const result = verifySessionToken(token);
      expect(result).toBeNull();
    });

    it('rejects malformed tokens without period separator', () => {
      expect(verifySessionToken('completely_invalid_token')).toBeNull();
      expect(verifySessionToken('')).toBeNull();
    });
  });

  describe('getCurrentSessionUser', () => {
    it('extracts and verifies session user from Authorization Bearer header', () => {
      const token = createSignedSessionToken({
        id: 'usr_bearer_user',
        name: 'Bearer User',
        email: 'bearer@example.com',
      });

      const req = new Request('http://localhost:3000/api/events', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const user = getCurrentSessionUser(req);
      expect(user.id).toBe('usr_bearer_user');
      expect(user.isDemoMode).toBe(false);
    });

    it('extracts and verifies session user from gatherly_session cookie', () => {
      const token = createSignedSessionToken({
        id: 'usr_cookie_user',
        name: 'Cookie User',
        email: 'cookie@example.com',
      });

      const req = new Request('http://localhost:3000/api/events', {
        headers: {
          Cookie: `gatherly_session=${token}; other_cookie=123`,
        },
      });

      const user = getCurrentSessionUser(req);
      expect(user.id).toBe('usr_cookie_user');
      expect(user.isDemoMode).toBe(false);
    });

    it('falls back to DEMO_USER in development/test environment when unauthenticated', () => {
      const req = new Request('http://localhost:3000/api/events');
      const user = getCurrentSessionUser(req);
      expect(user.id).toBe(DEMO_USER.id);
      expect(user.isDemoMode).toBe(true);
    });

    it('throws UnauthorizedSessionError in production when demo auth is disabled', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        configurable: true,
      });
      process.env.ALLOW_DEMO_AUTH = 'false';

      const req = new Request('http://localhost:3000/api/events');
      expect(() => getCurrentSessionUser(req)).toThrow(UnauthorizedSessionError);
    });
  });
});

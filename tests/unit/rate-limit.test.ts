import crypto from 'crypto';
import { describe, expect, it, vi } from 'vitest';
import { allowRequest } from '@/lib/auth/rateLimit';

describe('SQLite request limiter', () => {
  it('caps a caller during a window and allows a new window', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-10-30T00:00:00Z'));
      const identity = crypto.randomUUID();
      expect(allowRequest('test', identity, 2, 1000)).toBe(true);
      expect(allowRequest('test', identity, 2, 1000)).toBe(true);
      expect(allowRequest('test', identity, 2, 1000)).toBe(false);
      vi.advanceTimersByTime(1001);
      expect(allowRequest('test', identity, 2, 1000)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

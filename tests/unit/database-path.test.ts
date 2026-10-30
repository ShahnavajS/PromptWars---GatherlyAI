import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDatabasePath } from '@/lib/db';

describe('production SQLite path', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('requires an explicit absolute persistent path', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('VERCEL', '');
    expect(() => getDatabasePath()).toThrow(/DATABASE_URL must be set/);
    vi.stubEnv('DATABASE_URL', './data/gatherly.db');
    expect(() => getDatabasePath()).toThrow(/absolute path/);
    vi.stubEnv('DATABASE_URL', path.join(os.tmpdir(), 'gatherly.db'));
    expect(() => getDatabasePath()).toThrow(/temporary storage/);
    vi.stubEnv('DATABASE_URL', path.join(process.cwd(), 'data', 'gatherly.db'));
    expect(getDatabasePath()).toBe(path.join(process.cwd(), 'data', 'gatherly.db'));
  });

  it('rejects Vercel even when an absolute local path is provided', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('DATABASE_URL', path.join(process.cwd(), 'data', 'gatherly.db'));
    expect(() => getDatabasePath()).toThrow(/not durable on Vercel/);
  });
});

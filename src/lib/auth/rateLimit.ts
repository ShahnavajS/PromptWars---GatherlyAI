import crypto from 'crypto';
import { getRawSqlite } from '@/lib/db';

let lastPrunedAt = 0;

/** Single-node SQLite limiter. Keys are hashed so identifiers are not kept in the table. */
export function allowRequest(scope: string, identity: string, limit: number, windowMs: number): boolean {
  const db = getRawSqlite();
  const key = crypto.createHash('sha256').update(`${scope}:${identity}`).digest('hex');
  const now = Date.now();
  return db.transaction(() => {
    if (now - lastPrunedAt > 15 * 60_000) {
      db.prepare('DELETE FROM request_limits WHERE reset_at <= ?').run(now);
      lastPrunedAt = now;
    }
    const row = db.prepare('SELECT count, reset_at FROM request_limits WHERE key = ?')
      .get(key) as { count: number; reset_at: number } | undefined;
    if (!row || row.reset_at <= now) {
      db.prepare('INSERT INTO request_limits (key, count, reset_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, reset_at = excluded.reset_at')
        .run(key, now + windowMs);
      return true;
    }
    if (row.count >= limit) return false;
    db.prepare('UPDATE request_limits SET count = count + 1 WHERE key = ?').run(key);
    return true;
  })();
}

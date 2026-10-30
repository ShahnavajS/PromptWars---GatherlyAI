import { getRawSqlite } from '@/lib/db';
import { createSessionToken } from '@/lib/auth/session';

export function testSession(user: { id: string; name: string; email: string }): string {
  getRawSqlite().prepare(
    'INSERT OR IGNORE INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(user.id, user.email, user.name, 'test-only', new Date().toISOString());
  return createSessionToken(user);
}

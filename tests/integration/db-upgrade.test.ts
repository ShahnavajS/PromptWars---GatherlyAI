import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { initializeTables } from '@/lib/db';

describe('SQLite initialization', () => {
  it('adds account and rate-limit tables while upgrading an older events table', () => {
    const sqlite = new Database(':memory:');
    try {
      sqlite.exec(`CREATE TABLE events (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
        event_type TEXT NOT NULL, start_date TEXT NOT NULL, created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`);
      initializeTables(sqlite);
      const columns = sqlite.pragma('table_info(events)') as Array<{ name: string }>;
      expect(columns.map((column) => column.name)).toContain('version');
      expect(columns.map((column) => column.name)).toContain('venue_capacity_max');
      expect(sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'").get()).toBeTruthy();
      expect(sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'request_limits'").get()).toBeTruthy();
    } finally {
      sqlite.close();
    }
  });
});

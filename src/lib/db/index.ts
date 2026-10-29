import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _sqlite: InstanceType<typeof Database> | null = null;

export function getDatabasePath(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  return path.join(process.cwd(), 'data', 'gatherly.db');
}

/**
 * Ensures tables exist in SQLite database.
 * Uses strict DDL matching schema definitions.
 */
export function initializeTables(sqlite: InstanceType<typeof Database>): void {
  sqlite.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'usr_demo',
      title TEXT NOT NULL,
      event_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PLANNING',
      start_date TEXT NOT NULL,
      end_date TEXT,
      timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      currency TEXT NOT NULL DEFAULT 'INR',
      target_guest_count INTEGER NOT NULL DEFAULT 100,
      venue_name TEXT,
      venue_city TEXT NOT NULL DEFAULT 'Ahmedabad',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
    CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);

    CREATE TABLE IF NOT EXISTS event_budgets (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL UNIQUE,
      total_budget_paise INTEGER NOT NULL,
      contingency_paise INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'INR',
      updated_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_budgets_event_id ON event_budgets(event_id);

    CREATE TABLE IF NOT EXISTS budget_categories (
      id TEXT PRIMARY KEY,
      budget_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      name TEXT NOT NULL,
      allocated_paise INTEGER NOT NULL DEFAULT 0,
      estimated_paise INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (budget_id) REFERENCES event_budgets(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_categories_event_id ON budget_categories(event_id);
    CREATE INDEX IF NOT EXISTS idx_categories_budget_id ON budget_categories(budget_id);

    CREATE TABLE IF NOT EXISTS event_tasks (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'GENERAL',
      status TEXT NOT NULL DEFAULT 'TODO',
      priority TEXT NOT NULL DEFAULT 'MEDIUM',
      due_date TEXT,
      assigned_to TEXT,
      is_ai_suggested INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_event_id ON event_tasks(event_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON event_tasks(status);
  `);
}

export function getDb() {
  if (_db) return _db;

  const dbPath = getDatabasePath();

  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  _sqlite = new Database(dbPath);
  _sqlite.pragma('foreign_keys = ON');

  initializeTables(_sqlite);

  _db = drizzle(_sqlite, { schema });
  return _db;
}

export function getRawSqlite(): InstanceType<typeof Database> {
  if (!_sqlite) {
    getDb();
  }
  return _sqlite!;
}

// Export default getter
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const instance = getDb();
    // @ts-expect-error dynamic access
    return instance[prop];
  },
});

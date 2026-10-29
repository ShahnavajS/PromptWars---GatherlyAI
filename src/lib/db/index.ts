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
      venue_capacity_max INTEGER,
      venue_name TEXT,
      venue_city TEXT NOT NULL DEFAULT 'Ahmedabad',
      version INTEGER NOT NULL DEFAULT 1,
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
      rate_provenance TEXT NOT NULL DEFAULT 'UNKNOWN_RATE',
      unit_rate_paise INTEGER,
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
      deadline_provenance TEXT NOT NULL DEFAULT 'UNKNOWN',
      assigned_to TEXT,
      is_ai_suggested INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_event_id ON event_tasks(event_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON event_tasks(status);

    CREATE TABLE IF NOT EXISTS ai_plan_suggestions (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      prompt_summary TEXT NOT NULL,
      raw_payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
      applied_metadata_json TEXT,
      model_used TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_ai_suggestions_event_id ON ai_plan_suggestions(event_id);
    CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status ON ai_plan_suggestions(status);

    CREATE TABLE IF NOT EXISTS event_activities (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      actor_id TEXT NOT NULL DEFAULT 'usr_demo',
      action_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      change_summary TEXT NOT NULL,
      previous_values_json TEXT,
      new_values_json TEXT,
      findings_summary_json TEXT,
      approved_actions_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_activities_event_id ON event_activities(event_id);
    CREATE INDEX IF NOT EXISTS idx_activities_created_at ON event_activities(created_at);

    CREATE TABLE IF NOT EXISTS event_preferences (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL UNIQUE,
      cultural_preset TEXT NOT NULL DEFAULT 'MODERN',
      dietary_preference TEXT NOT NULL DEFAULT 'MIXED',
      ceremony_options_json TEXT,
      accessibility_notes TEXT,
      decor_style TEXT,
      entertainment_style TEXT,
      custom_traditions_json TEXT,
      venue_capacity_max INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_preferences_event_id ON event_preferences(event_id);

    CREATE TABLE IF NOT EXISTS event_schedules (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      day_number INTEGER NOT NULL DEFAULT 1,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT,
      end_time TEXT,
      is_all_day INTEGER NOT NULL DEFAULT 0,
      location TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PLANNED',
      depends_on_schedule_id TEXT,
      is_ai_suggested INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_schedules_event_id ON event_schedules(event_id);
    CREATE INDEX IF NOT EXISTS idx_schedules_date ON event_schedules(date);

    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      contact_name TEXT,
      contact_phone TEXT,
      contact_email TEXT,
      website TEXT,
      city TEXT,
      notes TEXT,
      verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_vendors_event_id ON vendors(event_id);
    CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(category);

    CREATE TABLE IF NOT EXISTS vendor_requirements (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      specifications TEXT NOT NULL,
      target_budget_paise INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'OPEN',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_requirements_event_id ON vendor_requirements(event_id);

    CREATE TABLE IF NOT EXISTS vendor_quotes (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      vendor_id TEXT NOT NULL,
      requirement_id TEXT,
      category_id TEXT,
      quote_title TEXT NOT NULL,
      quoted_amount_paise INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      quote_date TEXT NOT NULL,
      valid_until_date TEXT,
      status TEXT NOT NULL DEFAULT 'RECEIVED',
      inclusions_json TEXT,
      exclusions_json TEXT,
      payment_terms_json TEXT,
      cancellation_policy TEXT,
      notes TEXT,
      source_document_name TEXT,
      is_extracted_by_ai INTEGER NOT NULL DEFAULT 0,
      confirmed_commitment INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
      FOREIGN KEY (requirement_id) REFERENCES vendor_requirements(id) ON DELETE SET NULL,
      FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_quotes_event_id ON vendor_quotes(event_id);
    CREATE INDEX IF NOT EXISTS idx_quotes_vendor_id ON vendor_quotes(vendor_id);
    CREATE INDEX IF NOT EXISTS idx_quotes_status ON vendor_quotes(status);
  `);

  // Safe schema migration for existing SQLite databases without recreating data
  try {
    const eventCols = sqlite.pragma('table_info(events)') as Array<{ name: string }>;
    if (eventCols.length > 0 && !eventCols.some((c) => c.name === 'version')) {
      sqlite.exec('ALTER TABLE events ADD COLUMN version INTEGER NOT NULL DEFAULT 1;');
    }
    if (eventCols.length > 0 && !eventCols.some((c) => c.name === 'venue_capacity_max')) {
      sqlite.exec('ALTER TABLE events ADD COLUMN venue_capacity_max INTEGER;');
    }

    const taskCols = sqlite.pragma('table_info(event_tasks)') as Array<{ name: string }>;
    if (taskCols.length > 0 && !taskCols.some((c) => c.name === 'deadline_provenance')) {
      sqlite.exec("ALTER TABLE event_tasks ADD COLUMN deadline_provenance TEXT NOT NULL DEFAULT 'UNKNOWN';");
    }

    const catCols = sqlite.pragma('table_info(budget_categories)') as Array<{ name: string }>;
    if (catCols.length > 0 && !catCols.some((c) => c.name === 'rate_provenance')) {
      sqlite.exec("ALTER TABLE budget_categories ADD COLUMN rate_provenance TEXT NOT NULL DEFAULT 'UNKNOWN_RATE';");
    }
    if (catCols.length > 0 && !catCols.some((c) => c.name === 'unit_rate_paise')) {
      sqlite.exec('ALTER TABLE budget_categories ADD COLUMN unit_rate_paise INTEGER;');
    }
  } catch {
    // If pragma fails or table does not exist yet, initializeTables handles it
  }
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

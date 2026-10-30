import Database from 'better-sqlite3';
import { existsSync, mkdtempSync, readFileSync, rmdirSync, unlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getTableColumns, getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import * as schema from '@/lib/db/schema';
import { initializeTables } from '@/lib/db';

const tables = [
  schema.users, schema.userSessions, schema.requestLimits, schema.events,
  schema.eventBudgets, schema.budgetCategories, schema.aiPlanSuggestions,
  schema.eventTasks, schema.eventActivities, schema.eventPreferences,
  schema.eventSchedules, schema.vendors, schema.vendorRequirements,
  schema.vendorQuotes,
];

describe('runtime SQLite schema', () => {
  it('creates every Drizzle column in a fresh database', () => {
    const sqlite = new Database(':memory:');
    try {
      initializeTables(sqlite);
      for (const table of tables) {
        const actual = (sqlite.pragma(`table_info(${getTableName(table)})`) as Array<{ name: string }>).map((column) => column.name);
        const expected = Object.values(getTableColumns(table)).map((column) => column.name);
        expect(actual.sort(), getTableName(table)).toEqual(expected.sort());
      }
      expect((sqlite.pragma('table_info(events)') as Array<{ name: string; dflt_value: string | null }>)
        .find((column) => column.name === 'user_id')?.dflt_value).toBeNull();
      expect(sqlite.pragma('foreign_key_check')).toEqual([]);
    } finally {
      sqlite.close();
    }
  });

  it('upgrades a historical database without losing an event and its budget', () => {
    const sqlite = new Database(':memory:');
    try {
      for (const file of ['0000_colorful_pyro.sql', '0001_simple_malice.sql', '0002_narrow_shotgun.sql', '0003_outgoing_praxagora.sql']) {
        sqlite.exec(readFileSync(path.join(process.cwd(), 'src/lib/db/migrations', file), 'utf8'));
      }
      sqlite.prepare(`INSERT INTO events (id, title, event_type, start_date, created_at, updated_at)
        VALUES ('evt_legacy', 'Legacy Wedding', 'WEDDING', '2026-12-01', '2026-01-01', '2026-01-01')`).run();
      sqlite.prepare(`INSERT INTO event_budgets (id, event_id, total_budget_paise, updated_at)
        VALUES ('bdg_legacy', 'evt_legacy', 1000000, '2026-01-01')`).run();
      sqlite.prepare(`INSERT INTO budget_categories (id, budget_id, event_id, name, allocated_paise, created_at, updated_at)
        VALUES ('cat_legacy', 'bdg_legacy', 'evt_legacy', 'Venue', 500000, '2026-01-01', '2026-01-01')`).run();

      initializeTables(sqlite);
      expect(sqlite.prepare('SELECT title, version FROM events WHERE id = ?').get('evt_legacy'))
        .toEqual({ title: 'Legacy Wedding', version: 1 });
      expect(sqlite.prepare('SELECT allocated_paise FROM budget_categories WHERE id = ?').get('cat_legacy'))
        .toEqual({ allocated_paise: 500000 });
      for (const table of tables) {
        const actual = (sqlite.pragma(`table_info(${getTableName(table)})`) as Array<{ name: string }>).map((column) => column.name);
        const expected = Object.values(getTableColumns(table)).map((column) => column.name);
        expect(actual.sort(), getTableName(table)).toEqual(expected.sort());
      }
      expect(sqlite.pragma('foreign_key_check')).toEqual([]);
    } finally {
      sqlite.close();
    }
  });

  it('restores two accounts and their private events from an online backup', async () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'gatherly-backup-test-'));
    const backupPath = path.join(directory, 'backup.db');
    const source = new Database(':memory:');
    let restored: InstanceType<typeof Database> | undefined;
    try {
      initializeTables(source);
      for (const owner of ['usr_one', 'usr_two']) {
        source.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
          .run(owner, `${owner}@example.test`, owner, 'test-hash', '2026-01-01');
        source.prepare(`INSERT INTO events (id, user_id, title, event_type, start_date, created_at, updated_at)
          VALUES (?, ?, ?, 'WEDDING', '2027-01-01', '2026-01-01', '2026-01-01')`)
          .run(`evt_${owner}`, owner, `Plan for ${owner}`);
      }
      await source.backup(backupPath);
      restored = new Database(backupPath);
      initializeTables(restored);
      expect(restored.prepare('SELECT id, user_id FROM events ORDER BY id').all()).toEqual([
        { id: 'evt_usr_one', user_id: 'usr_one' },
        { id: 'evt_usr_two', user_id: 'usr_two' },
      ]);
      expect(restored.prepare('SELECT COUNT(*) AS count FROM users').get()).toEqual({ count: 2 });
      expect(restored.pragma('foreign_key_check')).toEqual([]);
    } finally {
      restored?.close();
      source.close();
      if (existsSync(backupPath)) unlinkSync(backupPath);
      rmdirSync(directory);
    }
  });
});

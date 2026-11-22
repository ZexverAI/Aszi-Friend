import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function openDatabase(filePath) {
  const absolutePath = resolve(filePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  const db = new Database(absolutePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS panels (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      config_json TEXT NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      panel_id TEXT NOT NULL REFERENCES panels(id),
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL UNIQUE,
      opener_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      priority INTEGER NOT NULL DEFAULT 3,
      status TEXT NOT NULL DEFAULT 'open',
      claimed_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      closed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS tickets_opener_status ON tickets(opener_id, status);
    CREATE INDEX IF NOT EXISTS tickets_guild_status ON tickets(guild_id, status);
  `);
  const ticketColumns = db.prepare('PRAGMA table_info(tickets)').all().map((column) => column.name);\n  if (!ticketColumns.includes('submission_json')) db.exec(\"ALTER TABLE tickets ADD COLUMN submission_json TEXT NOT NULL DEFAULT '{}'\");\n  return db;
}

import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema/index.js';

export type AppDatabase = BetterSQLite3Database<typeof schema>;

export type CreateDbOptions = {
  /** SQLite path, `:memory:`, or omitted for default app data path. */
  path?: string;
};

export function defaultDbPath(): string {
  return process.env.CLAUDE_ASSISTANT_DB_PATH ?? './data/claude-assistant.db';
}

export function createDb(options: CreateDbOptions = {}): {
  db: AppDatabase;
  sqlite: Database.Database;
  close: () => void;
} {
  const path = options.path ?? defaultDbPath();
  const sqlite = new Database(path);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  return {
    db,
    sqlite,
    close: () => sqlite.close(),
  };
}

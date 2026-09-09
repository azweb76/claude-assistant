import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDb, type AppDatabase } from './client.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export function migrationsFolder(): string {
  return path.resolve(here, '../../drizzle');
}

export function migrateDb(db: AppDatabase): void {
  migrate(db, { migrationsFolder: migrationsFolder() });
}

export function runMigrate(dbPath?: string): void {
  const { db, close } = createDb({ path: dbPath });
  try {
    migrateDb(db);
  } finally {
    close();
  }
}

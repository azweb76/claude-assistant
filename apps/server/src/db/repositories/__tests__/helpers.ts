import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach } from 'vitest';
import { createDb, type AppDatabase } from '../../client.js';
import { migrateDb } from '../../migrate.js';

export type TestDb = {
  db: AppDatabase;
  close: () => void;
  path: string;
};

export function openMigratedTestDb(): TestDb {
  const dir = mkdtempSync(path.join(tmpdir(), 'claude-assistant-db-'));
  const dbPath = path.join(dir, 'test.db');
  const { db, close } = createDb({ path: dbPath });
  migrateDb(db);
  return { db, close, path: dbPath };
}

export function useMigratedTestDb(): () => TestDb {
  let current: TestDb | undefined;
  afterEach(() => {
    current?.close();
    current = undefined;
  });
  return () => {
    current?.close();
    current = openMigratedTestDb();
    return current;
  };
}

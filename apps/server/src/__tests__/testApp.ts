import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach } from 'vitest';
import { buildApp } from '../app.js';
import { createDb } from '../db/client.js';
import { migrateDb } from '../db/migrate.js';
import { createSystemClock, type Dependencies } from '../lib/deps.js';
import type { FastifyInstance } from 'fastify';

export type TestApp = {
  app: FastifyInstance;
  deps: Dependencies;
  close: () => Promise<void>;
};

export async function createTestApp(overrides: Partial<Dependencies> = {}): Promise<TestApp> {
  const dir = mkdtempSync(path.join(tmpdir(), 'claude-assistant-app-'));
  const dbPath = path.join(dir, 'test.db');
  const { db, sqlite, close: closeDb } = createDb({ path: dbPath });
  migrateDb(db);
  const deps: Dependencies = {
    db,
    closeDb,
    clock: createSystemClock(),
    pingDb: () => {
      try {
        sqlite.prepare('select 1').get();
        return true;
      } catch {
        return false;
      }
    },
    ...overrides,
  };
  const app = await buildApp({ deps });
  return {
    app,
    deps,
    close: async () => {
      await app.close();
      closeDb();
    },
  };
}

export function useTestApp(): () => Promise<TestApp> {
  let current: TestApp | undefined;
  afterEach(async () => {
    await current?.close();
    current = undefined;
  });
  return async () => {
    await current?.close();
    current = await createTestApp();
    return current;
  };
}

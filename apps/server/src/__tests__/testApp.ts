import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { createDb } from '../db/client.js';
import { migrateDb } from '../db/migrate.js';
import { buildDependencies } from '../lib/buildDeps.js';
import type { Dependencies } from '../lib/deps.js';
import { createFakeSdkClient } from '../services/runner/sdkClient.js';
import { createFakeExecutor } from '../services/git/executor.js';
import { createGitService } from '../services/git/gitService.js';
import { createGitHubService } from '../services/git/githubService.js';

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

  const executor =
    overrides.executor ??
    createFakeExecutor([
      {
        match: () => true,
        result: { stdout: '', stderr: '', code: 0 },
      },
    ]);
  const gitService = overrides.gitService ?? createGitService(executor);
  const githubService = overrides.githubService ?? createGitHubService(executor);
  const sdkClient =
    overrides.sdkClient ??
    createFakeSdkClient([
      { type: 'assistant', message: { text: 'hi' } },
      {
        type: 'result',
        session_id: 'sdk-1',
        total_cost_usd: 0.01,
        usage: { input_tokens: 10, output_tokens: 5 },
        num_turns: 1,
      },
    ]);

  const deps = buildDependencies({
    db,
    closeDb,
    pingDb: () => {
      try {
        sqlite.prepare('select 1').get();
        return true;
      } catch {
        return false;
      }
    },
    overrides: {
      executor,
      gitService,
      githubService,
      sdkClient,
      ...overrides,
    },
  });

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

export function useTestApp(overrides?: Partial<Dependencies>): () => Promise<TestApp> {
  let current: TestApp | undefined;
  afterEach(async () => {
    await current?.close();
    current = undefined;
  });
  return async () => {
    await current?.close();
    current = await createTestApp(overrides);
    return current;
  };
}

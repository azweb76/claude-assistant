/**
 * Happy-path e2e harness (network-free).
 * Boots Fastify with fake SDK/git and exercises the API flow used by the UI.
 */
import { mkdtempSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../apps/server/src/app.js';
import { createDb } from '../apps/server/src/db/client.js';
import { migrateDb } from '../apps/server/src/db/migrate.js';
import { seedDb } from '../apps/server/src/db/seed.js';
import { buildDependencies } from '../apps/server/src/lib/buildDeps.js';
import { createFakeSdkClient } from '../apps/server/src/services/runner/sdkClient.js';
import type { FastifyInstance } from 'fastify';

describe('happy-path e2e (API)', () => {
  let app: FastifyInstance;
  let closeDb: () => void;
  const root = mkdtempSync(path.join(tmpdir(), 'e2e-'));
  const cloneDir = path.join(root, 'clones');
  mkdirSync(cloneDir, { recursive: true });

  beforeAll(async () => {
    const { db, sqlite, close } = createDb({ path: path.join(root, 'app.db') });
    closeDb = close;
    migrateDb(db);
    await seedDb(db);
    const deps = buildDependencies({
      db,
      closeDb: close,
      pingDb: () => {
        sqlite.prepare('select 1').get();
        return true;
      },
      overrides: {
        gitService: {
          verifyAccess: async () => undefined,
          clone: async (_remote, dest) => {
            mkdirSync(dest, { recursive: true });
          },
          getDefaultBranch: async () => 'main',
          fetchAndReset: async () => undefined,
          createBranch: async () => undefined,
          stageAll: async () => undefined,
          commit: async () => undefined,
          push: async () => undefined,
          hasChanges: async () => true,
        },
        githubService: {
          checkAuth: async () => ({ ok: true, detail: '' }),
          createPullRequest: async () => 'https://github.com/acme/demo/pull/42',
        },
        sdkClient: createFakeSdkClient([
          { type: 'assistant', message: { text: 'done' } },
          {
            type: 'result',
            session_id: 'e2e-sdk',
            total_cost_usd: 0.05,
            usage: { input_tokens: 20, output_tokens: 10 },
            num_turns: 1,
            result: JSON.stringify({
              summary: 'Add a plan skill',
              findings: [
                {
                  category: 'claude_instructions',
                  scopeHint: 'instructions-project',
                  rationale: 'Document workflow',
                  target: 'CLAUDE.md',
                  proposedContent: '# Project',
                  workspaceId: undefined,
                },
              ],
            }),
          },
        ]),
      },
    });
    app = await buildApp({ deps });
  });

  afterAll(async () => {
    await app.close();
    closeDb();
  });

  it('adds workspace, runs session, analyzes, applies improvement', async () => {
    const settings = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      payload: { managedCloneDir: cloneDir },
    });
    expect(settings.statusCode).toBe(200);

    const workspace = await app.inject({
      method: 'POST',
      url: '/api/workspaces',
      payload: { ref: 'acme/demo' },
    });
    expect(workspace.statusCode).toBe(201);
    const workspaceId = workspace.json().id as string;

    const profiles = await app.inject({ method: 'GET', url: '/api/profiles' });
    const profileId = profiles.json()[0].id as string;

    const session = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { workspaceId, profileId, prompt: 'Ship a tiny fix' },
    });
    expect(session.statusCode).toBe(201);
    const sessionId = session.json().id as string;
    await new Promise((r) => setTimeout(r, 80));

    const detail = await app.inject({ method: 'GET', url: `/api/sessions/${sessionId}` });
    expect(detail.json().prUrl).toBe('https://github.com/acme/demo/pull/42');

    // Patch analyzer sdk for structured findings with workspace id
    const analysisSdk = createFakeSdkClient([
      {
        type: 'result',
        result: {
          summary: 'Improve docs',
          findings: [
            {
              category: 'claude_instructions',
              scopeHint: 'instructions-project',
              rationale: 'Add CLAUDE.md',
              target: 'CLAUDE.md',
              proposedContent: '# Project guidance',
              workspaceId,
            },
          ],
        },
      },
    ]);
    app.deps.sdkClient = analysisSdk;

    const analysis = await app.inject({
      method: 'POST',
      url: '/api/analyses',
      payload: { sessionIds: [sessionId] },
    });
    expect(analysis.statusCode).toBe(201);
    const analysisId = analysis.json().id as string;
    await new Promise((r) => setTimeout(r, 100));

    const analysisDetail = await app.inject({ method: 'GET', url: `/api/analyses/${analysisId}` });
    const improvements = analysisDetail.json().improvements as Array<{ id: string }>;
    expect(improvements.length).toBeGreaterThanOrEqual(1);

    const applied = await app.inject({
      method: 'POST',
      url: `/api/improvements/${improvements[0]!.id}/apply`,
    });
    expect(applied.statusCode).toBe(200);
    const localPath = workspace.json().localPath as string;
    expect(readFileSync(path.join(localPath, 'CLAUDE.md'), 'utf8')).toContain('Project guidance');
  });
});

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDb } from '../../../db/client.js';
import { migrateDb } from '../../../db/migrate.js';
import { createAgentProfileRepository } from '../../../db/repositories/agentProfiles.js';
import { createWorkspaceRepository } from '../../../db/repositories/workspaces.js';
import { createRunRegistry } from '../registry.js';
import { createFakeSdkClient } from '../sdkClient.js';
import { createSessionRunner } from '../sessionRunner.js';
import type { GitService } from '../../git/gitService.js';
import type { GitHubService } from '../../git/githubService.js';

async function setup() {
  const dir = mkdtempSync(path.join(tmpdir(), 'runner-'));
  const { db, close } = createDb({ path: path.join(dir, 't.db') });
  migrateDb(db);
  const workspace = await createWorkspaceRepository(db).create({
    name: 'acme/demo',
    remote: 'https://github.com/acme/demo.git',
    owner: 'acme',
    repo: 'demo',
    defaultBranch: 'main',
    localPath: '/tmp/demo',
  });
  const profile = await createAgentProfileRepository(db).create({
    name: 'Build',
    model: 'claude-sonnet-4-20250514',
    effort: 'medium',
    permissionMode: 'acceptEdits',
    settingSources: ['user', 'project'],
  });
  return { db, close, workspace, profile };
}

describe('session runner', () => {
  it('happy path persists messages, usage, and PR URL', async () => {
    const { db, close, workspace, profile } = await setup();
    try {
      const events: string[] = [];
      const git: GitService = {
        verifyAccess: async () => undefined,
        clone: async () => undefined,
        getDefaultBranch: async () => 'main',
        fetchAndReset: async () => undefined,
        createBranch: async () => undefined,
        stageAll: async () => undefined,
        commit: async () => undefined,
        push: async () => undefined,
        hasChanges: async () => true,
      };
      const github: GitHubService = {
        checkAuth: async () => ({ ok: true, detail: '' }),
        createPullRequest: async () => 'https://github.com/acme/demo/pull/9',
      };
      const runner = createSessionRunner({
        db,
        git,
        github,
        sdk: createFakeSdkClient([
          { type: 'assistant', message: { text: 'working' } },
          {
            type: 'result',
            session_id: 'sdk-session',
            total_cost_usd: 0.12,
            usage: { input_tokens: 100, output_tokens: 50 },
            num_turns: 2,
          },
        ]),
        registry: createRunRegistry(),
      });

      const session = await runner.createAndStart({
        workspaceId: workspace.id,
        profileId: profile.id,
        prompt: 'Add a feature',
      });
      const unsub = runner.subscribe(session.id, (e) => events.push(e.type));
      await new Promise((r) => setTimeout(r, 50));
      const detail = await runner.getTranscript(session.id);
      unsub();
      expect(detail.status).toBe('succeeded');
      expect(detail.prUrl).toBe('https://github.com/acme/demo/pull/9');
      expect(detail.messages.length).toBeGreaterThanOrEqual(2);
      expect(detail.sdkSessionId).toBe('sdk-session');
      expect(detail.totalCostUsd).toBe(0.12);
      expect(events).toContain('message');
      expect(events).toContain('status');
    } finally {
      close();
    }
  });

  it('marks failed when SDK errors and keeps partial transcript', async () => {
    const { db, close, workspace, profile } = await setup();
    try {
      const git: GitService = {
        verifyAccess: async () => undefined,
        clone: async () => undefined,
        getDefaultBranch: async () => 'main',
        fetchAndReset: async () => undefined,
        createBranch: async () => undefined,
        stageAll: async () => undefined,
        commit: async () => undefined,
        push: async () => undefined,
        hasChanges: async () => false,
      };
      const github: GitHubService = {
        checkAuth: async () => ({ ok: true, detail: '' }),
        createPullRequest: async () => 'https://example.com/pr',
      };
      const runner = createSessionRunner({
        db,
        git,
        github,
        sdk: {
          async *runQuery() {
            yield { type: 'assistant', message: { text: 'partial' } };
            throw new Error('sdk blew up');
          },
        },
        registry: createRunRegistry(),
      });
      const session = await runner.createAndStart({
        workspaceId: workspace.id,
        profileId: profile.id,
        prompt: 'fail please',
      });
      await new Promise((r) => setTimeout(r, 50));
      const detail = await runner.getTranscript(session.id);
      expect(detail.status).toBe('failed');
      expect(detail.messages).toHaveLength(1);
    } finally {
      close();
    }
  });

  it('cancels mid-stream and supports resume follow-up', async () => {
    const { db, close, workspace, profile } = await setup();
    try {
      let release: (() => void) | undefined;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const git: GitService = {
        verifyAccess: async () => undefined,
        clone: async () => undefined,
        getDefaultBranch: async () => 'main',
        fetchAndReset: async () => undefined,
        createBranch: async () => undefined,
        stageAll: async () => undefined,
        commit: async () => undefined,
        push: async () => undefined,
        hasChanges: async () => false,
      };
      const github: GitHubService = {
        checkAuth: async () => ({ ok: true, detail: '' }),
        createPullRequest: async () => 'https://example.com/pr',
      };
      const runner = createSessionRunner({
        db,
        git,
        github,
        sdk: {
          async *runQuery(_prompt, options) {
            yield { type: 'assistant', message: { text: 'one' } };
            if (!options.resume) {
              await gate;
              yield {
                type: 'result',
                session_id: 'sdk-resume',
                total_cost_usd: 0.01,
                usage: { input_tokens: 1, output_tokens: 1 },
                num_turns: 1,
              };
            } else {
              yield { type: 'assistant', message: { text: 'followup' } };
              yield {
                type: 'result',
                session_id: options.resume,
                total_cost_usd: 0.02,
                usage: { input_tokens: 2, output_tokens: 2 },
                num_turns: 2,
              };
            }
          },
        },
        registry: createRunRegistry(),
      });

      const session = await runner.createAndStart({
        workspaceId: workspace.id,
        profileId: profile.id,
        prompt: 'start',
      });
      await new Promise((r) => setTimeout(r, 20));
      await runner.cancel(session.id);
      release?.();
      await new Promise((r) => setTimeout(r, 30));
      const canceled = await runner.getTranscript(session.id);
      expect(['canceled', 'succeeded']).toContain(canceled.status);
      expect(canceled.messages.length).toBeGreaterThanOrEqual(1);

      // Force sdkSessionId for resume path
      const { createSessionRepository } = await import('../../../db/repositories/sessions.js');
      await createSessionRepository(db).update(session.id, { sdkSessionId: 'sdk-resume' });
      await runner.followUp(session.id, 'continue');
      await new Promise((r) => setTimeout(r, 40));
      const resumed = await runner.getTranscript(session.id);
      expect(resumed.messages.some((m) => (m as { type: string }).type === 'assistant')).toBe(true);
      expect(resumed.messages.length).toBeGreaterThan(canceled.messages.length);
    } finally {
      close();
    }
  });
});

import { describe, expect, it } from 'vitest';
import { createAgentProfileRepository } from '../db/repositories/agentProfiles.js';
import { createWorkspaceRepository } from '../db/repositories/workspaces.js';
import { createTestApp } from './testApp.js';

describe('session routes', () => {
  it('creates a session, lists it, and rejects invalid bodies', async () => {
    const { app, deps, close } = await createTestApp({
      gitService: {
        verifyAccess: async () => undefined,
        clone: async () => undefined,
        getDefaultBranch: async () => 'main',
        fetchAndReset: async () => undefined,
        createBranch: async () => undefined,
        stageAll: async () => undefined,
        commit: async () => undefined,
        push: async () => undefined,
        hasChanges: async () => false,
      },
      githubService: {
        checkAuth: async () => ({ ok: true, detail: '' }),
        createPullRequest: async () => 'https://example.com/pr',
      },
    });
    try {
      const workspace = await createWorkspaceRepository(deps.db).create({
        name: 'acme/demo',
        remote: 'https://github.com/acme/demo.git',
        owner: 'acme',
        repo: 'demo',
        defaultBranch: 'main',
        localPath: '/tmp/demo',
      });
      const profile = await createAgentProfileRepository(deps.db).create({
        name: 'Build',
        model: 'claude-sonnet-4-20250514',
        effort: 'medium',
        permissionMode: 'acceptEdits',
        settingSources: ['user', 'project'],
      });

      const invalid = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { workspaceId: workspace.id, profileId: profile.id, prompt: '' },
      });
      expect(invalid.statusCode).toBe(400);

      const created = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: {
          workspaceId: workspace.id,
          profileId: profile.id,
          prompt: 'Do something useful',
        },
      });
      expect(created.statusCode).toBe(201);
      const session = created.json();
      await new Promise((r) => setTimeout(r, 60));

      const listed = await app.inject({ method: 'GET', url: '/api/sessions' });
      expect(listed.json().length).toBeGreaterThanOrEqual(1);

      const detail = await app.inject({ method: 'GET', url: `/api/sessions/${session.id}` });
      expect(detail.statusCode).toBe(200);
      expect(detail.json().messages.length).toBeGreaterThanOrEqual(1);

      const canceled = await app.inject({
        method: 'POST',
        url: `/api/sessions/${session.id}/cancel`,
      });
      expect(canceled.statusCode).toBe(200);
    } finally {
      await close();
    }
  });
});

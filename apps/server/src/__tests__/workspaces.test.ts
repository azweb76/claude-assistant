import { describe, expect, it } from 'vitest';
import { ExternalCommandError } from '../lib/errors.js';
import { createTestApp } from './testApp.js';

describe('workspace routes', () => {
  it('covers add/list/get/delete and add failure', async () => {
    const { app, deps, close } = await createTestApp({
      workspaceService: {
        async addWorkspace(ref) {
          if (ref === 'bad/repo') {
            throw new ExternalCommandError('no access');
          }
          return {
            id: '00000000-0000-4000-8000-000000000010',
            name: 'acme/demo',
            remote: 'https://github.com/acme/demo.git',
            owner: 'acme',
            repo: 'demo',
            defaultBranch: 'main',
            localPath: '/tmp/demo',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        },
        async listWorkspaces() {
          return [];
        },
        async getWorkspace(id) {
          return {
            id,
            name: 'acme/demo',
            remote: 'https://github.com/acme/demo.git',
            owner: 'acme',
            repo: 'demo',
            defaultBranch: 'main',
            localPath: '/tmp/demo',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        },
        async removeWorkspace() {
          return;
        },
      },
    });
    try {
      const created = await app.inject({
        method: 'POST',
        url: '/api/workspaces',
        payload: { ref: 'acme/demo' },
      });
      expect(created.statusCode).toBe(201);

      const failed = await app.inject({
        method: 'POST',
        url: '/api/workspaces',
        payload: { ref: 'bad/repo' },
      });
      expect(failed.statusCode).toBe(502);

      const listed = await app.inject({ method: 'GET', url: '/api/workspaces' });
      expect(listed.statusCode).toBe(200);

      const got = await app.inject({
        method: 'GET',
        url: '/api/workspaces/00000000-0000-4000-8000-000000000010',
      });
      expect(got.statusCode).toBe(200);

      const deleted = await app.inject({
        method: 'DELETE',
        url: '/api/workspaces/00000000-0000-4000-8000-000000000010',
      });
      expect(deleted.statusCode).toBe(204);
      expect(deps.workspaceService).toBeTruthy();
    } finally {
      await close();
    }
  });
});

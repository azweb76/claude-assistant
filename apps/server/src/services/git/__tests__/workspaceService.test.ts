import { describe, expect, it } from 'vitest';
import { createDb } from '../../../db/client.js';
import { migrateDb } from '../../../db/migrate.js';
import { ExternalCommandError } from '../../../lib/errors.js';
import { createWorkspaceService, parseRepoRef } from '../../workspaces/workspaceService.js';
import type { GitService } from '../gitService.js';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

function tempDb() {
  const dir = mkdtempSync(path.join(tmpdir(), 'ws-svc-'));
  const { db, close } = createDb({ path: path.join(dir, 't.db') });
  migrateDb(db);
  return { db, close };
}

describe('workspace service', () => {
  it('parses repo refs', () => {
    expect(parseRepoRef('acme/demo')).toEqual({
      owner: 'acme',
      repo: 'demo',
      remote: 'https://github.com/acme/demo.git',
    });
  });

  it('creates a workspace on success and none on clone failure', async () => {
    const { db, close } = tempDb();
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
      const svc = createWorkspaceService(db, git);
      const created = await svc.addWorkspace('acme/demo');
      expect(created.owner).toBe('acme');
      expect(await svc.listWorkspaces()).toHaveLength(1);

      const failing: GitService = {
        ...git,
        verifyAccess: async () => {
          throw new ExternalCommandError('no access');
        },
      };
      const svc2 = createWorkspaceService(db, failing);
      await expect(svc2.addWorkspace('acme/other')).rejects.toBeInstanceOf(ExternalCommandError);
      expect(await svc2.listWorkspaces()).toHaveLength(1);

      await svc.removeWorkspace(created.id, { deleteClone: false });
      expect(await svc.listWorkspaces()).toHaveLength(0);
    } finally {
      close();
    }
  });
});

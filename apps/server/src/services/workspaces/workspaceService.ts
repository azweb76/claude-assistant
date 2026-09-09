import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import type { Workspace } from '@claude-assistant/shared';
import { createAppSettingsRepository } from '../../db/repositories/appSettings.js';
import { createWorkspaceRepository } from '../../db/repositories/workspaces.js';
import type { AppDatabase } from '../../db/client.js';
import { ConflictError, ExternalCommandError, NotFoundError } from '../../lib/errors.js';
import type { GitService } from '../git/gitService.js';

export type ParsedRepoRef = {
  owner: string;
  repo: string;
  remote: string;
};

export function parseRepoRef(ref: string): ParsedRepoRef {
  const trimmed = ref.trim().replace(/\.git$/, '');
  const ssh = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+)$/);
  if (ssh) {
    return {
      owner: ssh[1]!,
      repo: ssh[2]!,
      remote: `https://github.com/${ssh[1]}/${ssh[2]}.git`,
    };
  }
  const https = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)$/);
  if (https) {
    return {
      owner: https[1]!,
      repo: https[2]!,
      remote: `https://github.com/${https[1]}/${https[2]}.git`,
    };
  }
  const short = trimmed.match(/^([^/]+)\/([^/]+)$/);
  if (short) {
    return {
      owner: short[1]!,
      repo: short[2]!,
      remote: `https://github.com/${short[1]}/${short[2]}.git`,
    };
  }
  throw new ExternalCommandError(`Unrecognized repository reference: ${ref}`, { ref });
}

function expandHome(p: string): string {
  if (p.startsWith('~/')) {
    return path.join(homedir(), p.slice(2));
  }
  return p;
}

export type WorkspaceService = {
  addWorkspace: (ref: string) => Promise<Workspace>;
  listWorkspaces: () => Promise<Workspace[]>;
  getWorkspace: (id: string) => Promise<Workspace>;
  removeWorkspace: (id: string, options?: { deleteClone?: boolean }) => Promise<void>;
};

export function createWorkspaceService(db: AppDatabase, git: GitService): WorkspaceService {
  const workspaces = createWorkspaceRepository(db);
  const settings = createAppSettingsRepository(db);

  return {
    async addWorkspace(ref) {
      const parsed = parseRepoRef(ref);
      const existing = (await workspaces.list()).find((w) => w.remote === parsed.remote);
      if (existing) {
        throw new ConflictError('Workspace already exists for this remote', {
          id: existing.id,
          remote: existing.remote,
        });
      }

      await git.verifyAccess(parsed.remote);

      const managedDir = expandHome(await settings.get('managedCloneDir'));
      mkdirSync(managedDir, { recursive: true });
      const localPath = path.join(managedDir, `${parsed.owner}-${parsed.repo}`);

      try {
        await git.clone(parsed.remote, localPath);
        const defaultBranch = await git.getDefaultBranch(localPath);
        return await workspaces.create({
          name: `${parsed.owner}/${parsed.repo}`,
          remote: parsed.remote,
          owner: parsed.owner,
          repo: parsed.repo,
          defaultBranch,
          localPath,
        });
      } catch (err) {
        try {
          rmSync(localPath, { recursive: true, force: true });
        } catch {
          // ignore cleanup errors
        }
        throw err;
      }
    },

    async listWorkspaces() {
      return workspaces.list();
    },

    async getWorkspace(id) {
      const row = await workspaces.getById(id);
      if (!row) {
        throw new NotFoundError(`Workspace ${id} not found`);
      }
      return row;
    },

    async removeWorkspace(id, options = {}) {
      const row = await this.getWorkspace(id);
      await workspaces.delete(id);
      if (options.deleteClone !== false) {
        try {
          rmSync(row.localPath, { recursive: true, force: true });
        } catch {
          // ignore missing dirs
        }
      }
    },
  };
}

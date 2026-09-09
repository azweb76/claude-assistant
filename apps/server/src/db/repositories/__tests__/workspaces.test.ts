import { describe, expect, it } from 'vitest';
import { workspaceCreateSchema } from '@claude-assistant/shared';
import { createWorkspaceRepository } from '../workspaces.js';
import { useMigratedTestDb } from './helpers.js';

describe('workspace repository', () => {
  const getDb = useMigratedTestDb();

  it('creates, gets, lists, and deletes workspaces', async () => {
    const { db } = getDb();
    const repo = createWorkspaceRepository(db);
    const created = await repo.create({
      name: 'Demo',
      remote: 'https://github.com/acme/demo.git',
      owner: 'acme',
      repo: 'demo',
      defaultBranch: 'main',
      localPath: '/tmp/demo',
    });
    expect(created.id).toBeTruthy();
    expect(await repo.getById(created.id)).toMatchObject({ name: 'Demo', owner: 'acme' });
    expect(await repo.list()).toHaveLength(1);
    expect(await repo.delete(created.id)).toBe(true);
    expect(await repo.list()).toHaveLength(0);
  });

  it('rejects duplicate remotes', async () => {
    const { db } = getDb();
    const repo = createWorkspaceRepository(db);
    const input = {
      name: 'Demo',
      remote: 'https://github.com/acme/dup.git',
      owner: 'acme',
      repo: 'dup',
      defaultBranch: 'main',
      localPath: '/tmp/dup',
    };
    await repo.create(input);
    await expect(
      repo.create({ ...input, name: 'Other', localPath: '/tmp/dup2' }),
    ).rejects.toThrow();
  });

  it('rejects invalid input via zod', () => {
    expect(() => workspaceCreateSchema.parse({ name: '' })).toThrow();
  });
});

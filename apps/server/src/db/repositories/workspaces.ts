import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import {
  workspaceCreateSchema,
  type Workspace,
  type WorkspaceCreate,
} from '@claude-assistant/shared';
import type { AppDatabase } from '../client.js';
import { workspaces } from '../schema/workspaces.js';

function nowIso(): string {
  return new Date().toISOString();
}

function toWorkspace(row: typeof workspaces.$inferSelect): Workspace {
  return {
    id: row.id,
    name: row.name,
    remote: row.remote,
    owner: row.owner,
    repo: row.repo,
    defaultBranch: row.defaultBranch,
    localPath: row.localPath,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createWorkspaceRepository(db: AppDatabase) {
  return {
    async create(input: WorkspaceCreate): Promise<Workspace> {
      const data = workspaceCreateSchema.parse(input);
      const id = randomUUID();
      const timestamp = nowIso();
      await db.insert(workspaces).values({
        id,
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      const created = await this.getById(id);
      if (!created) {
        throw new Error('Failed to create workspace');
      }
      return created;
    },

    async getById(id: string): Promise<Workspace | null> {
      const rows = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
      const row = rows[0];
      return row ? toWorkspace(row) : null;
    },

    async list(): Promise<Workspace[]> {
      const rows = await db.select().from(workspaces);
      return rows.map(toWorkspace);
    },

    async delete(id: string): Promise<boolean> {
      const result = await db.delete(workspaces).where(eq(workspaces.id, id));
      return (result.changes ?? 0) > 0;
    },
  };
}

export type WorkspaceRepository = ReturnType<typeof createWorkspaceRepository>;

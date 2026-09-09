import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import {
  sessionCreateSchema,
  sessionStatusSchema,
  type Session,
  type SessionCreate,
  type SessionStatus,
} from '@claude-assistant/shared';
import type { AppDatabase } from '../client.js';
import { sessions } from '../schema/sessions.js';

function nowIso(): string {
  return new Date().toISOString();
}

function toSession(row: typeof sessions.$inferSelect): Session {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    profileId: row.profileId,
    profileSnapshot: row.profileSnapshot,
    prompt: row.prompt,
    status: row.status as SessionStatus,
    sdkSessionId: row.sdkSessionId,
    branchName: row.branchName,
    prUrl: row.prUrl,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    totalCostUsd: row.totalCostUsd,
    numTurns: row.numTurns,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    createdAt: row.createdAt,
  };
}

export function createSessionRepository(db: AppDatabase) {
  return {
    async create(input: SessionCreate): Promise<Session> {
      const data = sessionCreateSchema.parse(input);
      const id = randomUUID();
      const timestamp = nowIso();
      await db.insert(sessions).values({
        id,
        workspaceId: data.workspaceId,
        profileId: data.profileId,
        profileSnapshot: data.profileSnapshot,
        prompt: data.prompt,
        status: data.status ?? 'pending',
        createdAt: timestamp,
      });
      const created = await this.getById(id);
      if (!created) {
        throw new Error('Failed to create session');
      }
      return created;
    },

    async getById(id: string): Promise<Session | null> {
      const rows = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
      const row = rows[0];
      return row ? toSession(row) : null;
    },

    async list(): Promise<Session[]> {
      const rows = await db.select().from(sessions);
      return rows.map(toSession);
    },

    async updateStatus(id: string, status: SessionStatus): Promise<Session | null> {
      sessionStatusSchema.parse(status);
      const patch: Partial<typeof sessions.$inferInsert> = { status };
      if (status === 'running') {
        patch.startedAt = nowIso();
      }
      if (status === 'succeeded' || status === 'failed' || status === 'canceled') {
        patch.endedAt = nowIso();
      }
      await db.update(sessions).set(patch).where(eq(sessions.id, id));
      return this.getById(id);
    },

    async update(
      id: string,
      patch: Partial<
        Pick<
          Session,
          | 'sdkSessionId'
          | 'branchName'
          | 'prUrl'
          | 'inputTokens'
          | 'outputTokens'
          | 'totalCostUsd'
          | 'numTurns'
          | 'status'
        >
      >,
    ): Promise<Session | null> {
      if (patch.status) {
        sessionStatusSchema.parse(patch.status);
      }
      await db.update(sessions).set(patch).where(eq(sessions.id, id));
      return this.getById(id);
    },
  };
}

export type SessionRepository = ReturnType<typeof createSessionRepository>;

import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import {
  sessionMessageCreateSchema,
  type SessionMessage,
  type SessionMessageCreate,
} from '@claude-assistant/shared';
import type { AppDatabase } from '../client.js';
import { sessionMessages } from '../schema/sessionMessages.js';

function nowIso(): string {
  return new Date().toISOString();
}

function toMessage(row: typeof sessionMessages.$inferSelect): SessionMessage {
  return {
    id: row.id,
    sessionId: row.sessionId,
    seq: row.seq,
    type: row.type,
    subtype: row.subtype,
    payload: row.payload,
    tokens: row.tokens,
    createdAt: row.createdAt,
  };
}

export function createSessionMessageRepository(db: AppDatabase) {
  return {
    async appendMessage(input: SessionMessageCreate): Promise<SessionMessage> {
      const data = sessionMessageCreateSchema.parse(input);
      const last = await db
        .select({ seq: sessionMessages.seq })
        .from(sessionMessages)
        .where(eq(sessionMessages.sessionId, data.sessionId))
        .orderBy(desc(sessionMessages.seq))
        .limit(1);
      const nextSeq = (last[0]?.seq ?? -1) + 1;
      const id = randomUUID();
      await db.insert(sessionMessages).values({
        id,
        sessionId: data.sessionId,
        seq: nextSeq,
        type: data.type,
        subtype: data.subtype ?? null,
        payload: data.payload,
        tokens: data.tokens ?? null,
        createdAt: nowIso(),
      });
      const rows = await db
        .select()
        .from(sessionMessages)
        .where(and(eq(sessionMessages.id, id)))
        .limit(1);
      const row = rows[0];
      if (!row) {
        throw new Error('Failed to append session message');
      }
      return toMessage(row);
    },

    async listMessages(sessionId: string): Promise<SessionMessage[]> {
      const rows = await db
        .select()
        .from(sessionMessages)
        .where(eq(sessionMessages.sessionId, sessionId))
        .orderBy(asc(sessionMessages.seq));
      return rows.map(toMessage);
    },

    async nextSeq(sessionId: string): Promise<number> {
      const result = await db
        .select({ maxSeq: sql<number>`coalesce(max(${sessionMessages.seq}), -1)` })
        .from(sessionMessages)
        .where(eq(sessionMessages.sessionId, sessionId));
      return (result[0]?.maxSeq ?? -1) + 1;
    },
  };
}

export type SessionMessageRepository = ReturnType<typeof createSessionMessageRepository>;

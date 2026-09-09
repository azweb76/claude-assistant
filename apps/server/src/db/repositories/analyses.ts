import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import {
  analysisCreateSchema,
  analysisStatusSchema,
  type Analysis,
  type AnalysisCreate,
} from '@claude-assistant/shared';
import type { AppDatabase } from '../client.js';
import { analyses } from '../schema/analyses.js';

function nowIso(): string {
  return new Date().toISOString();
}

function toAnalysis(row: typeof analyses.$inferSelect): Analysis {
  return {
    id: row.id,
    status: row.status as Analysis['status'],
    model: row.model,
    effort: row.effort as Analysis['effort'],
    summary: row.summary,
    sessionIds: row.sessionIds,
    createdAt: row.createdAt,
    endedAt: row.endedAt,
  };
}

export function createAnalysisRepository(db: AppDatabase) {
  return {
    async create(input: AnalysisCreate): Promise<Analysis> {
      const data = analysisCreateSchema.parse(input);
      const id = randomUUID();
      await db.insert(analyses).values({
        id,
        status: data.status ?? 'pending',
        model: data.model,
        effort: data.effort,
        summary: data.summary ?? null,
        sessionIds: data.sessionIds,
        createdAt: nowIso(),
      });
      const created = await this.getById(id);
      if (!created) {
        throw new Error('Failed to create analysis');
      }
      return created;
    },

    async getById(id: string): Promise<Analysis | null> {
      const rows = await db.select().from(analyses).where(eq(analyses.id, id)).limit(1);
      const row = rows[0];
      return row ? toAnalysis(row) : null;
    },

    async list(): Promise<Analysis[]> {
      const rows = await db.select().from(analyses);
      return rows.map(toAnalysis);
    },

    async updateStatus(
      id: string,
      status: Analysis['status'],
      summary?: string | null,
    ): Promise<Analysis | null> {
      analysisStatusSchema.parse(status);
      const patch: Partial<typeof analyses.$inferInsert> = { status };
      if (summary !== undefined) {
        patch.summary = summary;
      }
      if (status === 'succeeded' || status === 'failed') {
        patch.endedAt = nowIso();
      }
      await db.update(analyses).set(patch).where(eq(analyses.id, id));
      return this.getById(id);
    },
  };
}

export type AnalysisRepository = ReturnType<typeof createAnalysisRepository>;

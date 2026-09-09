import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import {
  improvementStatusSchema,
  stagedImprovementCreateSchema,
  type StagedImprovement,
  type StagedImprovementCreate,
} from '@claude-assistant/shared';
import type { AppDatabase } from '../client.js';
import { stagedImprovements } from '../schema/stagedImprovements.js';

function nowIso(): string {
  return new Date().toISOString();
}

function toImprovement(row: typeof stagedImprovements.$inferSelect): StagedImprovement {
  return {
    id: row.id,
    analysisId: row.analysisId,
    category: row.category as StagedImprovement['category'],
    scope: row.scope as StagedImprovement['scope'],
    workspaceId: row.workspaceId,
    targetPath: row.targetPath,
    rationale: row.rationale,
    currentContent: row.currentContent,
    proposedContent: row.proposedContent,
    diff: row.diff,
    status: row.status as StagedImprovement['status'],
    appliedAt: row.appliedAt,
    createdAt: row.createdAt,
  };
}

export function createStagedImprovementRepository(db: AppDatabase) {
  return {
    async create(input: StagedImprovementCreate): Promise<StagedImprovement> {
      const data = stagedImprovementCreateSchema.parse(input);
      const id = randomUUID();
      await db.insert(stagedImprovements).values({
        id,
        analysisId: data.analysisId,
        category: data.category,
        scope: data.scope,
        workspaceId: data.workspaceId ?? null,
        targetPath: data.targetPath,
        rationale: data.rationale,
        currentContent: data.currentContent,
        proposedContent: data.proposedContent,
        diff: data.diff,
        status: data.status ?? 'staged',
        createdAt: nowIso(),
      });
      const created = await this.getById(id);
      if (!created) {
        throw new Error('Failed to create staged improvement');
      }
      return created;
    },

    async getById(id: string): Promise<StagedImprovement | null> {
      const rows = await db
        .select()
        .from(stagedImprovements)
        .where(eq(stagedImprovements.id, id))
        .limit(1);
      const row = rows[0];
      return row ? toImprovement(row) : null;
    },

    async listByAnalysis(analysisId: string): Promise<StagedImprovement[]> {
      const rows = await db
        .select()
        .from(stagedImprovements)
        .where(eq(stagedImprovements.analysisId, analysisId));
      return rows.map(toImprovement);
    },

    async setStatus(
      id: string,
      status: StagedImprovement['status'],
    ): Promise<StagedImprovement | null> {
      improvementStatusSchema.parse(status);
      const patch: Partial<typeof stagedImprovements.$inferInsert> = { status };
      if (status === 'applied') {
        patch.appliedAt = nowIso();
      }
      await db.update(stagedImprovements).set(patch).where(eq(stagedImprovements.id, id));
      return this.getById(id);
    },
  };
}

export type StagedImprovementRepository = ReturnType<typeof createStagedImprovementRepository>;

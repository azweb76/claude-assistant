import { sql } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { analyses } from './analyses.js';
import { workspaces } from './workspaces.js';

export const stagedImprovements = sqliteTable('staged_improvements', {
  id: text('id').primaryKey(),
  analysisId: text('analysis_id')
    .notNull()
    .references(() => analyses.id),
  category: text('category').notNull(),
  scope: text('scope').notNull(),
  workspaceId: text('workspace_id').references(() => workspaces.id),
  targetPath: text('target_path').notNull(),
  rationale: text('rationale').notNull(),
  currentContent: text('current_content').notNull(),
  proposedContent: text('proposed_content').notNull(),
  diff: text('diff').notNull(),
  status: text('status').notNull().default('staged'),
  appliedAt: text('applied_at'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

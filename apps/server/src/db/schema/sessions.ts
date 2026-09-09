import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { agentProfiles } from './agentProfiles.js';
import { workspaces } from './workspaces.js';

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  profileId: text('profile_id')
    .notNull()
    .references(() => agentProfiles.id),
  profileSnapshot: text('profile_snapshot', { mode: 'json' })
    .$type<Record<string, unknown>>()
    .notNull(),
  prompt: text('prompt').notNull(),
  status: text('status').notNull().default('pending'),
  sdkSessionId: text('sdk_session_id'),
  branchName: text('branch_name'),
  prUrl: text('pr_url'),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  totalCostUsd: real('total_cost_usd'),
  numTurns: integer('num_turns'),
  startedAt: text('started_at'),
  endedAt: text('ended_at'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

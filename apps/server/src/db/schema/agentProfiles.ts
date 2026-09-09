import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const agentProfiles = sqliteTable('agent_profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  model: text('model').notNull(),
  effort: text('effort').notNull(),
  permissionMode: text('permission_mode').notNull(),
  allowedTools: text('allowed_tools', { mode: 'json' }).$type<string[] | null>(),
  disallowedTools: text('disallowed_tools', { mode: 'json' }).$type<string[] | null>(),
  skills: text('skills', { mode: 'json' }).$type<string[] | 'all' | null>(),
  agents: text('agents', { mode: 'json' }).$type<unknown[] | null>(),
  settingSources: text('setting_sources', { mode: 'json' })
    .$type<Array<'user' | 'project' | 'local'>>()
    .notNull(),
  maxTurns: integer('max_turns'),
  maxBudgetUsd: real('max_budget_usd'),
  extraSystemPrompt: text('extra_system_prompt'),
  isBuiltIn: integer('is_built_in', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

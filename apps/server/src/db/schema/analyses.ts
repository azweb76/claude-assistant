import { sql } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const analyses = sqliteTable('analyses', {
  id: text('id').primaryKey(),
  status: text('status').notNull().default('pending'),
  model: text('model').notNull(),
  effort: text('effort').notNull(),
  summary: text('summary'),
  sessionIds: text('session_ids', { mode: 'json' }).$type<string[]>().notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  endedAt: text('ended_at'),
});

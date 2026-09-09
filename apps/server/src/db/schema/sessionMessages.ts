import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sessions } from './sessions.js';

export const sessionMessages = sqliteTable(
  'session_messages',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id),
    seq: integer('seq').notNull(),
    type: text('type').notNull(),
    subtype: text('subtype'),
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
    tokens: text('tokens', { mode: 'json' }).$type<Record<string, unknown> | null>(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [uniqueIndex('session_messages_session_seq_unique').on(table.sessionId, table.seq)],
);

import { sql } from 'drizzle-orm';
import { sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const workspaces = sqliteTable(
  'workspaces',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    remote: text('remote').notNull(),
    owner: text('owner').notNull(),
    repo: text('repo').notNull(),
    defaultBranch: text('default_branch').notNull(),
    localPath: text('local_path').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [uniqueIndex('workspaces_remote_unique').on(table.remote)],
);

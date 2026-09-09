import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { createDb } from './client.js';
import { migrateDb } from './migrate.js';
import { seedDb } from './seed.js';

const dbPath = process.env.CLAUDE_ASSISTANT_DB_PATH ?? './data/claude-assistant.db';
mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
const { db, close } = createDb({ path: dbPath });
try {
  migrateDb(db);
  await seedDb(db);
  console.log('Database migrated and seeded');
} finally {
  close();
}

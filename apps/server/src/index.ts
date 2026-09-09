import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { buildApp } from './app.js';
import { createDb, defaultDbPath } from './db/client.js';
import { migrateDb } from './db/migrate.js';
import { seedDb } from './db/seed.js';
import { createSystemClock } from './lib/deps.js';

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '127.0.0.1';
const dbPath = defaultDbPath();
mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });

const { db, sqlite, close } = createDb({ path: dbPath });
migrateDb(db);
await seedDb(db);

const app = await buildApp({
  deps: {
    db,
    closeDb: close,
    clock: createSystemClock(),
    pingDb: () => {
      try {
        sqlite.prepare('select 1').get();
        return true;
      } catch {
        return false;
      }
    },
  },
  logger: true,
});

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  close();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ port, host });
  app.log.info(`server listening on http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  close();
  process.exit(1);
}

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.CLAUDE_ASSISTANT_DB_PATH ?? './data/claude-assistant.db',
  },
});

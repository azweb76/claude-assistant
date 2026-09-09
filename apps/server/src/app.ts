import Fastify from 'fastify';
import { APP_NAME } from '@claude-assistant/shared';

export async function buildApp() {
  const app = Fastify({ logger: false });

  app.get('/api/health', async () => {
    return { status: 'ok', app: APP_NAME };
  });

  return app;
}

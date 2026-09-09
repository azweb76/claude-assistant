import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { APP_NAME } from '@claude-assistant/shared';
import type { Dependencies } from './lib/deps.js';
import { AppError, NotFoundError, ValidationError } from './lib/errors.js';
import { openSse, streamAsyncIterable } from './lib/sse.js';
import { registerSettingsRoutes } from './routes/settings.js';
import type { StreamEvent } from '@claude-assistant/shared';

declare module 'fastify' {
  interface FastifyInstance {
    deps: Dependencies;
  }
}

export type BuildAppOptions = {
  deps: Dependencies;
  logger?: boolean | object;
};

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false });
  app.decorate('deps', options.deps);

  app.setNotFoundHandler((_request, reply) => {
    const error = new NotFoundError('Route not found');
    return reply.status(error.statusCode).send(error.toBody());
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(error.toBody());
    }
    if (error instanceof ZodError) {
      const mapped = new ValidationError('Validation failed', error.flatten());
      return reply.status(mapped.statusCode).send(mapped.toBody());
    }
    app.log.error(error);
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  });

  app.get('/api/health', async () => {
    const dbOk = options.deps.pingDb();
    return {
      status: dbOk ? 'ok' : 'degraded',
      app: APP_NAME,
      db: dbOk ? 'ok' : 'error',
    };
  });

  // Test/demo SSE route used by unit tests and as a contract sample.
  app.get('/api/_test/sse', async (request, reply) => {
    const controller = openSse(request, reply, { heartbeatMs: 60_000 });
    async function* events(): AsyncGenerator<StreamEvent> {
      yield { type: 'status', data: { status: 'started' } };
      yield { type: 'message', data: { messageType: 'assistant', payload: { text: 'one' } } };
      yield { type: 'message', data: { messageType: 'assistant', payload: { text: 'two' } } };
      yield { type: 'status', data: { status: 'done' } };
    }
    await streamAsyncIterable(controller, events());
  });

  app.get('/api/_test/deps', async () => {
    return { hasDb: Boolean(app.deps.db), now: app.deps.clock.now().toISOString() };
  });

  app.get('/api/_test/domain-error', async () => {
    throw new NotFoundError('Thing not found');
  });

  await registerSettingsRoutes(app);

  return app;
}

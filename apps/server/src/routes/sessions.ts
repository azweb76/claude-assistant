import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { createSessionRepository } from '../db/repositories/sessions.js';
import { parseOrThrow } from '../lib/validation.js';
import { openSse } from '../lib/sse.js';
import { NotFoundError } from '../lib/errors.js';

const createBodySchema = z.object({
  workspaceId: z.string().uuid(),
  profileId: z.string().uuid(),
  prompt: z.string().min(1),
});

const idParamsSchema = z.object({
  id: z.string().uuid(),
});

const followUpBodySchema = z.object({
  prompt: z.string().min(1),
});

export async function registerSessionRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/sessions', async (request, reply) => {
    const body = parseOrThrow(createBodySchema, request.body);
    const session = await app.deps.sessionRunner.createAndStart(body);
    return reply.status(201).send(session);
  });

  app.get('/api/sessions', async () => {
    const repo = createSessionRepository(app.deps.db);
    return repo.list();
  });

  app.get('/api/sessions/:id', async (request) => {
    const params = parseOrThrow(idParamsSchema, request.params);
    return app.deps.sessionRunner.getTranscript(params.id);
  });

  app.get('/api/sessions/:id/stream', async (request, reply) => {
    const params = parseOrThrow(idParamsSchema, request.params);
    const session = await createSessionRepository(app.deps.db).getById(params.id);
    if (!session) {
      throw new NotFoundError('Session not found');
    }
    const controller = openSse(request, reply, { heartbeatMs: 15_000 });
    controller.send({ type: 'status', data: { status: session.status } });
    const unsubscribe = app.deps.sessionRunner.subscribe(params.id, (event) => {
      controller.send(event);
      if (
        event.type === 'status' &&
        ['succeeded', 'failed', 'canceled'].includes(String(event.data.status))
      ) {
        unsubscribe();
        controller.close();
      }
    });
    request.raw.on('close', () => {
      unsubscribe();
      controller.close();
    });
  });

  app.post('/api/sessions/:id/cancel', async (request) => {
    const params = parseOrThrow(idParamsSchema, request.params);
    return app.deps.sessionRunner.cancel(params.id);
  });

  app.post('/api/sessions/:id/messages', async (request) => {
    const params = parseOrThrow(idParamsSchema, request.params);
    const body = parseOrThrow(followUpBodySchema, request.body);
    return app.deps.sessionRunner.followUp(params.id, body.prompt);
  });
}

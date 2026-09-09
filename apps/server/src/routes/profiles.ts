import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { agentProfileCreateSchema, agentProfileSchema } from '@claude-assistant/shared';
import { createAgentProfileRepository } from '../db/repositories/agentProfiles.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { parseOrThrow } from '../lib/validation.js';

const idParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function registerProfileRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/profiles', async () => {
    const repo = createAgentProfileRepository(app.deps.db);
    return repo.list();
  });

  app.post('/api/profiles', async (request, reply) => {
    const body = parseOrThrow(agentProfileCreateSchema, request.body);
    const repo = createAgentProfileRepository(app.deps.db);
    const created = await repo.create(body);
    return reply.status(201).send(created);
  });

  app.get('/api/profiles/:id', async (request) => {
    const params = parseOrThrow(idParamsSchema, request.params);
    const repo = createAgentProfileRepository(app.deps.db);
    const profile = await repo.getById(params.id);
    if (!profile) {
      throw new NotFoundError('Profile not found');
    }
    return profile;
  });

  app.put('/api/profiles/:id', async (request) => {
    const params = parseOrThrow(idParamsSchema, request.params);
    const body = parseOrThrow(agentProfileCreateSchema.partial(), request.body);
    const repo = createAgentProfileRepository(app.deps.db);
    const updated = await repo.update(params.id, body);
    if (!updated) {
      throw new NotFoundError('Profile not found');
    }
    return agentProfileSchema.parse(updated);
  });

  app.delete('/api/profiles/:id', async (request, reply) => {
    const params = parseOrThrow(idParamsSchema, request.params);
    const repo = createAgentProfileRepository(app.deps.db);
    try {
      const deleted = await repo.delete(params.id);
      if (!deleted) {
        throw new NotFoundError('Profile not found');
      }
      return reply.status(204).send();
    } catch (err) {
      if (err instanceof Error && /built-in/i.test(err.message)) {
        throw new ValidationError(err.message);
      }
      throw err;
    }
  });
}

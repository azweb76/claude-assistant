import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { parseOrThrow } from '../lib/validation.js';
import { NotFoundError } from '../lib/errors.js';

const createBodySchema = z.object({
  ref: z.string().min(1),
});

const idParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function registerWorkspaceRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/workspaces', async (request, reply) => {
    const body = parseOrThrow(createBodySchema, request.body);
    const workspace = await app.deps.workspaceService.addWorkspace(body.ref);
    return reply.status(201).send(workspace);
  });

  app.get('/api/workspaces', async () => {
    return app.deps.workspaceService.listWorkspaces();
  });

  app.get('/api/workspaces/:id', async (request) => {
    const params = parseOrThrow(idParamsSchema, request.params);
    return app.deps.workspaceService.getWorkspace(params.id);
  });

  app.delete('/api/workspaces/:id', async (request, reply) => {
    const params = parseOrThrow(idParamsSchema, request.params);
    await app.deps.workspaceService.removeWorkspace(params.id);
    return reply.status(204).send();
  });
}

/** Re-export for tests that need NotFound without circular imports. */
export { NotFoundError };

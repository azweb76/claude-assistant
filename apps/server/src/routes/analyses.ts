import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { createAnalysisRepository } from '../db/repositories/analyses.js';
import { createAppSettingsRepository } from '../db/repositories/appSettings.js';
import { createSessionMessageRepository } from '../db/repositories/sessionMessages.js';
import { createSessionRepository } from '../db/repositories/sessions.js';
import { createStagedImprovementRepository } from '../db/repositories/stagedImprovements.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { openSse } from '../lib/sse.js';
import { parseOrThrow } from '../lib/validation.js';
import { runAnalyzer } from '../services/analysis/analyzer.js';
import {
  applyImprovement,
  discardImprovement,
  stageFindings,
} from '../services/analysis/staging.js';

const createBodySchema = z.object({
  sessionIds: z.array(z.string().uuid()).min(1),
});

const idParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function registerAnalysisRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/analyses', async (request, reply) => {
    const body = parseOrThrow(createBodySchema, request.body);
    const settings = createAppSettingsRepository(app.deps.db);
    const analyses = createAnalysisRepository(app.deps.db);
    const sessions = createSessionRepository(app.deps.db);
    const messages = createSessionMessageRepository(app.deps.db);

    const loaded = [];
    for (const id of body.sessionIds) {
      const session = await sessions.getById(id);
      if (!session) {
        throw new ValidationError(`Unknown session ${id}`);
      }
      loaded.push({
        id: session.id,
        messages: await messages.listMessages(id),
        inputTokens: session.inputTokens,
        outputTokens: session.outputTokens,
        totalCostUsd: session.totalCostUsd,
        numTurns: session.numTurns,
      });
    }

    const analysis = await analyses.create({
      sessionIds: body.sessionIds,
      model: await settings.get('analysisModel'),
      effort: await settings.get('analysisEffort'),
      status: 'running',
    });

    void (async () => {
      try {
        const result = await runAnalyzer(app.deps.sdkClient, {
          sessions: loaded,
          model: analysis.model,
          effort: analysis.effort,
        });
        await stageFindings(app.deps.db, analysis.id, result.findings);
        await analyses.updateStatus(analysis.id, 'succeeded', result.summary);
      } catch (err) {
        await analyses.updateStatus(
          analysis.id,
          'failed',
          err instanceof Error ? err.message : String(err),
        );
      }
    })();

    return reply.status(201).send(analysis);
  });

  app.get('/api/analyses/:id', async (request) => {
    const params = parseOrThrow(idParamsSchema, request.params);
    const analysis = await createAnalysisRepository(app.deps.db).getById(params.id);
    if (!analysis) {
      throw new NotFoundError('Analysis not found');
    }
    const improvements = await createStagedImprovementRepository(app.deps.db).listByAnalysis(
      params.id,
    );
    return { ...analysis, improvements };
  });

  app.get('/api/analyses/:id/stream', async (request, reply) => {
    const params = parseOrThrow(idParamsSchema, request.params);
    const analyses = createAnalysisRepository(app.deps.db);
    const analysis = await analyses.getById(params.id);
    if (!analysis) {
      throw new NotFoundError('Analysis not found');
    }
    const controller = openSse(request, reply, { heartbeatMs: 10_000 });
    controller.send({ type: 'status', data: { status: analysis.status } });
    const timer = setInterval(async () => {
      const current = await analyses.getById(params.id);
      if (!current) {
        clearInterval(timer);
        controller.close();
        return;
      }
      controller.send({ type: 'status', data: { status: current.status } });
      if (current.status === 'succeeded' || current.status === 'failed') {
        clearInterval(timer);
        controller.close();
      }
    }, 200);
    request.raw.on('close', () => {
      clearInterval(timer);
      controller.close();
    });
  });

  app.post('/api/improvements/:id/apply', async (request) => {
    const params = parseOrThrow(idParamsSchema, request.params);
    return applyImprovement(app.deps.db, params.id);
  });

  app.post('/api/improvements/:id/discard', async (request) => {
    const params = parseOrThrow(idParamsSchema, request.params);
    return discardImprovement(app.deps.db, params.id);
  });
}

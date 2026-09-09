import type { FastifyInstance } from 'fastify';
import { appSettingsValuesSchema, type AppSettingsValues } from '@claude-assistant/shared';
import { createAppSettingsRepository } from '../db/repositories/appSettings.js';
import { parseOrThrow } from '../lib/validation.js';

const settingsUpdateSchema = appSettingsValuesSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one settings field is required',
  });

export async function registerSettingsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/settings', async () => {
    const repo = createAppSettingsRepository(app.deps.db);
    return repo.getAll();
  });

  app.put('/api/settings', async (request) => {
    const patch = parseOrThrow(settingsUpdateSchema, request.body) as Partial<AppSettingsValues>;
    const repo = createAppSettingsRepository(app.deps.db);
    const current = await repo.getAll();
    const next = { ...current, ...patch };
    // Explicitly persist allowBypassPermissions when provided (never silently coerce).
    if ('allowBypassPermissions' in patch) {
      next.allowBypassPermissions = Boolean(patch.allowBypassPermissions);
    }
    const validated = appSettingsValuesSchema.parse(next);
    for (const key of Object.keys(patch) as Array<keyof AppSettingsValues>) {
      await repo.set(key, validated[key]);
    }
    return validated;
  });
}

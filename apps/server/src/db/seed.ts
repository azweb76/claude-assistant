import { eq } from 'drizzle-orm';
import {
  APP_SETTINGS_DEFAULTS,
  type AgentProfileCreate,
  type AppSettingKey,
} from '@claude-assistant/shared';
import type { AppDatabase } from './client.js';
import { createAgentProfileRepository } from './repositories/agentProfiles.js';
import { createAppSettingsRepository } from './repositories/appSettings.js';
import { agentProfiles } from './schema/agentProfiles.js';
import { appSettings } from './schema/appSettings.js';

/** Stable ids so seeding is idempotent across runs. */
export const BUILTIN_PROFILE_IDS = {
  planFirst: '00000000-0000-4000-8000-000000000001',
  buildPr: '00000000-0000-4000-8000-000000000002',
} as const;

const planFirstProfile: AgentProfileCreate & { id: string } = {
  id: BUILTIN_PROFILE_IDS.planFirst,
  name: 'Plan-first',
  model: 'claude-sonnet-4-20250514',
  effort: 'high',
  permissionMode: 'plan',
  allowedTools: null,
  disallowedTools: null,
  skills: 'all',
  agents: null,
  settingSources: ['user', 'project'],
  maxTurns: 40,
  maxBudgetUsd: 5,
  extraSystemPrompt:
    'Prefer planning before edits. Ask clarifying questions when scope is unclear.',
  isBuiltIn: true,
};

const buildPrProfile: AgentProfileCreate & { id: string } = {
  id: BUILTIN_PROFILE_IDS.buildPr,
  name: 'Build + PR',
  model: 'claude-sonnet-4-20250514',
  effort: 'high',
  permissionMode: 'acceptEdits',
  allowedTools: null,
  disallowedTools: null,
  skills: 'all',
  agents: null,
  settingSources: ['user', 'project'],
  maxTurns: 80,
  maxBudgetUsd: 15,
  extraSystemPrompt: 'Implement the requested change, commit, and open a pull request.',
  isBuiltIn: true,
};

async function upsertBuiltIn(
  db: AppDatabase,
  profile: AgentProfileCreate & { id: string },
): Promise<void> {
  const existing = await db
    .select()
    .from(agentProfiles)
    .where(eq(agentProfiles.id, profile.id))
    .limit(1);
  if (existing[0]) {
    return;
  }
  const timestamp = new Date().toISOString();
  await db.insert(agentProfiles).values({
    id: profile.id,
    name: profile.name,
    model: profile.model,
    effort: profile.effort,
    permissionMode: profile.permissionMode,
    allowedTools: profile.allowedTools ?? null,
    disallowedTools: profile.disallowedTools ?? null,
    skills: profile.skills ?? null,
    agents: profile.agents ?? null,
    settingSources: profile.settingSources,
    maxTurns: profile.maxTurns ?? null,
    maxBudgetUsd: profile.maxBudgetUsd ?? null,
    extraSystemPrompt: profile.extraSystemPrompt ?? null,
    isBuiltIn: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export async function seedDb(db: AppDatabase): Promise<void> {
  await upsertBuiltIn(db, planFirstProfile);
  await upsertBuiltIn(db, buildPrProfile);

  const settings = createAppSettingsRepository(db);
  for (const key of Object.keys(APP_SETTINGS_DEFAULTS) as AppSettingKey[]) {
    const rows = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
    if (!rows[0]) {
      const value =
        key === 'defaultProfileId' ? BUILTIN_PROFILE_IDS.buildPr : APP_SETTINGS_DEFAULTS[key];
      await settings.set(key, value as never);
    }
  }
}

export async function bootstrapDb(db: AppDatabase): Promise<void> {
  const { migrateDb } = await import('./migrate.js');
  await migrateDb(db);
  await seedDb(db);
}

export async function listBuiltInProfiles(db: AppDatabase) {
  const repo = createAgentProfileRepository(db);
  const all = await repo.list();
  return all.filter((p) => p.isBuiltIn);
}

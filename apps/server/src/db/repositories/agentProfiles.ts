import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import {
  agentProfileCreateSchema,
  type AgentProfile,
  type AgentProfileCreate,
} from '@claude-assistant/shared';
import type { AppDatabase } from '../client.js';
import { agentProfiles } from '../schema/agentProfiles.js';

function nowIso(): string {
  return new Date().toISOString();
}

function toProfile(row: typeof agentProfiles.$inferSelect): AgentProfile {
  return {
    id: row.id,
    name: row.name,
    model: row.model,
    effort: row.effort as AgentProfile['effort'],
    permissionMode: row.permissionMode as AgentProfile['permissionMode'],
    allowedTools: row.allowedTools ?? null,
    disallowedTools: row.disallowedTools ?? null,
    skills: row.skills ?? null,
    agents: row.agents ?? null,
    settingSources: row.settingSources,
    maxTurns: row.maxTurns ?? null,
    maxBudgetUsd: row.maxBudgetUsd ?? null,
    extraSystemPrompt: row.extraSystemPrompt ?? null,
    isBuiltIn: row.isBuiltIn,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createAgentProfileRepository(db: AppDatabase) {
  return {
    async create(input: AgentProfileCreate): Promise<AgentProfile> {
      const data = agentProfileCreateSchema.parse(input);
      const id = randomUUID();
      const timestamp = nowIso();
      await db.insert(agentProfiles).values({
        id,
        name: data.name,
        model: data.model,
        effort: data.effort,
        permissionMode: data.permissionMode,
        allowedTools: data.allowedTools ?? null,
        disallowedTools: data.disallowedTools ?? null,
        skills: data.skills ?? null,
        agents: data.agents ?? null,
        settingSources: data.settingSources,
        maxTurns: data.maxTurns ?? null,
        maxBudgetUsd: data.maxBudgetUsd ?? null,
        extraSystemPrompt: data.extraSystemPrompt ?? null,
        isBuiltIn: data.isBuiltIn ?? false,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      const created = await this.getById(id);
      if (!created) {
        throw new Error('Failed to create agent profile');
      }
      return created;
    },

    async getById(id: string): Promise<AgentProfile | null> {
      const rows = await db.select().from(agentProfiles).where(eq(agentProfiles.id, id)).limit(1);
      const row = rows[0];
      return row ? toProfile(row) : null;
    },

    async list(): Promise<AgentProfile[]> {
      const rows = await db.select().from(agentProfiles);
      return rows.map(toProfile);
    },

    async update(id: string, input: Partial<AgentProfileCreate>): Promise<AgentProfile | null> {
      const existing = await this.getById(id);
      if (!existing) {
        return null;
      }
      const merged = agentProfileCreateSchema.parse({
        ...existing,
        ...input,
        isBuiltIn: existing.isBuiltIn,
      });
      await db
        .update(agentProfiles)
        .set({
          name: merged.name,
          model: merged.model,
          effort: merged.effort,
          permissionMode: merged.permissionMode,
          allowedTools: merged.allowedTools ?? null,
          disallowedTools: merged.disallowedTools ?? null,
          skills: merged.skills ?? null,
          agents: merged.agents ?? null,
          settingSources: merged.settingSources,
          maxTurns: merged.maxTurns ?? null,
          maxBudgetUsd: merged.maxBudgetUsd ?? null,
          extraSystemPrompt: merged.extraSystemPrompt ?? null,
          updatedAt: nowIso(),
        })
        .where(eq(agentProfiles.id, id));
      return this.getById(id);
    },

    async delete(id: string): Promise<boolean> {
      const existing = await this.getById(id);
      if (!existing) {
        return false;
      }
      if (existing.isBuiltIn) {
        throw new Error('Cannot delete built-in agent profile');
      }
      const result = await db.delete(agentProfiles).where(eq(agentProfiles.id, id));
      return (result.changes ?? 0) > 0;
    },
  };
}

export type AgentProfileRepository = ReturnType<typeof createAgentProfileRepository>;

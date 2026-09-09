import { z } from 'zod';

export const effortSchema = z.enum(['low', 'medium', 'high', 'xhigh', 'max']);
export const permissionModeSchema = z.enum(['default', 'acceptEdits', 'bypassPermissions', 'plan']);
export const settingSourceSchema = z.enum(['user', 'project', 'local']);

export const agentProfileCreateSchema = z.object({
  name: z.string().min(1),
  model: z.string().min(1),
  effort: effortSchema,
  permissionMode: permissionModeSchema,
  allowedTools: z.array(z.string()).nullable().optional(),
  disallowedTools: z.array(z.string()).nullable().optional(),
  skills: z.union([z.array(z.string()), z.literal('all'), z.null()]).optional(),
  agents: z.array(z.unknown()).nullable().optional(),
  settingSources: z.array(settingSourceSchema).min(1),
  maxTurns: z.number().int().positive().nullable().optional(),
  maxBudgetUsd: z.number().positive().nullable().optional(),
  extraSystemPrompt: z.string().nullable().optional(),
  isBuiltIn: z.boolean().optional().default(false),
});

export const agentProfileSchema = agentProfileCreateSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Effort = z.infer<typeof effortSchema>;
export type PermissionMode = z.infer<typeof permissionModeSchema>;
export type AgentProfileCreate = z.infer<typeof agentProfileCreateSchema>;
export type AgentProfile = z.infer<typeof agentProfileSchema>;

import { z } from 'zod';

/** Subset of SDK Options fields we map from profiles. */
export const mappedSdkOptionsSchema = z.object({
  model: z.string(),
  effort: z.enum(['low', 'medium', 'high', 'xhigh', 'max']).optional(),
  permissionMode: z.enum(['default', 'acceptEdits', 'bypassPermissions', 'plan']).optional(),
  allowDangerouslySkipPermissions: z.boolean().optional(),
  allowedTools: z.array(z.string()).optional(),
  disallowedTools: z.array(z.string()).optional(),
  skills: z.union([z.array(z.string()), z.literal('all')]).optional(),
  agents: z.unknown().optional(),
  settingSources: z.array(z.enum(['user', 'project', 'local'])),
  cwd: z.string(),
  maxTurns: z.number().int().positive().optional(),
  maxBudgetUsd: z.number().positive().optional(),
  systemPrompt: z.string().optional(),
  resume: z.string().optional(),
});

export type MappedSdkOptions = z.infer<typeof mappedSdkOptionsSchema>;

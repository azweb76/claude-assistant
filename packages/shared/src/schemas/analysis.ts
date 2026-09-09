import { z } from 'zod';
import { effortSchema } from './agentProfile.js';

export const analysisStatusSchema = z.enum(['pending', 'running', 'succeeded', 'failed']);

export const improvementCategorySchema = z.enum([
  'claude_instructions',
  'project_skill_agent',
  'user_skill_agent',
]);

export const improvementScopeSchema = z.enum(['user', 'project']);

export const improvementStatusSchema = z.enum(['staged', 'applied', 'discarded']);

export const analysisCreateSchema = z.object({
  sessionIds: z.array(z.string().uuid()).min(1),
  model: z.string().min(1),
  effort: effortSchema,
  status: analysisStatusSchema.optional().default('pending'),
  summary: z.string().nullable().optional(),
});

export const analysisSchema = analysisCreateSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string(),
  endedAt: z.string().nullable().optional(),
});

export const stagedImprovementBaseSchema = z.object({
  analysisId: z.string().uuid(),
  category: improvementCategorySchema,
  scope: improvementScopeSchema,
  workspaceId: z.string().uuid().nullable().optional(),
  targetPath: z.string().min(1),
  rationale: z.string().min(1),
  currentContent: z.string(),
  proposedContent: z.string(),
  diff: z.string(),
  status: improvementStatusSchema.optional().default('staged'),
});

export const stagedImprovementCreateSchema = stagedImprovementBaseSchema.superRefine(
  (value, ctx) => {
    if (value.scope === 'project' && !value.workspaceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'workspaceId is required when scope is project',
        path: ['workspaceId'],
      });
    }
  },
);

export const stagedImprovementSchema = stagedImprovementBaseSchema.extend({
  id: z.string().uuid(),
  appliedAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type AnalysisCreate = z.infer<typeof analysisCreateSchema>;
export type Analysis = z.infer<typeof analysisSchema>;
export type StagedImprovementCreate = z.infer<typeof stagedImprovementCreateSchema>;
export type StagedImprovement = z.infer<typeof stagedImprovementSchema>;

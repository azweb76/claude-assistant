import { z } from 'zod';
import { improvementCategorySchema, improvementScopeSchema } from './analysis.js';

export const findingSchema = z.object({
  category: improvementCategorySchema,
  scopeHint: z.enum(['generic', 'project-specific', 'instructions-project', 'instructions-user']),
  rationale: z.string().min(1),
  target: z.string().min(1),
  proposedContent: z.string(),
  workspaceId: z.string().uuid().optional(),
});

export const findingsResponseSchema = z.object({
  summary: z.string(),
  findings: z.array(findingSchema),
});

export type Finding = z.infer<typeof findingSchema>;
export type FindingsResponse = z.infer<typeof findingsResponseSchema>;

export { improvementScopeSchema };

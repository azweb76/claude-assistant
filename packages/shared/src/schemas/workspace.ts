import { z } from 'zod';

export const workspaceCreateSchema = z.object({
  name: z.string().min(1),
  remote: z.string().min(1),
  owner: z.string().min(1),
  repo: z.string().min(1),
  defaultBranch: z.string().min(1),
  localPath: z.string().min(1),
});

export const workspaceSchema = workspaceCreateSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WorkspaceCreate = z.infer<typeof workspaceCreateSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;

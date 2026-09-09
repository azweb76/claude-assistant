import { z } from 'zod';
import { agentProfileSchema } from './agentProfile.js';

export const sessionStatusSchema = z.enum([
  'pending',
  'running',
  'succeeded',
  'failed',
  'canceled',
]);

export const sessionCreateSchema = z.object({
  workspaceId: z.string().uuid(),
  profileId: z.string().uuid(),
  profileSnapshot: agentProfileSchema.or(z.record(z.unknown())),
  prompt: z.string().min(1),
  status: sessionStatusSchema.default('pending'),
});

export const sessionSchema = sessionCreateSchema.extend({
  id: z.string().uuid(),
  sdkSessionId: z.string().nullable().optional(),
  branchName: z.string().nullable().optional(),
  prUrl: z.string().nullable().optional(),
  inputTokens: z.number().int().nullable().optional(),
  outputTokens: z.number().int().nullable().optional(),
  totalCostUsd: z.number().nullable().optional(),
  numTurns: z.number().int().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  endedAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const sessionMessageCreateSchema = z.object({
  sessionId: z.string().uuid(),
  type: z.string().min(1),
  subtype: z.string().nullable().optional(),
  payload: z.record(z.unknown()),
  tokens: z.record(z.unknown()).nullable().optional(),
});

export const sessionMessageSchema = sessionMessageCreateSchema.extend({
  id: z.string().uuid(),
  seq: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export type SessionStatus = z.infer<typeof sessionStatusSchema>;
export type SessionCreate = z.infer<typeof sessionCreateSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type SessionMessageCreate = z.infer<typeof sessionMessageCreateSchema>;
export type SessionMessage = z.infer<typeof sessionMessageSchema>;

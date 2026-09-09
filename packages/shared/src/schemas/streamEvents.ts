import { z } from 'zod';

export const streamEventTypeSchema = z.enum(['message', 'usage', 'status', 'error', 'heartbeat']);

export const streamMessageEventSchema = z.object({
  type: z.literal('message'),
  data: z.object({
    id: z.string().optional(),
    seq: z.number().int().optional(),
    messageType: z.string(),
    subtype: z.string().nullable().optional(),
    payload: z.unknown(),
  }),
});

export const streamUsageEventSchema = z.object({
  type: z.literal('usage'),
  data: z.object({
    inputTokens: z.number().optional(),
    outputTokens: z.number().optional(),
    totalCostUsd: z.number().optional(),
    numTurns: z.number().optional(),
  }),
});

export const streamStatusEventSchema = z.object({
  type: z.literal('status'),
  data: z.object({
    status: z.string(),
    detail: z.string().optional(),
  }),
});

export const streamErrorEventSchema = z.object({
  type: z.literal('error'),
  data: z.object({
    message: z.string(),
    code: z.string().optional(),
  }),
});

export const streamHeartbeatEventSchema = z.object({
  type: z.literal('heartbeat'),
  data: z.object({
    at: z.string(),
  }),
});

export const streamEventSchema = z.discriminatedUnion('type', [
  streamMessageEventSchema,
  streamUsageEventSchema,
  streamStatusEventSchema,
  streamErrorEventSchema,
  streamHeartbeatEventSchema,
]);

export type StreamEvent = z.infer<typeof streamEventSchema>;

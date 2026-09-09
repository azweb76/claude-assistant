import { z } from 'zod';
import type { MappedSdkOptions } from '@claude-assistant/shared';

export const sdkMessageSchema = z
  .object({
    type: z.string(),
    subtype: z.string().optional().nullable(),
    session_id: z.string().optional(),
    total_cost_usd: z.number().optional(),
    usage: z
      .object({
        input_tokens: z.number().optional(),
        output_tokens: z.number().optional(),
      })
      .passthrough()
      .optional(),
    num_turns: z.number().optional(),
    result: z.unknown().optional(),
    message: z.unknown().optional(),
  })
  .passthrough();

export type SdkMessage = z.infer<typeof sdkMessageSchema>;

export type SdkClient = {
  runQuery: (prompt: string, options: MappedSdkOptions) => AsyncIterable<SdkMessage>;
};

export function createFakeSdkClient(messages: SdkMessage[]): SdkClient {
  return {
    async *runQuery() {
      for (const message of messages) {
        yield sdkMessageSchema.parse(message);
      }
    },
  };
}

/** Real SDK client — loaded lazily so tests never import the SDK. */
export function createSdkClient(): SdkClient {
  return {
    async *runQuery(prompt, options) {
      const { query } = await import('@anthropic-ai/claude-agent-sdk');
      const stream = query({ prompt, options: options as never });
      for await (const message of stream) {
        yield sdkMessageSchema.parse(message);
      }
    },
  };
}

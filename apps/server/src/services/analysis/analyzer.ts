import { findingsResponseSchema, type Finding } from '@claude-assistant/shared';
import type { SdkClient } from '../runner/sdkClient.js';
import type { StreamEvent } from '@claude-assistant/shared';
import { buildReviewPrompt } from './reviewPrompt.js';
import { extractSessionMetrics, type SessionMessageLike, type SessionMetrics } from './metrics.js';

export type AnalyzerInput = {
  sessions: Array<{
    id: string;
    messages: SessionMessageLike[];
    inputTokens?: number | null;
    outputTokens?: number | null;
    totalCostUsd?: number | null;
    numTurns?: number | null;
  }>;
  model: string;
  effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  onEvent?: (event: StreamEvent) => void;
};

export async function runAnalyzer(
  sdk: SdkClient,
  input: AnalyzerInput,
): Promise<{ summary: string; findings: Finding[]; metrics: SessionMetrics[] }> {
  const metrics = input.sessions.map((s) => extractSessionMetrics(s.id, s.messages, s));
  const prompt = buildReviewPrompt({
    metrics,
    transcripts: input.sessions.map((s) => ({ sessionId: s.id, messages: s.messages })),
  });
  input.onEvent?.({ type: 'status', data: { status: 'running', detail: 'reviewing' } });

  let text = '';
  for await (const message of sdk.runQuery(prompt, {
    model: input.model,
    effort: input.effort,
    settingSources: ['user'],
    cwd: process.cwd(),
  })) {
    input.onEvent?.({
      type: 'message',
      data: { messageType: message.type, payload: message },
    });
    if (message.type === 'assistant' || message.type === 'result') {
      text += JSON.stringify(message.message ?? message.result ?? message);
    }
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { summary: 'No structured findings returned', findings: [], metrics };
  }
  const parsed = findingsResponseSchema.safeParse(JSON.parse(jsonMatch[0]));
  if (!parsed.success) {
    return { summary: 'Malformed findings rejected', findings: [], metrics };
  }
  input.onEvent?.({ type: 'status', data: { status: 'succeeded' } });
  return { summary: parsed.data.summary, findings: parsed.data.findings, metrics };
}

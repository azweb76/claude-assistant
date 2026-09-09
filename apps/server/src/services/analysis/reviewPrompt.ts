import type { SessionMetrics } from './metrics.js';
import type { SessionMessageLike } from './metrics.js';

const MAX_CHARS = 12_000;

export function buildReviewPrompt(input: {
  metrics: SessionMetrics[];
  transcripts: Array<{ sessionId: string; messages: SessionMessageLike[] }>;
}): string {
  const header = `Analyze these Claude agent sessions for waste and inefficiency.
Return ONLY JSON matching:
{"summary": string, "findings": [{"category":"claude_instructions"|"project_skill_agent"|"user_skill_agent","scopeHint":"generic"|"project-specific"|"instructions-project"|"instructions-user","rationale":string,"target":string,"proposedContent":string,"workspaceId"?:string}]}
Route generic skills to user scope, project-specific skills to project scope.
`;

  const metricsBlock = JSON.stringify(input.metrics, null, 2);
  let body = `${header}\nMETRICS:\n${metricsBlock}\n\nTRANSCRIPTS:\n`;
  for (const t of input.transcripts) {
    const excerpt = t.messages
      .slice(0, 40)
      .map((m) => `${m.type}: ${JSON.stringify(m.payload).slice(0, 200)}`)
      .join('\n');
    body += `\n### Session ${t.sessionId}\n${excerpt}\n`;
  }
  if (body.length > MAX_CHARS) {
    body = body.slice(0, MAX_CHARS) + '\n[truncated]';
  }
  return body;
}

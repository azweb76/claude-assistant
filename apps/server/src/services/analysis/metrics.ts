export type SessionMessageLike = {
  type: string;
  subtype?: string | null;
  payload: Record<string, unknown>;
};

export type SessionMetrics = {
  sessionId: string;
  messageCount: number;
  toolCallCount: number;
  redundantReads: number;
  thrashEdits: number;
  errorCount: number;
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: number;
  numTurns: number;
};

function toolName(payload: Record<string, unknown>): string | null {
  if (typeof payload.name === 'string') return payload.name;
  if (typeof payload.tool === 'string') return payload.tool;
  return null;
}

function toolPath(payload: Record<string, unknown>): string | null {
  const input = payload.input;
  if (input && typeof input === 'object' && 'file_path' in input) {
    const path = (input as { file_path?: unknown }).file_path;
    return typeof path === 'string' ? path : null;
  }
  if (typeof payload.file_path === 'string') return payload.file_path;
  return null;
}

export function extractSessionMetrics(
  sessionId: string,
  messages: SessionMessageLike[],
  usage: {
    inputTokens?: number | null;
    outputTokens?: number | null;
    totalCostUsd?: number | null;
    numTurns?: number | null;
  },
): SessionMetrics {
  const reads = new Map<string, number>();
  let toolCallCount = 0;
  let thrashEdits = 0;
  let errorCount = 0;
  const recentEdits: string[] = [];

  for (const message of messages) {
    if (message.type === 'tool_use' || message.subtype === 'tool_use') {
      toolCallCount += 1;
      const name = toolName(message.payload);
      const path = toolPath(message.payload);
      if (name === 'Read' && path) {
        reads.set(path, (reads.get(path) ?? 0) + 1);
      }
      if ((name === 'Edit' || name === 'Write') && path) {
        if (recentEdits.includes(path)) {
          thrashEdits += 1;
        }
        recentEdits.push(path);
        if (recentEdits.length > 8) recentEdits.shift();
      }
    }
    if (message.type === 'error' || message.subtype === 'error') {
      errorCount += 1;
    }
  }

  let redundantReads = 0;
  for (const count of reads.values()) {
    if (count > 1) redundantReads += count - 1;
  }

  return {
    sessionId,
    messageCount: messages.length,
    toolCallCount,
    redundantReads,
    thrashEdits,
    errorCount,
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    totalCostUsd: usage.totalCostUsd ?? 0,
    numTurns: usage.numTurns ?? 0,
  };
}

export function aggregateMetrics(metrics: SessionMetrics[]) {
  return metrics.reduce(
    (acc, m) => ({
      sessions: acc.sessions + 1,
      toolCallCount: acc.toolCallCount + m.toolCallCount,
      redundantReads: acc.redundantReads + m.redundantReads,
      thrashEdits: acc.thrashEdits + m.thrashEdits,
      errorCount: acc.errorCount + m.errorCount,
      totalCostUsd: acc.totalCostUsd + m.totalCostUsd,
    }),
    {
      sessions: 0,
      toolCallCount: 0,
      redundantReads: 0,
      thrashEdits: 0,
      errorCount: 0,
      totalCostUsd: 0,
    },
  );
}

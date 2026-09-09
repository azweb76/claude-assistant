import { describe, expect, it } from 'vitest';
import { extractSessionMetrics } from '../metrics.js';

describe('session metrics', () => {
  it('detects redundant reads and thrash edits', () => {
    const metrics = extractSessionMetrics(
      's1',
      [
        { type: 'tool_use', payload: { name: 'Read', input: { file_path: 'a.ts' } } },
        { type: 'tool_use', payload: { name: 'Read', input: { file_path: 'a.ts' } } },
        { type: 'tool_use', payload: { name: 'Edit', input: { file_path: 'a.ts' } } },
        { type: 'tool_use', payload: { name: 'Edit', input: { file_path: 'a.ts' } } },
        { type: 'error', payload: { message: 'boom' } },
      ],
      { inputTokens: 10, outputTokens: 5, totalCostUsd: 0.1, numTurns: 3 },
    );
    expect(metrics.redundantReads).toBe(1);
    expect(metrics.thrashEdits).toBe(1);
    expect(metrics.errorCount).toBe(1);
    expect(metrics.toolCallCount).toBe(4);
  });
});

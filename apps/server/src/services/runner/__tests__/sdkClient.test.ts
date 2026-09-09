import { describe, expect, it } from 'vitest';
import { createFakeSdkClient } from '../sdkClient.js';

describe('sdk client fake', () => {
  it('yields scripted normalized messages', async () => {
    const client = createFakeSdkClient([
      { type: 'assistant', message: { text: 'hi' } },
      { type: 'result', session_id: 'abc', total_cost_usd: 0.02 },
    ]);
    const collected = [];
    for await (const message of client.runQuery('prompt', {
      model: 'claude-sonnet-4-20250514',
      settingSources: ['user'],
      cwd: '/tmp',
    })) {
      collected.push(message);
    }
    expect(collected).toHaveLength(2);
    expect(collected[0]?.type).toBe('assistant');
    expect(collected[1]?.session_id).toBe('abc');
  });
});

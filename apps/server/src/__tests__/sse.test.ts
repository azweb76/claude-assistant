import { describe, expect, it } from 'vitest';
import { useTestApp } from './testApp.js';

function parseSse(body: string): Array<{ event: string; data: unknown }> {
  const chunks = body.split('\n\n').filter((c) => c.trim() && !c.startsWith(':'));
  return chunks.map((chunk) => {
    const lines = chunk.split('\n');
    const event = lines.find((l) => l.startsWith('event: '))?.slice(7) ?? '';
    const dataLine = lines.find((l) => l.startsWith('data: '))?.slice(6) ?? '{}';
    return { event, data: JSON.parse(dataLine) };
  });
}

describe('SSE utility', () => {
  const getApp = useTestApp();

  it('streams typed events in order and terminates', async () => {
    const { app } = await getApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/_test/sse',
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/event-stream/);
    const events = parseSse(response.body);
    expect(events.map((e) => e.event)).toEqual(['status', 'message', 'message', 'status']);
    expect(events[0]?.data).toEqual({ status: 'started' });
    expect(events[3]?.data).toEqual({ status: 'done' });
  });
});

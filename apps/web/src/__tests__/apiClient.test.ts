import { describe, expect, it, vi, afterEach } from 'vitest';
import { z } from 'zod';
import { apiRequest, ApiClientError } from '../api/client.js';

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses successful responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    );
    const data = await apiRequest('/api/x', z.object({ ok: z.boolean() }));
    expect(data.ok).toBe(true);
  });

  it('maps backend errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'missing' } }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    );
    await expect(apiRequest('/api/x', z.object({}))).rejects.toBeInstanceOf(ApiClientError);
  });

  it('fails on schema mismatch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ nope: 1 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    );
    await expect(apiRequest('/api/x', z.object({ ok: z.boolean() }))).rejects.toMatchObject({
      code: 'SCHEMA_ERROR',
    });
  });
});

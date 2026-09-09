import { describe, expect, it } from 'vitest';
import { useTestApp } from './testApp.js';

describe('GET /api/health', () => {
  const getApp = useTestApp();

  it('returns 200 with status ok and db connectivity', async () => {
    const { app } = await getApp();
    const response = await app.inject({ method: 'GET', url: '/api/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      app: 'claude-assistant',
      db: 'ok',
    });
  });
});

describe('dependency injection', () => {
  const getApp = useTestApp();

  it('exposes injected deps to routes', async () => {
    const { app } = await getApp();
    const response = await app.inject({ method: 'GET', url: '/api/_test/deps' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ hasDb: true });
    expect(response.json().now).toEqual(expect.any(String));
  });
});

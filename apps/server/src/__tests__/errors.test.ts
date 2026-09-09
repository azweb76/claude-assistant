import { describe, expect, it } from 'vitest';
import { useTestApp } from './testApp.js';

describe('error handling', () => {
  const getApp = useTestApp();

  it('returns structured 404 for unknown routes', async () => {
    const { app } = await getApp();
    const response = await app.inject({ method: 'GET', url: '/api/does-not-exist' });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });

  it('returns structured 400 for invalid settings body', async () => {
    const { app } = await getApp();
    const response = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      payload: { analysisEffort: 'not-an-effort' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
    expect(response.json().error.details).toBeTruthy();
  });

  it('maps domain NotFoundError', async () => {
    const { app } = await getApp();
    const response = await app.inject({ method: 'GET', url: '/api/_test/domain-error' });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'Thing not found' },
    });
  });
});

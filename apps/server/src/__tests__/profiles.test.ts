import { describe, expect, it } from 'vitest';
import { createTestApp } from './testApp.js';
import { seedDb, BUILTIN_PROFILE_IDS } from '../db/seed.js';

describe('profile routes', () => {
  it('supports CRUD and protects built-ins', async () => {
    const { app, deps, close } = await createTestApp();
    try {
      await seedDb(deps.db);
      const listed = await app.inject({ method: 'GET', url: '/api/profiles' });
      expect(listed.statusCode).toBe(200);
      expect(listed.json().length).toBeGreaterThanOrEqual(2);

      const created = await app.inject({
        method: 'POST',
        url: '/api/profiles',
        payload: {
          name: 'Custom',
          model: 'claude-sonnet-4-20250514',
          effort: 'low',
          permissionMode: 'default',
          settingSources: ['user'],
        },
      });
      expect(created.statusCode).toBe(201);
      const id = created.json().id as string;

      const updated = await app.inject({
        method: 'PUT',
        url: `/api/profiles/${id}`,
        payload: { effort: 'high' },
      });
      expect(updated.statusCode).toBe(200);
      expect(updated.json().effort).toBe('high');

      const blocked = await app.inject({
        method: 'DELETE',
        url: `/api/profiles/${BUILTIN_PROFILE_IDS.planFirst}`,
      });
      expect(blocked.statusCode).toBe(400);

      const deleted = await app.inject({ method: 'DELETE', url: `/api/profiles/${id}` });
      expect(deleted.statusCode).toBe(204);
    } finally {
      await close();
    }
  });
});

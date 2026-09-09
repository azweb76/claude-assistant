import { describe, expect, it } from 'vitest';
import { APP_SETTINGS_DEFAULTS } from '@claude-assistant/shared';
import { useTestApp } from './testApp.js';

describe('settings routes', () => {
  const getApp = useTestApp();

  it('GET returns defaults on a fresh DB', async () => {
    const { app } = await getApp();
    const response = await app.inject({ method: 'GET', url: '/api/settings' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      managedCloneDir: APP_SETTINGS_DEFAULTS.managedCloneDir,
      allowBypassPermissions: false,
      analysisEffort: 'high',
    });
  });

  it('PUT persists and is reflected by subsequent GET', async () => {
    const { app } = await getApp();
    const put = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      payload: {
        managedCloneDir: '/tmp/clones',
        allowBypassPermissions: true,
      },
    });
    expect(put.statusCode).toBe(200);
    expect(put.json().managedCloneDir).toBe('/tmp/clones');
    expect(put.json().allowBypassPermissions).toBe(true);

    const get = await app.inject({ method: 'GET', url: '/api/settings' });
    expect(get.json().managedCloneDir).toBe('/tmp/clones');
    expect(get.json().allowBypassPermissions).toBe(true);
  });
});

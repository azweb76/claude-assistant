import { describe, expect, it } from 'vitest';
import { APP_SETTINGS_DEFAULTS } from '@claude-assistant/shared';
import { createAppSettingsRepository } from '../appSettings.js';
import { useMigratedTestDb } from './helpers.js';

describe('app settings repository', () => {
  const getDb = useMigratedTestDb();

  it('returns defaults when unset and round-trips typed values', async () => {
    const { db } = getDb();
    const settings = createAppSettingsRepository(db);
    expect(await settings.get('managedCloneDir')).toBe(APP_SETTINGS_DEFAULTS.managedCloneDir);
    expect(await settings.get('allowBypassPermissions')).toBe(false);
    expect(await settings.get('analysisEffort')).toBe('high');

    await settings.set('managedCloneDir', '/tmp/clones');
    await settings.set('allowBypassPermissions', true);
    await settings.set('analysisEffort', 'max');
    await settings.set('analysisModel', 'claude-opus-4-20250514');
    await settings.set('defaultSettingSources', ['user']);
    await settings.set('defaultProfileId', '00000000-0000-4000-8000-000000000001');

    const all = await settings.getAll();
    expect(all.managedCloneDir).toBe('/tmp/clones');
    expect(all.allowBypassPermissions).toBe(true);
    expect(all.analysisEffort).toBe('max');
    expect(all.analysisModel).toBe('claude-opus-4-20250514');
    expect(all.defaultSettingSources).toEqual(['user']);
    expect(all.defaultProfileId).toBe('00000000-0000-4000-8000-000000000001');
  });
});

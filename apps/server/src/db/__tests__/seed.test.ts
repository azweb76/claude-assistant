import { describe, expect, it } from 'vitest';
import { createAppSettingsRepository } from '../repositories/appSettings.js';
import { seedDb, BUILTIN_PROFILE_IDS, listBuiltInProfiles } from '../seed.js';
import { useMigratedTestDb } from '../repositories/__tests__/helpers.js';

describe('migrate + seed bootstrap', () => {
  const getDb = useMigratedTestDb();

  it('migrates a fresh DB and seeds built-ins idempotently', async () => {
    const { db } = getDb();
    await seedDb(db);
    await seedDb(db);

    const builtIns = await listBuiltInProfiles(db);
    expect(builtIns).toHaveLength(2);
    expect(builtIns.map((p) => p.id).sort()).toEqual(
      [BUILTIN_PROFILE_IDS.planFirst, BUILTIN_PROFILE_IDS.buildPr].sort(),
    );

    const settings = createAppSettingsRepository(db);
    const all = await settings.getAll();
    expect(all.defaultProfileId).toBe(BUILTIN_PROFILE_IDS.buildPr);
    expect(all.defaultSettingSources).toEqual(['user', 'project']);
  });
});

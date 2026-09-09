import { eq } from 'drizzle-orm';
import {
  APP_SETTINGS_DEFAULTS,
  appSettingKeySchema,
  appSettingsValuesSchema,
  type AppSettingKey,
  type AppSettingsValues,
} from '@claude-assistant/shared';
import type { AppDatabase } from '../client.js';
import { appSettings } from '../schema/appSettings.js';

export function createAppSettingsRepository(db: AppDatabase) {
  return {
    async getAll(): Promise<AppSettingsValues> {
      const rows = await db.select().from(appSettings);
      const values: Record<string, unknown> = { ...APP_SETTINGS_DEFAULTS };
      for (const row of rows) {
        const key = appSettingKeySchema.safeParse(row.key);
        if (key.success) {
          values[key.data] = row.value;
        }
      }
      return appSettingsValuesSchema.parse(values);
    },

    async get<K extends AppSettingKey>(key: K): Promise<AppSettingsValues[K]> {
      appSettingKeySchema.parse(key);
      const rows = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
      const row = rows[0];
      if (!row) {
        return APP_SETTINGS_DEFAULTS[key];
      }
      const all = { ...APP_SETTINGS_DEFAULTS, [key]: row.value };
      const parsed = appSettingsValuesSchema.parse(all);
      return parsed[key];
    },

    async set<K extends AppSettingKey>(key: K, value: AppSettingsValues[K]): Promise<void> {
      appSettingKeySchema.parse(key);
      const candidate = { ...APP_SETTINGS_DEFAULTS, [key]: value };
      appSettingsValuesSchema.parse(candidate);
      await db.insert(appSettings).values({ key, value }).onConflictDoUpdate({
        target: appSettings.key,
        set: { value },
      });
    },
  };
}

export type AppSettingsRepository = ReturnType<typeof createAppSettingsRepository>;

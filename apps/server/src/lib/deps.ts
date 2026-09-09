import type { AppDatabase } from '../db/client.js';
import type { AppSettingsValues } from '@claude-assistant/shared';

export type Clock = {
  now: () => Date;
};

export type Dependencies = {
  db: AppDatabase;
  clock: Clock;
  closeDb: () => void;
  /** Returns true when the DB accepts queries. */
  pingDb: () => boolean;
};

export function createSystemClock(): Clock {
  return { now: () => new Date() };
}

export type SettingsService = {
  getAll: () => Promise<AppSettingsValues>;
  update: (patch: Partial<AppSettingsValues>) => Promise<AppSettingsValues>;
};

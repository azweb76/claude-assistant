import type { AppDatabase } from '../db/client.js';
import type { AppSettingsValues } from '@claude-assistant/shared';
import type { CommandExecutor } from '../services/git/executor.js';
import type { GitService } from '../services/git/gitService.js';
import type { GitHubService } from '../services/git/githubService.js';
import type { WorkspaceService } from '../services/workspaces/workspaceService.js';
import type { SdkClient } from '../services/runner/sdkClient.js';
import type { SessionRunner } from '../services/runner/sessionRunner.js';
import type { RunRegistry } from '../services/runner/registry.js';

export type Clock = {
  now: () => Date;
};

export type Dependencies = {
  db: AppDatabase;
  clock: Clock;
  closeDb: () => void;
  /** Returns true when the DB accepts queries. */
  pingDb: () => boolean;
  executor: CommandExecutor;
  gitService: GitService;
  githubService: GitHubService;
  workspaceService: WorkspaceService;
  sdkClient: SdkClient;
  sessionRunner: SessionRunner;
  runRegistry: RunRegistry;
};

export function createSystemClock(): Clock {
  return { now: () => new Date() };
}

export type SettingsService = {
  getAll: () => Promise<AppSettingsValues>;
  update: (patch: Partial<AppSettingsValues>) => Promise<AppSettingsValues>;
};

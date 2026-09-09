import { createCommandExecutor } from '../services/git/executor.js';
import { createGitService } from '../services/git/gitService.js';
import { createGitHubService } from '../services/git/githubService.js';
import { createWorkspaceService } from '../services/workspaces/workspaceService.js';
import { createSdkClient } from '../services/runner/sdkClient.js';
import { createRunRegistry } from '../services/runner/registry.js';
import { createSessionRunner } from '../services/runner/sessionRunner.js';
import { createSystemClock, type Dependencies } from './deps.js';
import type { AppDatabase } from '../db/client.js';

export function buildDependencies(input: {
  db: AppDatabase;
  closeDb: () => void;
  pingDb: () => boolean;
  overrides?: Partial<Dependencies>;
}): Dependencies {
  const o = input.overrides ?? {};
  const executor = o.executor ?? createCommandExecutor();
  const gitService = o.gitService ?? createGitService(executor);
  const githubService = o.githubService ?? createGitHubService(executor);
  const workspaceService = o.workspaceService ?? createWorkspaceService(input.db, gitService);
  const sdkClient = o.sdkClient ?? createSdkClient();
  const runRegistry = o.runRegistry ?? createRunRegistry();
  const sessionRunner =
    o.sessionRunner ??
    createSessionRunner({
      db: input.db,
      git: gitService,
      github: githubService,
      sdk: sdkClient,
      registry: runRegistry,
    });

  return {
    db: input.db,
    closeDb: input.closeDb,
    pingDb: input.pingDb,
    clock: o.clock ?? createSystemClock(),
    executor,
    gitService,
    githubService,
    workspaceService,
    sdkClient,
    sessionRunner,
    runRegistry,
  };
}

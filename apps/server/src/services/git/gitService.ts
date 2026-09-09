import type { CommandExecutor } from './executor.js';

export type GitService = {
  verifyAccess: (remote: string) => Promise<void>;
  clone: (remote: string, dest: string) => Promise<void>;
  getDefaultBranch: (cwd: string) => Promise<string>;
  fetchAndReset: (cwd: string, branch: string) => Promise<void>;
  createBranch: (cwd: string, name: string) => Promise<void>;
  stageAll: (cwd: string) => Promise<void>;
  commit: (cwd: string, message: string) => Promise<void>;
  push: (cwd: string, branch: string) => Promise<void>;
  hasChanges: (cwd: string) => Promise<boolean>;
};

export function createGitService(executor: CommandExecutor): GitService {
  return {
    async verifyAccess(remote) {
      await executor.exec('git', ['ls-remote', '--heads', remote]);
    },

    async clone(remote, dest) {
      await executor.exec('git', ['clone', remote, dest]);
    },

    async getDefaultBranch(cwd) {
      const result = await executor.exec(
        'git',
        ['symbolic-ref', 'refs/remotes/origin/HEAD', '--short'],
        { cwd },
      );
      const short = result.stdout.trim();
      const parts = short.split('/');
      return parts[parts.length - 1] || 'main';
    },

    async fetchAndReset(cwd, branch) {
      await executor.exec('git', ['fetch', 'origin', branch], { cwd });
      await executor.exec('git', ['checkout', branch], { cwd });
      await executor.exec('git', ['reset', '--hard', `origin/${branch}`], { cwd });
    },

    async createBranch(cwd, name) {
      await executor.exec('git', ['checkout', '-b', name], { cwd });
    },

    async stageAll(cwd) {
      await executor.exec('git', ['add', '-A'], { cwd });
    },

    async commit(cwd, message) {
      await executor.exec('git', ['commit', '-m', message], { cwd });
    },

    async push(cwd, branch) {
      await executor.exec('git', ['push', '-u', 'origin', branch], { cwd });
    },

    async hasChanges(cwd) {
      const status = await executor.exec('git', ['status', '--porcelain'], { cwd });
      return status.stdout.trim().length > 0;
    },
  };
}

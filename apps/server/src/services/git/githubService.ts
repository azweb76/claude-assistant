import type { CommandExecutor } from './executor.js';

export type CreatePullRequestInput = {
  cwd: string;
  base: string;
  head: string;
  title: string;
  body: string;
};

export type GitHubService = {
  checkAuth: () => Promise<{ ok: boolean; detail: string }>;
  createPullRequest: (input: CreatePullRequestInput) => Promise<string>;
};

export function createGitHubService(executor: CommandExecutor): GitHubService {
  return {
    async checkAuth() {
      try {
        const result = await executor.exec('gh', ['auth', 'status']);
        return { ok: true, detail: result.stderr || result.stdout };
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return { ok: false, detail };
      }
    },

    async createPullRequest(input) {
      const result = await executor.exec(
        'gh',
        [
          'pr',
          'create',
          '--base',
          input.base,
          '--head',
          input.head,
          '--title',
          input.title,
          '--body',
          input.body,
        ],
        { cwd: input.cwd },
      );
      const url = result.stdout.trim().split('\n').filter(Boolean).at(-1) ?? '';
      if (!/^https?:\/\//.test(url)) {
        throw new Error(`gh pr create did not return a URL: ${result.stdout}`);
      }
      return url;
    },
  };
}

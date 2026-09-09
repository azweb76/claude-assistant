import { describe, expect, it } from 'vitest';
import { ExternalCommandError } from '../../../lib/errors.js';
import { createFakeExecutor } from '../executor.js';
import { createGitHubService } from '../githubService.js';

describe('github service', () => {
  it('creates a PR and parses the URL', async () => {
    const gh = createGitHubService(
      createFakeExecutor([
        {
          match: (file, args) => file === 'gh' && args[0] === 'pr',
          result: {
            stdout: 'https://github.com/acme/demo/pull/1\n',
            stderr: '',
            code: 0,
          },
        },
      ]),
    );
    const url = await gh.createPullRequest({
      cwd: '/tmp/demo',
      base: 'main',
      head: 'feature',
      title: 't',
      body: 'b',
    });
    expect(url).toBe('https://github.com/acme/demo/pull/1');
  });

  it('reports auth failure', async () => {
    const gh = createGitHubService(
      createFakeExecutor([
        {
          match: (file, args) => file === 'gh' && args[0] === 'auth',
          error: new ExternalCommandError('not logged in', { code: 1 }),
        },
      ]),
    );
    const status = await gh.checkAuth();
    expect(status.ok).toBe(false);
  });
});

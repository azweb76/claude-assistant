import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createCommandExecutor } from '../executor.js';
import { createGitService } from '../gitService.js';

describe('git service', () => {
  it('issues expected args via fake executor', async () => {
    const calls: Array<{ file: string; args: string[] }> = [];
    const executor = {
      async exec(file: string, args: string[]) {
        calls.push({ file, args });
        if (args[0] === 'status') {
          return { stdout: ' M file.txt\n', stderr: '', code: 0 };
        }
        if (args[0] === 'symbolic-ref') {
          return { stdout: 'origin/main\n', stderr: '', code: 0 };
        }
        return { stdout: '', stderr: '', code: 0 };
      },
    };
    const git = createGitService(executor);
    await git.verifyAccess('https://github.com/a/b.git');
    await git.clone('https://github.com/a/b.git', '/tmp/b');
    expect(await git.getDefaultBranch('/tmp/b')).toBe('main');
    await git.createBranch('/tmp/b', 'feature');
    expect(await git.hasChanges('/tmp/b')).toBe(true);
    expect(calls.some((c) => c.args[0] === 'ls-remote')).toBe(true);
    expect(calls.some((c) => c.args[0] === 'clone')).toBe(true);
    expect(calls.some((c) => c.args.includes('-b'))).toBe(true);
  });

  it('works against a temporary local git repo', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'git-svc-'));
    const executor = createCommandExecutor();
    await executor.exec('git', ['init'], { cwd: dir });
    await executor.exec('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
    await executor.exec('git', ['config', 'user.name', 'Test'], { cwd: dir });
    writeFileSync(path.join(dir, 'README.md'), 'hello\n');
    await executor.exec('git', ['add', 'README.md'], { cwd: dir });
    await executor.exec('git', ['commit', '-m', 'init'], { cwd: dir });

    const git = createGitService(executor);
    expect(await git.hasChanges(dir)).toBe(false);
    writeFileSync(path.join(dir, 'README.md'), 'hello world\n');
    expect(await git.hasChanges(dir)).toBe(true);
    await git.createBranch(dir, 'feature/x');
    await git.stageAll(dir);
    await git.commit(dir, 'update');
    expect(await git.hasChanges(dir)).toBe(false);
  });
});

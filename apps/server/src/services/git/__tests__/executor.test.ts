import { describe, expect, it } from 'vitest';
import { ExternalCommandError } from '../../../lib/errors.js';
import { createCommandExecutor, createFakeExecutor } from '../executor.js';

describe('command executor', () => {
  it('fake executor returns success and failure', async () => {
    const ok = createFakeExecutor([
      {
        match: (file, args) => file === 'git' && args[0] === 'version',
        result: { stdout: 'git version 2.0', stderr: '', code: 0 },
      },
    ]);
    await expect(ok.exec('git', ['version'])).resolves.toMatchObject({
      stdout: 'git version 2.0',
      code: 0,
    });

    const fail = createFakeExecutor([
      {
        match: () => true,
        error: new ExternalCommandError('boom', { code: 1 }),
      },
    ]);
    await expect(fail.exec('git', ['fail'])).rejects.toBeInstanceOf(ExternalCommandError);
  });

  it('real executor runs git --version without a shell', async () => {
    const executor = createCommandExecutor();
    const result = await executor.exec('git', ['--version']);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/git version/i);
  });
});

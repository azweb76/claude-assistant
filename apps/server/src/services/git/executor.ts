import { spawn } from 'node:child_process';
import { ExternalCommandError } from '../../lib/errors.js';

export type CommandResult = {
  stdout: string;
  stderr: string;
  code: number;
};

export type CommandExecutor = {
  exec: (
    file: string,
    args: string[],
    options?: { cwd?: string; env?: NodeJS.ProcessEnv },
  ) => Promise<CommandResult>;
};

export function createCommandExecutor(): CommandExecutor {
  return {
    exec(file, args, options = {}) {
      return new Promise((resolve, reject) => {
        const child = spawn(file, args, {
          cwd: options.cwd,
          env: options.env ?? process.env,
          shell: false,
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk: Buffer) => {
          stdout += chunk.toString('utf8');
        });
        child.stderr.on('data', (chunk: Buffer) => {
          stderr += chunk.toString('utf8');
        });
        child.on('error', (err) => {
          reject(
            new ExternalCommandError(`Failed to start ${file}`, {
              file,
              args,
              message: err.message,
            }),
          );
        });
        child.on('close', (code) => {
          const result: CommandResult = { stdout, stderr, code: code ?? 1 };
          if (result.code !== 0) {
            reject(
              new ExternalCommandError(`${file} exited with code ${result.code}`, {
                file,
                args,
                ...result,
              }),
            );
            return;
          }
          resolve(result);
        });
      });
    },
  };
}

export function createFakeExecutor(
  handlers: Array<{
    match: (file: string, args: string[]) => boolean;
    result?: CommandResult;
    error?: ExternalCommandError;
  }>,
): CommandExecutor {
  return {
    async exec(file, args) {
      const handler = handlers.find((h) => h.match(file, args));
      if (!handler) {
        throw new ExternalCommandError(`No fake handler for ${file} ${args.join(' ')}`, {
          file,
          args,
        });
      }
      if (handler.error) {
        throw handler.error;
      }
      return handler.result ?? { stdout: '', stderr: '', code: 0 };
    },
  };
}

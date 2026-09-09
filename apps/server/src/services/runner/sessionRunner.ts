import type { AgentProfile, Session, StreamEvent } from '@claude-assistant/shared';
import type { AppDatabase } from '../../db/client.js';
import { createAppSettingsRepository } from '../../db/repositories/appSettings.js';
import { createAgentProfileRepository } from '../../db/repositories/agentProfiles.js';
import { createSessionMessageRepository } from '../../db/repositories/sessionMessages.js';
import { createSessionRepository } from '../../db/repositories/sessions.js';
import { createWorkspaceRepository } from '../../db/repositories/workspaces.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import type { GitService } from '../git/gitService.js';
import type { GitHubService } from '../git/githubService.js';
import { mapProfileToOptions } from './mapProfileToOptions.js';
import type { RunRegistry } from './registry.js';
import type { SdkClient, SdkMessage } from './sdkClient.js';

export type SessionEventListener = (event: StreamEvent) => void;

export type SessionRunner = {
  createAndStart: (input: {
    workspaceId: string;
    profileId: string;
    prompt: string;
  }) => Promise<Session>;
  followUp: (sessionId: string, prompt: string) => Promise<Session>;
  cancel: (sessionId: string) => Promise<Session>;
  subscribe: (sessionId: string, listener: SessionEventListener) => () => void;
  getTranscript: (sessionId: string) => Promise<Session & { messages: unknown[] }>;
};

export function createSessionRunner(input: {
  db: AppDatabase;
  git: GitService;
  github: GitHubService;
  sdk: SdkClient;
  registry: RunRegistry;
}): SessionRunner {
  const { db, git, github, sdk, registry } = input;
  const sessions = createSessionRepository(db);
  const messages = createSessionMessageRepository(db);
  const workspaces = createWorkspaceRepository(db);
  const profiles = createAgentProfileRepository(db);
  const settings = createAppSettingsRepository(db);
  const listeners = new Map<string, Set<SessionEventListener>>();

  const emit = (sessionId: string, event: StreamEvent) => {
    const set = listeners.get(sessionId);
    if (!set) {
      return;
    }
    for (const listener of set) {
      listener(event);
    }
  };

  const runSession = async (session: Session, prompt: string, resume?: string) => {
    const abortController = new AbortController();
    registry.register(session.id, abortController);
    await sessions.updateStatus(session.id, 'running');
    emit(session.id, { type: 'status', data: { status: 'running' } });

    const workspace = await workspaces.getById(session.workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }
    const profile = session.profileSnapshot as AgentProfile;
    const allowBypass = await settings.get('allowBypassPermissions');
    const options = mapProfileToOptions({
      profile,
      cwd: workspace.localPath,
      allowBypassPermissions: allowBypass,
      resume,
    });

    const branchName = `claude-assistant/${session.id.slice(0, 8)}`;
    await sessions.update(session.id, { branchName });

    try {
      await git.fetchAndReset(workspace.localPath, workspace.defaultBranch);
      await git.createBranch(workspace.localPath, branchName);

      for await (const message of sdk.runQuery(prompt, options)) {
        if (abortController.signal.aborted) {
          await sessions.updateStatus(session.id, 'canceled');
          emit(session.id, { type: 'status', data: { status: 'canceled' } });
          return;
        }
        await persistAndEmit(session.id, message);
      }

      const hasChanges = await git.hasChanges(workspace.localPath);
      if (hasChanges) {
        const title = prompt.slice(0, 72) || 'claude-assistant changes';
        await git.stageAll(workspace.localPath);
        await git.commit(workspace.localPath, title);
        await git.push(workspace.localPath, branchName);
        const prUrl = await github.createPullRequest({
          cwd: workspace.localPath,
          base: workspace.defaultBranch,
          head: branchName,
          title,
          body: `Automated PR from claude-assistant session ${session.id}\n\n${prompt}`,
        });
        await sessions.update(session.id, { prUrl, status: 'succeeded' });
        emit(session.id, { type: 'status', data: { status: 'succeeded', detail: prUrl } });
      } else {
        await sessions.updateStatus(session.id, 'succeeded');
        emit(session.id, { type: 'status', data: { status: 'succeeded' } });
      }
    } catch (err) {
      if (abortController.signal.aborted) {
        await sessions.updateStatus(session.id, 'canceled');
        emit(session.id, { type: 'status', data: { status: 'canceled' } });
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      await sessions.updateStatus(session.id, 'failed');
      emit(session.id, { type: 'error', data: { message } });
      emit(session.id, { type: 'status', data: { status: 'failed', detail: message } });
    } finally {
      registry.unregister(session.id);
    }
  };

  const persistAndEmit = async (sessionId: string, message: SdkMessage) => {
    const stored = await messages.appendMessage({
      sessionId,
      type: message.type,
      subtype: message.subtype ?? null,
      payload: message as Record<string, unknown>,
    });
    emit(sessionId, {
      type: 'message',
      data: {
        id: stored.id,
        seq: stored.seq,
        messageType: stored.type,
        subtype: stored.subtype,
        payload: stored.payload,
      },
    });

    if (
      message.type === 'result' ||
      message.session_id ||
      message.usage ||
      message.total_cost_usd != null
    ) {
      await sessions.update(sessionId, {
        ...(message.session_id ? { sdkSessionId: message.session_id } : {}),
        ...(message.usage?.input_tokens != null ? { inputTokens: message.usage.input_tokens } : {}),
        ...(message.usage?.output_tokens != null
          ? { outputTokens: message.usage.output_tokens }
          : {}),
        ...(message.total_cost_usd != null ? { totalCostUsd: message.total_cost_usd } : {}),
        ...(message.num_turns != null ? { numTurns: message.num_turns } : {}),
      });
      emit(sessionId, {
        type: 'usage',
        data: {
          inputTokens: message.usage?.input_tokens,
          outputTokens: message.usage?.output_tokens,
          totalCostUsd: message.total_cost_usd,
          numTurns: message.num_turns,
        },
      });
    }
  };

  return {
    async createAndStart({ workspaceId, profileId, prompt }) {
      const workspace = await workspaces.getById(workspaceId);
      if (!workspace) {
        throw new NotFoundError('Workspace not found');
      }
      const profile = await profiles.getById(profileId);
      if (!profile) {
        throw new NotFoundError('Profile not found');
      }
      const session = await sessions.create({
        workspaceId,
        profileId,
        profileSnapshot: profile,
        prompt,
        status: 'pending',
      });
      void runSession(session, prompt);
      return session;
    },

    async followUp(sessionId, prompt) {
      const session = await sessions.getById(sessionId);
      if (!session) {
        throw new NotFoundError('Session not found');
      }
      if (!session.sdkSessionId) {
        throw new ValidationError('Session has no sdkSessionId to resume');
      }
      void runSession(session, prompt, session.sdkSessionId);
      return session;
    },

    async cancel(sessionId) {
      const session = await sessions.getById(sessionId);
      if (!session) {
        throw new NotFoundError('Session not found');
      }
      const aborted = registry.abort(sessionId);
      if (!aborted && session.status === 'running') {
        await sessions.updateStatus(sessionId, 'canceled');
      }
      const updated = await sessions.getById(sessionId);
      return updated!;
    },

    subscribe(sessionId, listener) {
      let set = listeners.get(sessionId);
      if (!set) {
        set = new Set();
        listeners.set(sessionId, set);
      }
      set.add(listener);
      return () => {
        set!.delete(listener);
        if (set!.size === 0) {
          listeners.delete(sessionId);
        }
      };
    },

    async getTranscript(sessionId) {
      const session = await sessions.getById(sessionId);
      if (!session) {
        throw new NotFoundError('Session not found');
      }
      const msgs = await messages.listMessages(sessionId);
      return { ...session, messages: msgs };
    },
  };
}

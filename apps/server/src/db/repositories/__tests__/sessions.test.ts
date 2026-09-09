import { describe, expect, it } from 'vitest';
import { createAgentProfileRepository } from '../agentProfiles.js';
import { createSessionMessageRepository } from '../sessionMessages.js';
import { createSessionRepository } from '../sessions.js';
import { createWorkspaceRepository } from '../workspaces.js';
import { useMigratedTestDb } from './helpers.js';

describe('session + session_messages repositories', () => {
  const getDb = useMigratedTestDb();

  async function seedRefs(db: ReturnType<typeof getDb>['db']) {
    const workspaces = createWorkspaceRepository(db);
    const profiles = createAgentProfileRepository(db);
    const workspace = await workspaces.create({
      name: 'Demo',
      remote: 'https://github.com/acme/demo.git',
      owner: 'acme',
      repo: 'demo',
      defaultBranch: 'main',
      localPath: '/tmp/demo',
    });
    const profile = await profiles.create({
      name: 'Runner',
      model: 'claude-sonnet-4-20250514',
      effort: 'medium',
      permissionMode: 'acceptEdits',
      settingSources: ['user', 'project'],
    });
    return { workspace, profile };
  }

  it('persists session lifecycle and ordered messages', async () => {
    const { db } = getDb();
    const { workspace, profile } = await seedRefs(db);
    const sessions = createSessionRepository(db);
    const messages = createSessionMessageRepository(db);

    const session = await sessions.create({
      workspaceId: workspace.id,
      profileId: profile.id,
      profileSnapshot: profile,
      prompt: 'Do the thing',
    });
    expect(session.status).toBe('pending');
    await sessions.updateStatus(session.id, 'running');
    const running = await sessions.getById(session.id);
    expect(running?.status).toBe('running');
    expect(running?.startedAt).toBeTruthy();

    const m1 = await messages.appendMessage({
      sessionId: session.id,
      type: 'assistant',
      payload: { text: 'hello' },
    });
    const m2 = await messages.appendMessage({
      sessionId: session.id,
      type: 'tool_use',
      payload: { name: 'Read' },
    });
    expect(m1.seq).toBe(0);
    expect(m2.seq).toBe(1);
    const listed = await messages.listMessages(session.id);
    expect(listed.map((m) => m.seq)).toEqual([0, 1]);
  });

  it('enforces foreign keys for sessions', async () => {
    const { db } = getDb();
    const sessions = createSessionRepository(db);
    await expect(
      sessions.create({
        workspaceId: '00000000-0000-4000-8000-000000000099',
        profileId: '00000000-0000-4000-8000-000000000098',
        profileSnapshot: {},
        prompt: 'nope',
      }),
    ).rejects.toThrow();
  });
});

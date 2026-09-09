import { describe, expect, it } from 'vitest';
import { stagedImprovementCreateSchema } from '@claude-assistant/shared';
import { createAgentProfileRepository } from '../agentProfiles.js';
import { createAnalysisRepository } from '../analyses.js';
import { createSessionRepository } from '../sessions.js';
import { createStagedImprovementRepository } from '../stagedImprovements.js';
import { createWorkspaceRepository } from '../workspaces.js';
import { useMigratedTestDb } from './helpers.js';

describe('analysis + staged improvements', () => {
  const getDb = useMigratedTestDb();

  async function seedSession(db: ReturnType<typeof getDb>['db']) {
    const workspaces = createWorkspaceRepository(db);
    const profiles = createAgentProfileRepository(db);
    const sessions = createSessionRepository(db);
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
      permissionMode: 'default',
      settingSources: ['user'],
    });
    const session = await sessions.create({
      workspaceId: workspace.id,
      profileId: profile.id,
      profileSnapshot: profile,
      prompt: 'ship it',
    });
    return { workspace, session };
  }

  it('creates analyses and transitions improvement status', async () => {
    const { db } = getDb();
    const { workspace, session } = await seedSession(db);
    const analyses = createAnalysisRepository(db);
    const improvements = createStagedImprovementRepository(db);

    const analysis = await analyses.create({
      sessionIds: [session.id],
      model: 'claude-sonnet-4-20250514',
      effort: 'high',
    });
    const staged = await improvements.create({
      analysisId: analysis.id,
      category: 'project_skill_agent',
      scope: 'project',
      workspaceId: workspace.id,
      targetPath: '.claude/skills/ship.md',
      rationale: 'Missing skill',
      currentContent: '',
      proposedContent: '# Ship',
      diff: '+# Ship',
    });
    expect(staged.status).toBe('staged');
    const applied = await improvements.setStatus(staged.id, 'applied');
    expect(applied?.status).toBe('applied');
    expect(applied?.appliedAt).toBeTruthy();

    const discarded = await improvements.create({
      analysisId: analysis.id,
      category: 'user_skill_agent',
      scope: 'user',
      targetPath: '~/.claude/skills/plan.md',
      rationale: 'Generic plan skill',
      currentContent: 'old',
      proposedContent: 'new',
      diff: '-old\n+new',
    });
    const afterDiscard = await improvements.setStatus(discarded.id, 'discarded');
    expect(afterDiscard?.status).toBe('discarded');
  });

  it('enforces project scope requires workspaceId', () => {
    expect(() =>
      stagedImprovementCreateSchema.parse({
        analysisId: '00000000-0000-4000-8000-000000000001',
        category: 'project_skill_agent',
        scope: 'project',
        targetPath: 'x',
        rationale: 'r',
        currentContent: '',
        proposedContent: 'y',
        diff: '+y',
      }),
    ).toThrow(/workspaceId/i);
  });
});

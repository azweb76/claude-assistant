import { mkdtempSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDb } from '../../../db/client.js';
import { migrateDb } from '../../../db/migrate.js';
import { createAnalysisRepository } from '../../../db/repositories/analyses.js';
import { createStagedImprovementRepository } from '../../../db/repositories/stagedImprovements.js';
import { createWorkspaceRepository } from '../../../db/repositories/workspaces.js';
import { applyImprovement, discardImprovement } from '../staging.js';

describe('staging apply/discard', () => {
  it('apply writes file and discard leaves disk untouched', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'stage-'));
    const workspacePath = path.join(root, 'repo');
    mkdirSync(workspacePath, { recursive: true });
    const { db, close } = createDb({ path: path.join(root, 't.db') });
    migrateDb(db);
    try {
      const workspace = await createWorkspaceRepository(db).create({
        name: 'acme/demo',
        remote: 'https://github.com/acme/demo.git',
        owner: 'acme',
        repo: 'demo',
        defaultBranch: 'main',
        localPath: workspacePath,
      });
      const analysis = await createAnalysisRepository(db).create({
        sessionIds: ['00000000-0000-4000-8000-000000000001'],
        model: 'claude-sonnet-4-20250514',
        effort: 'high',
      });
      const target = path.join(workspacePath, 'CLAUDE.md');
      const item = await createStagedImprovementRepository(db).create({
        analysisId: analysis.id,
        category: 'claude_instructions',
        scope: 'project',
        workspaceId: workspace.id,
        targetPath: target,
        rationale: 'add guidance',
        currentContent: '',
        proposedContent: '# Hello',
        diff: '+# Hello',
      });

      const discardedSibling = await createStagedImprovementRepository(db).create({
        analysisId: analysis.id,
        category: 'claude_instructions',
        scope: 'project',
        workspaceId: workspace.id,
        targetPath: path.join(workspacePath, 'OTHER.md'),
        rationale: 'skip',
        currentContent: '',
        proposedContent: 'nope',
        diff: '+nope',
      });
      await discardImprovement(db, discardedSibling.id);
      expect(existsSync(path.join(workspacePath, 'OTHER.md'))).toBe(false);

      const applied = await applyImprovement(db, item.id);
      expect(applied.status).toBe('applied');
      expect(readFileSync(target, 'utf8')).toBe('# Hello');
      const again = await applyImprovement(db, item.id);
      expect(again.status).toBe('applied');
    } finally {
      close();
    }
  });
});

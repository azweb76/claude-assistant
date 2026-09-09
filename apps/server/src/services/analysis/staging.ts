import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import type { Finding, StagedImprovement } from '@claude-assistant/shared';
import type { AppDatabase } from '../../db/client.js';
import { createStagedImprovementRepository } from '../../db/repositories/stagedImprovements.js';
import { createWorkspaceRepository } from '../../db/repositories/workspaces.js';
import { ValidationError } from '../../lib/errors.js';
import { computeDiff, routeFinding } from './scopeRouter.js';

export async function stageFindings(
  db: AppDatabase,
  analysisId: string,
  findings: Finding[],
): Promise<StagedImprovement[]> {
  const improvements = createStagedImprovementRepository(db);
  const workspaces = createWorkspaceRepository(db);
  const staged: StagedImprovement[] = [];

  for (const finding of findings) {
    const workspace = finding.workspaceId ? await workspaces.getById(finding.workspaceId) : null;
    const routed = routeFinding(finding, workspace?.localPath);
    let currentContent = '';
    try {
      if (existsSync(routed.targetPath)) {
        currentContent = readFileSync(routed.targetPath, 'utf8');
      }
    } catch {
      currentContent = '';
    }
    const created = await improvements.create({
      analysisId,
      category: routed.category,
      scope: routed.scope,
      workspaceId: routed.workspaceId,
      targetPath: routed.targetPath,
      rationale: routed.rationale,
      currentContent,
      proposedContent: routed.proposedContent,
      diff: computeDiff(currentContent, routed.proposedContent),
      status: 'staged',
    });
    staged.push(created);
  }
  return staged;
}

function assertSafeTarget(
  targetPath: string,
  scope: 'user' | 'project',
  workspacePath?: string | null,
) {
  const resolved = path.resolve(targetPath);
  if (scope === 'user') {
    const root = path.resolve(path.join(homedir(), '.claude'));
    if (!resolved.startsWith(root + path.sep) && resolved !== root) {
      throw new ValidationError('Refusing to write outside ~/.claude');
    }
  } else {
    if (!workspacePath) {
      throw new ValidationError('Missing workspace path for project scope write');
    }
    const root = path.resolve(workspacePath);
    if (!resolved.startsWith(root + path.sep) && resolved !== root) {
      throw new ValidationError('Refusing to write outside workspace');
    }
  }
}

export async function applyImprovement(
  db: AppDatabase,
  improvementId: string,
): Promise<StagedImprovement> {
  const repo = createStagedImprovementRepository(db);
  const item = await repo.getById(improvementId);
  if (!item) {
    throw new ValidationError('Improvement not found');
  }
  if (item.status === 'applied') {
    return item;
  }
  let workspacePath: string | null = null;
  if (item.scope === 'project' && item.workspaceId) {
    const workspace = await createWorkspaceRepository(db).getById(item.workspaceId);
    workspacePath = workspace?.localPath ?? null;
  }
  assertSafeTarget(item.targetPath, item.scope, workspacePath);
  mkdirSync(path.dirname(item.targetPath), { recursive: true });
  writeFileSync(item.targetPath, item.proposedContent, 'utf8');
  const updated = await repo.setStatus(improvementId, 'applied');
  return updated!;
}

export async function discardImprovement(
  db: AppDatabase,
  improvementId: string,
): Promise<StagedImprovement> {
  const repo = createStagedImprovementRepository(db);
  const item = await repo.getById(improvementId);
  if (!item) {
    throw new ValidationError('Improvement not found');
  }
  if (item.status === 'discarded') {
    return item;
  }
  const updated = await repo.setStatus(improvementId, 'discarded');
  return updated!;
}

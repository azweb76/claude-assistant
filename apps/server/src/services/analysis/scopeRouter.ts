import { homedir } from 'node:os';
import path from 'node:path';
import type { Finding, StagedImprovementCreate } from '@claude-assistant/shared';
import { ValidationError } from '../../lib/errors.js';

export type RoutedFinding = {
  category: StagedImprovementCreate['category'];
  scope: StagedImprovementCreate['scope'];
  workspaceId?: string | null;
  targetPath: string;
  rationale: string;
  proposedContent: string;
};

export function routeFinding(finding: Finding, workspaceLocalPath?: string | null): RoutedFinding {
  if (finding.scopeHint === 'generic' || finding.category === 'user_skill_agent') {
    if (finding.category === 'project_skill_agent') {
      throw new ValidationError('Generic findings cannot use project_skill_agent category');
    }
    return {
      category:
        finding.category === 'claude_instructions' ? 'claude_instructions' : 'user_skill_agent',
      scope: 'user',
      workspaceId: null,
      targetPath: path.join(homedir(), '.claude', finding.target.replace(/^\/*/, '')),
      rationale: finding.rationale,
      proposedContent: finding.proposedContent,
    };
  }

  if (finding.scopeHint === 'project-specific' || finding.category === 'project_skill_agent') {
    if (!workspaceLocalPath || !finding.workspaceId) {
      throw new ValidationError('Project-specific findings require workspaceId and local path');
    }
    return {
      category:
        finding.category === 'claude_instructions' ? 'claude_instructions' : 'project_skill_agent',
      scope: 'project',
      workspaceId: finding.workspaceId,
      targetPath: path.join(workspaceLocalPath, '.claude', finding.target.replace(/^\/*/, '')),
      rationale: finding.rationale,
      proposedContent: finding.proposedContent,
    };
  }

  if (finding.scopeHint === 'instructions-user') {
    return {
      category: 'claude_instructions',
      scope: 'user',
      workspaceId: null,
      targetPath: path.join(homedir(), '.claude', finding.target || 'CLAUDE.md'),
      rationale: finding.rationale,
      proposedContent: finding.proposedContent,
    };
  }

  // instructions-project
  if (!workspaceLocalPath || !finding.workspaceId) {
    throw new ValidationError('Project instructions require workspaceId and local path');
  }
  return {
    category: 'claude_instructions',
    scope: 'project',
    workspaceId: finding.workspaceId,
    targetPath: path.join(workspaceLocalPath, finding.target || 'CLAUDE.md'),
    rationale: finding.rationale,
    proposedContent: finding.proposedContent,
  };
}

export function computeDiff(currentContent: string, proposedContent: string): string {
  const currentLines = currentContent.split('\n');
  const proposedLines = proposedContent.split('\n');
  const lines: string[] = [];
  const max = Math.max(currentLines.length, proposedLines.length);
  for (let i = 0; i < max; i += 1) {
    const a = currentLines[i];
    const b = proposedLines[i];
    if (a === b) continue;
    if (a !== undefined) lines.push(`-${a}`);
    if (b !== undefined) lines.push(`+${b}`);
  }
  return lines.join('\n');
}

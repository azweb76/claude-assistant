import { describe, expect, it } from 'vitest';
import { routeFinding, computeDiff } from '../scopeRouter.js';
import { ValidationError } from '../../../lib/errors.js';

describe('scope router', () => {
  it('routes generic skills to user scope', () => {
    const routed = routeFinding({
      category: 'user_skill_agent',
      scopeHint: 'generic',
      rationale: 'plan skill',
      target: 'skills/plan.md',
      proposedContent: '# plan',
    });
    expect(routed.scope).toBe('user');
    expect(routed.targetPath).toContain('.claude');
  });

  it('rejects project category with generic scope hint', () => {
    expect(() =>
      routeFinding({
        category: 'project_skill_agent',
        scopeHint: 'generic',
        rationale: 'x',
        target: 'skills/x.md',
        proposedContent: 'x',
      }),
    ).toThrow(ValidationError);
  });

  it('computes a simple diff', () => {
    expect(computeDiff('a\nb', 'a\nc')).toContain('-b');
    expect(computeDiff('a\nb', 'a\nc')).toContain('+c');
  });
});

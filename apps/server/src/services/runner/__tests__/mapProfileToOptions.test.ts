import { describe, expect, it } from 'vitest';
import type { AgentProfile } from '@claude-assistant/shared';
import { ValidationError } from '../../../lib/errors.js';
import { mapProfileToOptions } from '../mapProfileToOptions.js';

const baseProfile: AgentProfile = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Test',
  model: 'claude-sonnet-4-20250514',
  effort: 'medium',
  permissionMode: 'default',
  allowedTools: ['Read'],
  disallowedTools: ['Bash'],
  skills: 'all',
  agents: null,
  settingSources: ['project'],
  maxTurns: 10,
  maxBudgetUsd: 1,
  extraSystemPrompt: 'Be careful',
  isBuiltIn: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('mapProfileToOptions', () => {
  it('maps a default profile and always includes user settingSource', () => {
    const options = mapProfileToOptions({
      profile: baseProfile,
      cwd: '/tmp/ws',
      allowBypassPermissions: false,
    });
    expect(options.model).toBe(baseProfile.model);
    expect(options.allowedTools).toEqual(['Read']);
    expect(options.disallowedTools).toEqual(['Bash']);
    expect(options.cwd).toBe('/tmp/ws');
    expect(options.settingSources).toContain('user');
    expect(options.settingSources).toContain('project');
    expect(options.systemPrompt).toBe('Be careful');
  });

  it('gates bypassPermissions on the setting', () => {
    expect(() =>
      mapProfileToOptions({
        profile: { ...baseProfile, permissionMode: 'bypassPermissions' },
        cwd: '/tmp/ws',
        allowBypassPermissions: false,
      }),
    ).toThrow(ValidationError);

    const options = mapProfileToOptions({
      profile: { ...baseProfile, permissionMode: 'bypassPermissions' },
      cwd: '/tmp/ws',
      allowBypassPermissions: true,
    });
    expect(options.allowDangerouslySkipPermissions).toBe(true);
  });
});

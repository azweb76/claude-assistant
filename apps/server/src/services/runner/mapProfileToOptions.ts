import type { AgentProfile, MappedSdkOptions } from '@claude-assistant/shared';
import { ValidationError } from '../../lib/errors.js';

export type MapProfileInput = {
  profile: AgentProfile;
  cwd: string;
  allowBypassPermissions: boolean;
  resume?: string;
};

export function mapProfileToOptions(input: MapProfileInput): MappedSdkOptions {
  const { profile, cwd, allowBypassPermissions, resume } = input;

  if (profile.permissionMode === 'bypassPermissions' && !allowBypassPermissions) {
    throw new ValidationError(
      'bypassPermissions is disabled in app settings (allowBypassPermissions=false)',
    );
  }

  const settingSources = Array.from(new Set(['user' as const, ...profile.settingSources]));

  const options: MappedSdkOptions = {
    model: profile.model,
    effort: profile.effort,
    permissionMode: profile.permissionMode,
    settingSources,
    cwd,
  };

  if (profile.permissionMode === 'bypassPermissions') {
    options.allowDangerouslySkipPermissions = true;
  }
  if (profile.allowedTools) {
    options.allowedTools = profile.allowedTools;
  }
  if (profile.disallowedTools) {
    options.disallowedTools = profile.disallowedTools;
  }
  if (profile.skills !== null && profile.skills !== undefined) {
    options.skills = profile.skills;
  }
  if (profile.agents) {
    options.agents = profile.agents;
  }
  if (profile.maxTurns != null) {
    options.maxTurns = profile.maxTurns;
  }
  if (profile.maxBudgetUsd != null) {
    options.maxBudgetUsd = profile.maxBudgetUsd;
  }
  if (profile.extraSystemPrompt) {
    options.systemPrompt = profile.extraSystemPrompt;
  }
  if (resume) {
    options.resume = resume;
  }

  return options;
}

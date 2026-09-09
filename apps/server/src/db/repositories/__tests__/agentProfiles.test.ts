import { describe, expect, it } from 'vitest';
import { agentProfileCreateSchema } from '@claude-assistant/shared';
import { createAgentProfileRepository } from '../agentProfiles.js';
import { useMigratedTestDb } from './helpers.js';

const baseProfile = {
  name: 'Custom',
  model: 'claude-sonnet-4-20250514',
  effort: 'medium' as const,
  permissionMode: 'default' as const,
  settingSources: ['user' as const],
};

describe('agent profile repository', () => {
  const getDb = useMigratedTestDb();

  it('creates, updates, lists, and deletes profiles with JSON round-trip', async () => {
    const { db } = getDb();
    const repo = createAgentProfileRepository(db);
    const created = await repo.create({
      ...baseProfile,
      allowedTools: ['Read', 'Edit'],
      skills: ['plan'],
      agents: [{ name: 'reviewer' }],
    });
    expect(created.allowedTools).toEqual(['Read', 'Edit']);
    expect(created.skills).toEqual(['plan']);
    const updated = await repo.update(created.id, { effort: 'high' });
    expect(updated?.effort).toBe('high');
    expect(await repo.list()).toHaveLength(1);
    expect(await repo.delete(created.id)).toBe(true);
  });

  it('rejects invalid enums and protects built-ins', async () => {
    expect(() => agentProfileCreateSchema.parse({ ...baseProfile, effort: 'nope' })).toThrow();
    const { db } = getDb();
    const repo = createAgentProfileRepository(db);
    const builtIn = await repo.create({ ...baseProfile, name: 'Built', isBuiltIn: true });
    await expect(repo.delete(builtIn.id)).rejects.toThrow(/built-in/i);
  });
});

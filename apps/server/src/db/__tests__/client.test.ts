import { describe, expect, it } from 'vitest';
import { createDb } from '../client.js';

describe('createDb', () => {
  it('creates an in-memory client and runs a trivial query', () => {
    const { sqlite, close } = createDb({ path: ':memory:' });
    try {
      const row = sqlite.prepare('select 1 as value').get() as { value: number };
      expect(row.value).toBe(1);
      const fk = sqlite.pragma('foreign_keys', { simple: true });
      expect(fk).toBe(1);
    } finally {
      close();
    }
  });
});

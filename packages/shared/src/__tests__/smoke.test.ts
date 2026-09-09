import { describe, expect, it } from 'vitest';
import { APP_NAME } from '../constants.js';

describe('shared smoke', () => {
  it('exports APP_NAME', () => {
    expect(APP_NAME).toBe('claude-assistant');
  });
});

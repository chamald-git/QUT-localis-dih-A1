import { describe, it, expect } from '@jest/globals';
import { VALID_ROLES, roleFraming, ROLE_FRAMINGS } from './role-framings.js';

// Brief unit test (DIH-68). Role validation is backlog work (DIH-1) — for now
// it just falls back to the government framing for an unknown role.
describe('role framings', () => {
  it('exposes exactly the four roles, including dmo', () => {
    expect([...VALID_ROLES].sort()).toEqual(['admin', 'dmo', 'government', 'operator']);
  });

  it('returns a non-empty, marketing-flavoured framing for dmo', () => {
    expect(roleFraming('dmo')).toMatch(/marketing/i);
  });

  it('falls back to the government framing for an unknown role', () => {
    expect(roleFraming('nope')).toBe(ROLE_FRAMINGS.government);
  });
});

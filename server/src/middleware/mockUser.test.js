import { describe, it, expect, jest } from '@jest/globals';
import { mockUser } from './mockUser.js';

// Brief unit test. Phase-1 auth stand-in (real JWT is backlog work, DIH-1):
// sets req.user.role from the x-user-role header, defaulting to government.
const run = (headers = {}) => {
  const req = { headers };
  const next = jest.fn();
  mockUser(req, {}, next);
  return { req, next };
};

describe('mockUser middleware', () => {
  it('sets req.user.role from the x-user-role header and calls next()', () => {
    const { req, next } = run({ 'x-user-role': 'operator' });
    expect(req.user).toEqual({ role: 'operator' });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('defaults role to government when the header is absent', () => {
    const { req } = run();
    expect(req.user.role).toBe('government');
  });
});

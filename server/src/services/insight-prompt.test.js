import { describe, it, expect } from '@jest/globals';
import { userPrompt } from './insight-prompt.js';

const APPLIED = {
  regions: ['Cairns', 'Noosa'],
  metrics: ['occupancy', 'adr'],
  period: { preset: 'last_90_days', days: 90 },
};

describe('userPrompt', () => {
  it('includes the role framing, regions, metrics, period days and the JSON contract', () => {
    const p = userPrompt('dmo', APPLIED);
    expect(p).toMatch(/marketing/i); // dmo framing
    expect(p).toContain('Cairns');
    expect(p).toContain('Noosa');
    expect(p).toContain('occupancy');
    expect(p).toContain('90'); // period.days
    expect(p).toContain('narrative');
    expect(p).toContain('charts');
  });

  it('falls back to the government framing for an unknown role', () => {
    expect(userPrompt('nope', APPLIED)).toMatch(/government tourism officer/i);
  });
});

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

  it('omits spend guidance when spend is not a requested metric', () => {
    const p = userPrompt('government', APPLIED);
    expect(p).not.toContain('no_txns');
    expect(p).not.toMatch(/spend by category|spending CATEGORY/i);
  });

  it('adds the spend dataset + horizontal-bar guidance when spend is requested', () => {
    const p = userPrompt('government', { ...APPLIED, metrics: ['occupancy', 'spend'] });
    expect(p).toContain('"spend"'); // names the second dataset
    expect(p).toContain('no_txns');
    expect(p).toContain('category');
    expect(p).toMatch(/horizontal bar/i);
  });
});

import { buildInsightsQuery } from './buildInsightsQuery.js';

describe('buildInsightsQuery', () => {
  test('joins regions and metrics as CSV and includes the period', () => {
    expect(
      buildInsightsQuery({
        regions: ['Cairns', 'Noosa'],
        metrics: ['occupancy', 'adr'],
        period: 'last_90_days',
      })
    ).toBe('?regions=Cairns%2CNoosa&metrics=occupancy%2Cadr&period=last_90_days');
  });

  test('omits empty arrays and an undefined period', () => {
    expect(buildInsightsQuery({ regions: [], metrics: [] })).toBe('');
  });

  test('handles no arguments', () => {
    expect(buildInsightsQuery()).toBe('');
  });
});

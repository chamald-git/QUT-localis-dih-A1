import { describe, it, expect } from '@jest/globals';
import { topSpendCategories } from './insights.repository.js';

// Two regions, four categories — totals across regions: B=300, A=140, C=40, D=5.
const rows = [
  { region: 'Cairns', category: 'A', spend: 100 },
  { region: 'Cairns', category: 'B', spend: 250 },
  { region: 'Cairns', category: 'C', spend: 40 },
  { region: 'Cairns', category: 'D', spend: 5 },
  { region: 'Noosa', category: 'A', spend: 40 },
  { region: 'Noosa', category: 'B', spend: 50 },
];

describe('topSpendCategories', () => {
  it('keeps the N categories with the highest TOTAL spend across regions', () => {
    const out = topSpendCategories(rows, 2);
    const kept = new Set(out.map((r) => r.category));
    expect(kept).toEqual(new Set(['A', 'B'])); // B=300, A=140 beat C=40, D=5
    expect(out).toHaveLength(4); // A and B each appear once per region (2 regions)
  });

  it('preserves the input row order and shape', () => {
    const out = topSpendCategories(rows, 2);
    expect(out[0]).toEqual({ region: 'Cairns', category: 'A', spend: 100 });
    expect(out.map((r) => r.category)).toEqual(['A', 'B', 'A', 'B']);
  });

  it('returns everything when n exceeds the category count, and tolerates null spend', () => {
    const withNull = [...rows, { region: 'Noosa', category: 'E', spend: null }];
    const out = topSpendCategories(withNull, 99);
    expect(new Set(out.map((r) => r.category))).toEqual(new Set(['A', 'B', 'C', 'D', 'E']));
  });
});

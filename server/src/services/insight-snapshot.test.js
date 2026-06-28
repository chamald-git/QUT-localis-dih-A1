import { describe, it, expect } from '@jest/globals';
import { buildSnapshot } from './insight-snapshot.js';

// Two regions × two dates, wide rows like queryInsightData returns.
const rows = [
  { region: 'Cairns', date: '2024-06-01', occupancy_pct: 0.70, adr: 300, avg_length_of_stay: 4.0 },
  { region: 'Cairns', date: '2024-06-02', occupancy_pct: 0.72, adr: 320, avg_length_of_stay: 4.2 },
  { region: 'Gold Coast', date: '2024-06-01', occupancy_pct: 0.60, adr: 310, avg_length_of_stay: 3.0 },
  { region: 'Gold Coast', date: '2024-06-02', occupancy_pct: 0.58, adr: 314, avg_length_of_stay: 2.8 },
];

describe('buildSnapshot', () => {
  it('averages each metric per region over the period', () => {
    const snap = buildSnapshot(rows, ['occupancy']);
    expect(snap).toHaveLength(1);
    const occ = snap[0];
    expect(occ.metric).toBe('occupancy');
    const byRegion = Object.fromEntries(occ.regions.map((r) => [r.region, r.value]));
    expect(byRegion.Cairns).toBeCloseTo(0.71);
    expect(byRegion['Gold Coast']).toBeCloseTo(0.59);
  });

  it('records the per-metric value range for colour normalisation', () => {
    const [occ] = buildSnapshot(rows, ['occupancy']);
    expect(occ.scale.min).toBeCloseTo(0.59);
    expect(occ.scale.max).toBeCloseTo(0.71);
  });

  it('returns one entry per requested snapshot metric, in order', () => {
    const snap = buildSnapshot(rows, ['occupancy', 'adr', 'length_of_stay']);
    expect(snap.map((s) => s.metric)).toEqual(['occupancy', 'adr', 'length_of_stay']);
  });

  it('excludes spend (region×category, no single regional value)', () => {
    expect(buildSnapshot(rows, ['spend']).map((s) => s.metric)).toEqual([]);
    // mixed request keeps only the eligible metric
    expect(buildSnapshot(rows, ['spend', 'occupancy']).map((s) => s.metric)).toEqual(['occupancy']);
  });

  it('ignores unknown metrics', () => {
    expect(buildSnapshot(rows, ['bananas'])).toEqual([]);
  });

  it('skips null cells and omits a metric with no numeric data', () => {
    const sparse = [
      { region: 'Cairns', date: '2024-06-01', occupancy_pct: null, adr: 300 },
      { region: 'Cairns', date: '2024-06-02', occupancy_pct: 0.8, adr: null },
    ];
    const snap = buildSnapshot(sparse, ['occupancy', 'length_of_stay']);
    // occupancy averages only the non-null cell; length_of_stay has no column → omitted
    expect(snap).toHaveLength(1);
    expect(snap[0].metric).toBe('occupancy');
    expect(snap[0].regions[0].value).toBeCloseTo(0.8);
  });

  it('is safe on empty / non-array input', () => {
    expect(buildSnapshot([], ['occupancy'])).toEqual([]);
    expect(buildSnapshot(undefined, undefined)).toEqual([]);
  });
});

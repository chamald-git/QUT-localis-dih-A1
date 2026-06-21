import { describe, it, expect } from '@jest/globals';
import { isValidChartSpec, parseInsightResponse } from './insight-response.js';

const ctx = {
  appliedFilters: { metrics: ['occupancy', 'adr'] },
  data: [{ region: 'Cairns', date: '2024-06-02', occupancy_pct: 0.71, adr: 312 }],
};
const goodSpec = { mark: 'line', encoding: { x: { field: 'date' }, y: { field: 'occupancy_pct' } } };

describe('isValidChartSpec', () => {
  it('accepts a spec with a mark and x/y encoding', () => {
    expect(isValidChartSpec(goodSpec)).toBe(true);
  });
  it('rejects a spec missing mark, encoding, or object', () => {
    expect(isValidChartSpec({ encoding: { x: {}, y: {} } })).toBe(false);
    expect(isValidChartSpec({ mark: 'line' })).toBe(false);
    expect(isValidChartSpec(null)).toBe(false);
  });
  it('accepts a layered (annotated) spec with marks + shared or per-layer x/y', () => {
    expect(
      isValidChartSpec({
        encoding: { x: { field: 'date' }, y: { field: 'occupancy_pct' } },
        layer: [{ mark: 'line' }, { mark: 'point' }],
      })
    ).toBe(true);
    expect(
      isValidChartSpec({ layer: [{ mark: 'line', encoding: { x: {}, y: {} } }, { mark: 'rule' }] })
    ).toBe(true);
  });
  it('rejects a layered spec with a layer missing a mark, or no x/y anywhere, or empty', () => {
    expect(isValidChartSpec({ layer: [{ mark: 'line', encoding: { x: {}, y: {} } }, { encoding: {} }] })).toBe(false);
    expect(isValidChartSpec({ layer: [{ mark: 'line' }] })).toBe(false);
    expect(isValidChartSpec({ layer: [] })).toBe(false);
  });
});

describe('parseInsightResponse', () => {
  it('keeps valid charts for requested metrics and attaches the data rows', () => {
    const raw = { narrative: 'hi', charts: [{ metric: 'occupancy', title: 'T', caption: 'C', chartSpec: goodSpec }] };
    const out = parseInsightResponse(raw, ctx);
    expect(out.narrative).toBe('hi');
    expect(out.charts).toHaveLength(1);
    expect(out.charts[0]).toMatchObject({ metric: 'occupancy', title: 'T', caption: 'C' });
    expect(out.charts[0].data).toBe(ctx.data);
  });
  it('drops non-requested metrics + invalid specs, and coerces a non-string narrative to ""', () => {
    const raw = {
      narrative: { not: 'a string' },
      charts: [
        { metric: 'spend', chartSpec: goodSpec }, // not requested
        { metric: 'adr', chartSpec: { mark: 'line' } }, // invalid spec
      ],
    };
    const out = parseInsightResponse(raw, ctx);
    expect(out.narrative).toBe('');
    expect(out.charts).toHaveLength(0);
  });
});

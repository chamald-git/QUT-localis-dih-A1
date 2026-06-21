import { applyValueFormat } from './applyValueFormat.js';

describe('applyValueFormat', () => {
  test('sets y axis format + matching tooltip format, preserving other axis props', () => {
    const out = applyValueFormat(
      {
        encoding: {
          y: { field: 'occupancy_pct', axis: { title: null } },
          tooltip: [{ field: 'occupancy_pct' }, { field: 'region' }],
        },
      },
      'occupancy_pct',
      '.0%'
    );
    expect(out.encoding.y.axis.format).toBe('.0%');
    expect(out.encoding.y.axis.title).toBeNull();
    expect(out.encoding.tooltip[0].format).toBe('.0%');
    expect(out.encoding.tooltip[1].format).toBeUndefined();
  });

  test('walks layered specs without mutating the input', () => {
    const input = { encoding: { y: { field: 'occupancy_pct' } }, layer: [{ mark: 'line' }] };
    const out = applyValueFormat(input, 'occupancy_pct', '.0%');
    expect(out.encoding.y.axis.format).toBe('.0%');
    expect(input.encoding.y.axis).toBeUndefined();
  });

  test('no-op when field or format is missing', () => {
    expect(applyValueFormat({ a: 1 }, null, null)).toEqual({ a: 1 });
  });
});

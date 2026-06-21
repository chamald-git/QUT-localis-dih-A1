import { applyAxisStyle } from './applyAxisStyle.js';

describe('applyAxisStyle', () => {
  test('sparse monthly date labels, no gridlines, no titles', () => {
    const out = applyAxisStyle({ encoding: { x: { field: 'date' }, y: { field: 'adr' } } });
    expect(out.encoding.x.axis).toMatchObject({
      title: null,
      grid: false,
      tickCount: 'month',
      format: '%b %y',
    });
    expect(out.encoding.y.axis).toMatchObject({ title: null, grid: false });
  });

  test('walks layers, preserves other axis props, no mutation', () => {
    const input = {
      layer: [{ mark: 'line', encoding: { x: { field: 'date', axis: { labelColor: 'red' } }, y: { field: 'adr' } } }],
    };
    const out = applyAxisStyle(input);
    expect(out.layer[0].encoding.x.axis.labelColor).toBe('red');
    expect(out.layer[0].encoding.x.axis.grid).toBe(false);
    expect(input.layer[0].encoding.x.axis.grid).toBeUndefined();
  });
});

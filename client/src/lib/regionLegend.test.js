import { colorScaleFor, applyColorScale, REGION_COLORS } from './regionLegend.js';

describe('colorScaleFor', () => {
  test('maps known regions to their colours, in order', () => {
    const scale = colorScaleFor(['Cairns', 'Noosa']);
    expect(scale.domain).toEqual(['Cairns', 'Noosa']);
    expect(scale.range).toEqual([REGION_COLORS.Cairns, REGION_COLORS.Noosa]);
  });
});

describe('applyColorScale', () => {
  test('pins the scale on top-level + layer color encodings, without mutating input', () => {
    const input = {
      encoding: { color: { field: 'region' } },
      layer: [{ mark: 'line', encoding: { color: { field: 'region' } } }],
    };
    const scale = { domain: ['Cairns'], range: ['#4c78a8'] };
    const out = applyColorScale(input, scale);
    expect(out.encoding.color.scale).toEqual(scale);
    expect(out.layer[0].encoding.color.scale).toEqual(scale);
    expect(input.encoding.color.scale).toBeUndefined();
  });

  test('no-op when there is no color encoding', () => {
    const out = applyColorScale({ encoding: { x: { field: 'date' } } }, { domain: [], range: [] });
    expect(out.encoding.color).toBeUndefined();
  });
});

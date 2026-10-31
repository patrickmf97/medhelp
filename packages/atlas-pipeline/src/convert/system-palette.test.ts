import { describe, expect, it } from 'vitest';

import { DEFAULT_SYSTEM_COLOR, SYSTEM_PALETTE, colorForGroupKey, hexToLinearRgb } from './system-palette';

describe('colorForGroupKey', () => {
  it('returns the real skeletal-system color for the real manifest groupKey string', () => {
    expect(colorForGroupKey('1: Skeletal system')).toBe(SYSTEM_PALETTE['1: Skeletal system']);
    expect(colorForGroupKey('1: Skeletal system')).toBe('#E8DCC4');
  });

  it('gives muscular system and muscular insertions the same deep-red color', () => {
    expect(colorForGroupKey('4: Muscular system')).toBe('#9C3B3B');
    expect(colorForGroupKey('2: Muscular insertions')).toBe('#9C3B3B');
  });

  it('falls back to the neutral default for an unrecognized groupKey', () => {
    expect(colorForGroupKey('not a real system')).toBe(DEFAULT_SYSTEM_COLOR);
  });

  it('falls back to the neutral default when groupKey is undefined', () => {
    expect(colorForGroupKey(undefined)).toBe(DEFAULT_SYSTEM_COLOR);
  });

  it('maps the real "unmapped" groupKey to the neutral default color', () => {
    expect(colorForGroupKey('unmapped')).toBe(DEFAULT_SYSTEM_COLOR);
  });
});

describe('hexToLinearRgb', () => {
  it('converts pure white to linear [1, 1, 1]', () => {
    expect(hexToLinearRgb('#FFFFFF')).toEqual([1, 1, 1]);
  });

  it('converts pure black to linear [0, 0, 0]', () => {
    expect(hexToLinearRgb('#000000')).toEqual([0, 0, 0]);
  });

  it('darkens a mid-gray sRGB value when converted to linear (sRGB gamma is not 1:1)', () => {
    const [r, g, b] = hexToLinearRgb('#808080');
    // sRGB 0.5 -> linear ~0.214, well below 0.5.
    expect(r).toBeCloseTo(0.2158, 3);
    expect(r).toBe(g);
    expect(g).toBe(b);
  });

  it('throws on an invalid hex string', () => {
    expect(() => hexToLinearRgb('not-a-color')).toThrow();
  });
});

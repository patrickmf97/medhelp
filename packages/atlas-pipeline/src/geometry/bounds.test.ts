import { describe, expect, it } from 'vitest';

import { computeBounds } from './bounds';

describe('computeBounds', () => {
  it('computes deterministic min/max for a simple triangle', () => {
    const bounds = computeBounds([
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
    ]);
    expect(bounds).toEqual({ min: [0, 0, 0], max: [1, 1, 0] });
  });

  it('returns null bounds for an empty vertex list', () => {
    expect(computeBounds([])).toBeNull();
  });

  it('handles negative coordinates correctly', () => {
    const bounds = computeBounds([
      [-5, 2, -1],
      [3, -4, 10],
    ]);
    expect(bounds).toEqual({ min: [-5, -4, -1], max: [3, 2, 10] });
  });

  it('is deterministic regardless of input order', () => {
    const a = computeBounds([
      [1, 2, 3],
      [-1, -2, -3],
      [0, 0, 0],
    ]);
    const b = computeBounds([
      [0, 0, 0],
      [-1, -2, -3],
      [1, 2, 3],
    ]);
    expect(a).toEqual(b);
  });
});

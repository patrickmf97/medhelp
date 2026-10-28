import { describe, expect, it } from 'vitest';

import { detectCycles } from './detect-cycles';

describe('detectCycles', () => {
  it('returns no cycles for a valid tree', () => {
    const nodes = [
      { id: 'root', parentId: null },
      { id: 'a', parentId: 'root' },
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: 'root' },
    ];
    expect(detectCycles(nodes)).toEqual([]);
  });

  it('detects a structure that is its own ancestor (direct self-parent)', () => {
    const nodes = [{ id: 'a', parentId: 'a' }];
    const cycles = detectCycles(nodes);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toContain('a');
  });

  it('detects an indirect cycle (a -> b -> c -> a)', () => {
    const nodes = [
      { id: 'a', parentId: 'c' },
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: 'b' },
    ];
    const cycles = detectCycles(nodes);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toEqual(expect.arrayContaining(['a', 'b', 'c']));
  });

  it('tolerates a parentId that points at a node outside the given set (treated as a root)', () => {
    const nodes = [{ id: 'a', parentId: 'missing-parent' }];
    expect(detectCycles(nodes)).toEqual([]);
  });
});

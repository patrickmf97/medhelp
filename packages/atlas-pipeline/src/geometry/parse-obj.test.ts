import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseObj } from './parse-obj';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, '..', '..', 'fixtures', 'geometry');

describe('parseObj', () => {
  it('parses vertex positions from a valid triangle', () => {
    const vertices = parseObj(readFileSync(join(fixtures, 'triangle.obj'), 'utf-8'));
    expect(vertices).toEqual([
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
    ]);
  });

  it('parses a non-finite vertex as-is (NaN), without silently coercing it', () => {
    const vertices = parseObj(readFileSync(join(fixtures, 'degenerate.obj'), 'utf-8'));
    expect(vertices).toHaveLength(3);
    expect(Number.isFinite(vertices[1]![1])).toBe(false);
  });

  it('returns an empty vertex list for a mesh with no "v" lines', () => {
    const vertices = parseObj(readFileSync(join(fixtures, 'empty.obj'), 'utf-8'));
    expect(vertices).toEqual([]);
  });

  it('ignores face lines and comments', () => {
    expect(parseObj('# comment\nf 1 2 3\n')).toEqual([]);
  });
});

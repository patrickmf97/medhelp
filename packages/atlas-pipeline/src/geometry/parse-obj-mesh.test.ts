import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseObjMesh } from './parse-obj-mesh';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, '..', '..', 'fixtures', 'geometry');

describe('parseObjMesh', () => {
  it('parses vertices, per-vertex normals and a triangulated face from a valid mesh', () => {
    const mesh = parseObjMesh(readFileSync(join(fixtures, 'triangle-mesh.obj'), 'utf-8'));

    expect(mesh.vertices).toEqual([
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
    ]);
    expect(mesh.normals).toEqual([
      [0, 0, 1],
      [0, 0, 1],
      [0, 0, 1],
    ]);
    expect(mesh.faces).toEqual([[0, 1, 2]]);
  });

  it('returns empty lists for a mesh with no v/vn/f lines', () => {
    const mesh = parseObjMesh('# comment only\n');
    expect(mesh).toEqual({ vertices: [], normals: [], faces: [] });
  });

  it('ignores malformed face lines that are not exactly 3 vertex//normal indices', () => {
    const mesh = parseObjMesh(
      ['v 0 0 0', 'v 1 0 0', 'v 0 1 0', 'v 0 0 1', 'vn 0 0 1', 'vn 0 0 1', 'vn 0 0 1', 'vn 0 0 1', 'f 1//1 2//2'].join(
        '\n',
      ),
    );
    expect(mesh.faces).toEqual([]);
  });

  it('parses a non-finite vertex coordinate as-is (NaN), without silently coercing it', () => {
    const mesh = parseObjMesh(['v 0 0 0', 'v 1 NaN 0', 'vn 0 0 1', 'vn 0 0 1'].join('\n'));
    expect(Number.isFinite(mesh.vertices[1]![1])).toBe(false);
  });
});

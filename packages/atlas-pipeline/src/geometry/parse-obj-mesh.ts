import type { Face, ParsedMesh, Vec3 } from './types';

function parseVec3(parts: string[]): Vec3 {
  const [, x, y, z] = parts;
  return [Number.parseFloat(x ?? 'NaN'), Number.parseFloat(y ?? 'NaN'), Number.parseFloat(z ?? 'NaN')];
}

/**
 * Parses a v2 OBJ export: vertex positions ("v x y z"), per-vertex normals ("vn x y z", same
 * order/count as the "v" lines), and triangulated faces ("f a//a b//b c//c", 1-indexed, vertex
 * and normal index always equal). Unlike parseObj() (which only extracts vertex positions, for
 * Task 3's bounds/validation needs), this returns everything convertMesh() needs to build a
 * renderable GLB mesh rather than a point cloud.
 *
 * Face lines that do not resolve to exactly 3 vertex indices are skipped rather than guessed at —
 * the v2 export format guarantees pre-triangulated faces, so a line that does not fit that shape
 * indicates upstream corruption, not a shape this parser should silently repair.
 *
 * As with parseObj(), numeric values are parsed with parseFloat/parseInt and not validated here;
 * a non-finite coordinate (e.g. NaN/Infinity) is passed through as-is so downstream validation
 * can detect and reject it instead of this parser silently masking the corruption.
 */
export function parseObjMesh(content: string): ParsedMesh {
  const vertices: Vec3[] = [];
  const normals: Vec3[] = [];
  const faces: Face[] = [];

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (trimmed.startsWith('v ')) {
      vertices.push(parseVec3(trimmed.split(/\s+/)));
    } else if (trimmed.startsWith('vn ')) {
      normals.push(parseVec3(trimmed.split(/\s+/)));
    } else if (trimmed.startsWith('f ')) {
      const indices = trimmed
        .split(/\s+/)
        .slice(1)
        .map((token) => Number.parseInt(token.split('//')[0] ?? 'NaN', 10) - 1);

      if (indices.length === 3) {
        faces.push([indices[0]!, indices[1]!, indices[2]!]);
      }
    }
  }

  return { vertices, normals, faces };
}

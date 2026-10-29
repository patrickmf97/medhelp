import type { Bounds, Vec3 } from './types';

/**
 * Deterministic axis-aligned bounds over a vertex list. Null for an empty mesh, since "no
 * bounds" is a meaningfully different state from "a single point at the origin".
 */
export function computeBounds(vertices: Vec3[]): Bounds | null {
  if (vertices.length === 0) return null;

  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];

  for (const [x, y, z] of vertices) {
    if (x < min[0]) min[0] = x;
    if (y < min[1]) min[1] = y;
    if (z < min[2]) min[2] = z;
    if (x > max[0]) max[0] = x;
    if (y > max[1]) max[1] = y;
    if (z > max[2]) max[2] = z;
  }

  return { min, max };
}

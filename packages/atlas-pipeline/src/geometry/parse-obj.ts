import type { Vec3 } from './types';

/**
 * Parses only what MEDHELP's pipeline needs from an OBJ file: vertex positions ("v x y z"
 * lines), in file order. Face/normal/texture-coordinate lines and comments are ignored. Values
 * are parsed with parseFloat and deliberately NOT validated here — a non-finite coordinate
 * (e.g. NaN/Infinity from a corrupted export) is passed through as-is so that downstream
 * validation (see report.ts) can detect and reject it, rather than this parser silently masking
 * the corruption.
 */
export function parseObj(content: string): Vec3[] {
  const vertices: Vec3[] = [];

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('v ')) continue;

    const parts = trimmed.split(/\s+/);
    const [, x, y, z] = parts;
    vertices.push([Number.parseFloat(x ?? 'NaN'), Number.parseFloat(y ?? 'NaN'), Number.parseFloat(z ?? 'NaN')]);
  }

  return vertices;
}

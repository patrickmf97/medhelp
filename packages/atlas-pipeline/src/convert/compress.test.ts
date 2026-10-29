import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getBounds } from '@gltf-transform/functions';
import { describe, expect, it } from 'vitest';

import { parseObjMesh } from '../geometry/parse-obj-mesh';
import { convertMesh } from './convert-glb';
import { compressWithDraco, compressWithMeshopt, readGlb } from './compress';
import type { CompressionMethod } from './compress';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, '..', '..', 'fixtures', 'geometry');

async function tetrahedronGlb() {
  const mesh = parseObjMesh(readFileSync(join(fixtures, 'tetrahedron-mesh.obj'), 'utf-8'));
  const asset = await convertMesh({
    objectName: 'Tetrahedron',
    structureId: 'za:tetrahedron',
    license: 'cc-by-sa-4.0',
    mesh,
  });
  return { mesh, buffer: asset.buffer };
}

async function vertexCountAndBounds(glb: Uint8Array, method: CompressionMethod) {
  const document = await readGlb(glb, method);
  const scene = document.getRoot().listScenes()[0]!;
  const bounds = getBounds(scene);
  const vertexCount = document.getRoot().listMeshes()[0]!.listPrimitives()[0]!.getAttribute('POSITION')!.getCount();
  return { vertexCount, bounds };
}

describe('compressWithMeshopt', () => {
  it('produces a valid GLB that decodes to the same vertex count and bounds within tolerance', async () => {
    const { mesh, buffer } = await tetrahedronGlb();
    const uncompressed = await vertexCountAndBounds(buffer, 'none');

    const compressed = await compressWithMeshopt(buffer);
    expect(Buffer.from(compressed.subarray(0, 4)).toString('utf8')).toBe('glTF');

    const result = await vertexCountAndBounds(compressed, 'meshopt');
    expect(result.vertexCount).toBe(mesh.vertices.length);
    expect(result.vertexCount).toBe(uncompressed.vertexCount);
    for (let axis = 0; axis < 3; axis++) {
      expect(Math.abs(result.bounds.min[axis]! - uncompressed.bounds.min[axis]!)).toBeLessThan(1e-3);
      expect(Math.abs(result.bounds.max[axis]! - uncompressed.bounds.max[axis]!)).toBeLessThan(1e-3);
    }
  });
});

describe('compressWithDraco', () => {
  it('produces a valid GLB that decodes to the same vertex count and bounds within tolerance', async () => {
    const { mesh, buffer } = await tetrahedronGlb();
    const uncompressed = await vertexCountAndBounds(buffer, 'none');

    const compressed = await compressWithDraco(buffer);
    expect(Buffer.from(compressed.subarray(0, 4)).toString('utf8')).toBe('glTF');

    const result = await vertexCountAndBounds(compressed, 'draco');
    expect(result.vertexCount).toBe(mesh.vertices.length);
    expect(result.vertexCount).toBe(uncompressed.vertexCount);
    for (let axis = 0; axis < 3; axis++) {
      // Draco quantizes positions, so this is a lossy round trip — tolerance, not equality.
      expect(Math.abs(result.bounds.min[axis]! - uncompressed.bounds.min[axis]!)).toBeLessThan(1e-2);
      expect(Math.abs(result.bounds.max[axis]! - uncompressed.bounds.max[axis]!)).toBeLessThan(1e-2);
    }
  });
});

describe('readGlb', () => {
  it('reads an uncompressed GLB back with method "none"', async () => {
    const { mesh, buffer } = await tetrahedronGlb();
    const { vertexCount } = await vertexCountAndBounds(buffer, 'none');
    expect(vertexCount).toBe(mesh.vertices.length);
  });
});

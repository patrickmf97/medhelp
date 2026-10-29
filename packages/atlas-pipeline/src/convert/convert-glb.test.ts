import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseObjMesh } from '../geometry/parse-obj-mesh';
import { blenderToGltf, convertMesh } from './convert-glb';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, '..', '..', 'fixtures', 'geometry');

const triangleMesh = () => parseObjMesh(readFileSync(join(fixtures, 'triangle-mesh.obj'), 'utf-8'));

describe('blenderToGltf', () => {
  it('rotates Blender Z-up coordinates to glTF Y-up (-90° about X: [x, y, z] -> [x, z, -y])', () => {
    expect(blenderToGltf([1, 2, 3])).toEqual([1, 3, -2]);
    expect(blenderToGltf([0, 0, 1])).toEqual([0, 1, 0]); // Blender "up" becomes glTF "up"
    expect(blenderToGltf([0, 1, 0])).toEqual([0, 0, -1]); // Blender "forward" becomes glTF "backward"
  });
});

describe('convertMesh', () => {
  it('produces a buffer with valid GLB magic bytes', async () => {
    const asset = await convertMesh({
      objectName: 'Triangle',
      structureId: 'za:triangle',
      license: 'cc-by-sa-4.0',
      mesh: triangleMesh(),
    });

    expect(Buffer.from(asset.buffer.subarray(0, 4)).toString('utf8')).toBe('glTF');
  });

  it('preserves the structure ID and license on the output asset', async () => {
    const asset = await convertMesh({
      objectName: 'Triangle',
      structureId: 'za:triangle',
      license: 'cc-by-sa-4.0',
      mesh: triangleMesh(),
    });

    expect(asset.structureId).toBe('za:triangle');
    expect(asset.license).toBe('cc-by-sa-4.0');
  });

  it('preserves a null structure ID (unmapped object) rather than coercing it', async () => {
    const asset = await convertMesh({
      objectName: 'Unmapped thing',
      structureId: null,
      license: 'cc-by-sa-4.0',
      mesh: triangleMesh(),
    });

    expect(asset.structureId).toBeNull();
  });

  it('produces byte-identical output for the same input (deterministic, uncompressed path)', async () => {
    const job = {
      objectName: 'Triangle',
      structureId: 'za:triangle',
      license: 'cc-by-sa-4.0' as const,
      mesh: triangleMesh(),
    };

    const first = await convertMesh(job);
    const second = await convertMesh(job);

    expect(Buffer.from(first.buffer).equals(Buffer.from(second.buffer))).toBe(true);
  });

  it('round-trips structure ID, license and modification notes through the glTF root extras', async () => {
    const { NodeIO } = await import('@gltf-transform/core');
    const asset = await convertMesh({
      objectName: 'Triangle',
      structureId: 'za:triangle',
      license: 'cc-by-sa-4.0',
      mesh: triangleMesh(),
    });

    const document = await new NodeIO().readBinary(asset.buffer);
    const extras = document.getRoot().getExtras();

    expect(extras.medhelpStructureId).toBe('za:triangle');
    expect(extras.medhelpObjectName).toBe('Triangle');
    expect(extras.medhelpLicense).toBe('cc-by-sa-4.0');
    expect(typeof extras.medhelpLicenseUrl).toBe('string');
    expect(typeof extras.medhelpModificationNotes).toBe('string');
  });

  it('axis-converts vertex positions from Blender Z-up to glTF Y-up in the output mesh', async () => {
    const { NodeIO } = await import('@gltf-transform/core');
    const asset = await convertMesh({
      objectName: 'Triangle',
      structureId: 'za:triangle',
      license: 'cc-by-sa-4.0',
      mesh: triangleMesh(),
    });

    const document = await new NodeIO().readBinary(asset.buffer);
    const primitive = document.getRoot().listMeshes()[0]!.listPrimitives()[0]!;
    const positions = primitive.getAttribute('POSITION')!.getArray()!;

    // Source triangle (Blender Z-up): (0,0,0) (1,0,0) (0,1,0) -> glTF Y-up: (0,0,0) (1,0,0) (0,0,-1)
    expect(Array.from(positions)).toEqual([0, 0, 0, 1, 0, 0, 0, 0, -1]);

    const normals = primitive.getAttribute('NORMAL')!.getArray()!;
    // Source normal (Blender): (0,0,1) -> glTF: (0,1,0), for all three vertices.
    expect(Array.from(normals)).toEqual([0, 1, 0, 0, 1, 0, 0, 1, 0]);

    const indices = primitive.getIndices()!.getArray()!;
    expect(Array.from(indices)).toEqual([0, 1, 2]);
  });
});

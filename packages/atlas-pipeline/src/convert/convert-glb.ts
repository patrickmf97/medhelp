import { Accessor, Document, NodeIO } from '@gltf-transform/core';

import type { ParsedMesh, Vec3 } from '../geometry/types';
import type { LicenseTag } from '../metadata/types';

export type ConversionJob = {
  /** The Z-Anatomy object name, e.g. "Adductor magnus.l" — kept for traceability in extras. */
  objectName: string;
  /** The catalog structure ID this object belongs to (see metadata/build-catalog.ts), or null if unmapped. */
  structureId: string | null;
  license: LicenseTag;
  mesh: ParsedMesh;
};

export type ConvertedAsset = {
  objectName: string;
  structureId: string | null;
  license: LicenseTag;
  buffer: Uint8Array;
};

// Exported so other pipeline stages (e.g. package/manifest.ts, which records source attribution
// at the release level) reuse this exact text instead of drifting from it independently.
export const LICENSE_URLS: Record<LicenseTag, string> = {
  'cc-by-sa-4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'cc-by-nc-sa-4.0': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  'cc-by-nc-4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
  'cc-by-4.0': 'https://creativecommons.org/licenses/by/4.0/',
};

export const MODIFICATION_NOTES =
  'Converted from a Z-Anatomy OBJ export (vertices, per-vertex normals, triangulated faces) to ' +
  'GLB by MEDHELP atlas-pipeline convertMesh(); axis-converted from Blender world space (Z-up) ' +
  'to glTF world space (Y-up).';

/**
 * Negates n, except that negating zero (which would otherwise flip +0 to the numerically equal
 * but distinct -0) returns +0. NaN/Infinity are still negated and passed through unchanged in
 * sign-of-corruption terms — only the exact-zero case is normalized, purely to avoid spurious -0
 * noise in output data and in byte-identical-determinism comparisons.
 */
function negate(n: number): number {
  return n === 0 ? 0 : -n;
}

/**
 * Rotates a vector from Blender's native world space (Z-up, right-handed) to glTF's world space
 * (Y-up, right-handed): a -90° rotation about X, i.e. [x, y, z] -> [x, z, -y]. This is the same
 * axis convention Blender's own glTF exporter (io_scene_gltf2) applies, so assets converted here
 * line up with any Blender-exported reference. Because it is a pure rotation (no scale or
 * shear), the same linear map is correct for both vertex positions and normals — no
 * inverse-transpose is required.
 */
export function blenderToGltf([x, y, z]: Vec3): Vec3 {
  return [x, z, negate(y)];
}

// gltf-transform's TypedArray alias requires the ArrayBuffer-backed generic variants
// specifically (not the broader ArrayBufferLike that `new Float32Array(n)` infers as of
// TypeScript 5.7+'s generic typed arrays); these constructors are always ArrayBuffer-backed in
// practice (we never hand them a SharedArrayBuffer), so the narrowing cast is safe.
function toFloatBuffer(vectors: Vec3[]): Float32Array<ArrayBuffer> {
  const out = new Float32Array(vectors.length * 3) as Float32Array<ArrayBuffer>;
  vectors.forEach((v, i) => {
    const [x, y, z] = blenderToGltf(v);
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  });
  return out;
}

function toIndexBuffer(faces: ParsedMesh['faces']): Uint32Array<ArrayBuffer> {
  const out = new Uint32Array(faces.length * 3) as Uint32Array<ArrayBuffer>;
  faces.forEach((f, i) => {
    out[i * 3] = f[0];
    out[i * 3 + 1] = f[1];
    out[i * 3 + 2] = f[2];
  });
  return out;
}

/**
 * Builds an in-memory glTF-Transform Document for one converted structure. Kept separate from
 * convertMesh() so compress.ts / benchmark.ts can build and then transform a Document directly
 * without an intermediate GLB encode/decode round trip when that's useful.
 */
export function buildDocument(job: ConversionJob): Document {
  const document = new Document();

  const asset = document.getRoot().getAsset();
  asset.generator = '@medhelp/atlas-pipeline convertMesh';
  asset.copyright = 'Z-Anatomy / BodyParts3D, adapted by MEDHELP';

  // Per the Atlas plan's Global Constraints ("Preserve source provenance, license URL and
  // modification notes in every published asset version"), structureId/license/provenance are
  // stored on the glTF root's `extras`, which round-trips through any compliant glTF tool
  // (including our own compress.ts) rather than living only in a side channel that could drift.
  document.getRoot().setExtras({
    medhelpObjectName: job.objectName,
    medhelpStructureId: job.structureId,
    medhelpLicense: job.license,
    medhelpLicenseUrl: LICENSE_URLS[job.license],
    medhelpModificationNotes: MODIFICATION_NOTES,
  });

  const buffer = document.createBuffer();

  const positionAccessor = document
    .createAccessor('POSITION')
    .setType(Accessor.Type.VEC3!)
    .setBuffer(buffer)
    .setArray(toFloatBuffer(job.mesh.vertices));

  const normalAccessor = document
    .createAccessor('NORMAL')
    .setType(Accessor.Type.VEC3!)
    .setBuffer(buffer)
    .setArray(toFloatBuffer(job.mesh.normals));

  const indicesAccessor = document
    .createAccessor('INDICES')
    .setType(Accessor.Type.SCALAR!)
    .setBuffer(buffer)
    .setArray(toIndexBuffer(job.mesh.faces));

  const primitive = document
    .createPrimitive()
    .setAttribute('POSITION', positionAccessor)
    .setAttribute('NORMAL', normalAccessor)
    .setIndices(indicesAccessor);

  const mesh = document.createMesh(job.objectName).addPrimitive(primitive);
  const node = document.createNode(job.objectName).setMesh(mesh);
  const scene = document.createScene(job.objectName).addChild(node);
  document.getRoot().setDefaultScene(scene);

  return document;
}

/**
 * Converts one parsed Z-Anatomy mesh (vertices + normals + faces, Blender world space) into a
 * valid, renderable, uncompressed GLB asset (glTF world space), preserving its structure ID and
 * license so the published asset stays traceable to its source. Compression (Meshopt/Draco) is a
 * separate step — see compress.ts — so this function's output is also the "uncompressed"
 * baseline used by benchmark.ts.
 */
export async function convertMesh(job: ConversionJob): Promise<ConvertedAsset> {
  const document = buildDocument(job);
  const buffer = await new NodeIO().writeBinary(document);

  return {
    objectName: job.objectName,
    structureId: job.structureId,
    license: job.license,
    buffer,
  };
}

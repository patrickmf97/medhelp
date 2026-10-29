import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { getBounds } from '@gltf-transform/functions';

import { computeBounds } from '../geometry/bounds';
import { parseObjMesh } from '../geometry/parse-obj-mesh';
import type { Bounds, ParsedMesh } from '../geometry/types';
import type { LicenseTag } from '../metadata/types';
import type { CompressionMethod } from './compress';
import { compressWithDraco, compressWithMeshopt, readGlb } from './compress';
import { blenderToGltf, convertMesh } from './convert-glb';

/**
 * Generous enough to absorb Draco's position quantization on real Z-Anatomy meshes (meters),
 * tight enough that a dropped or mis-transformed vertex — many orders of magnitude larger —
 * would still fail it. See docs/atlas/compression-benchmark.md for the real measurements this
 * was chosen against.
 */
export const DEFAULT_BOUNDS_TOLERANCE_METERS = 1e-2;

export type MethodName = 'uncompressed' | 'meshopt' | 'draco';

export type MethodBenchmark = {
  method: MethodName;
  byteSize: number;
  decodeTimeMs: number;
  vertexCountMatches: boolean;
  boundsWithinTolerance: boolean;
};

export type MeshBenchmarkResult = {
  label: string;
  objectName: string;
  vertexCount: number;
  triangleCount: number;
  methods: MethodBenchmark[];
};

export type BenchmarkMeshPick = {
  label: string;
  objectName: string;
  objFilePath: string;
};

/**
 * Compares two axis-aligned bounds component-wise within `tolerance`. Two meshes being "visually
 * equivalent" after compression means a human looking at them would not notice a difference —
 * this is deliberately a numeric-tolerance comparison (not byte/structural equality), since
 * Draco compression is lossy.
 */
export function boundsClose(a: Bounds | null, b: Bounds | null, tolerance: number): boolean {
  if (a === null || b === null) return a === b;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(a.min[i]! - b.min[i]!) > tolerance) return false;
    if (Math.abs(a.max[i]! - b.max[i]!) > tolerance) return false;
  }
  return true;
}

function referenceBoundsGltfSpace(mesh: ParsedMesh): Bounds | null {
  return computeBounds(mesh.vertices.map((v) => blenderToGltf(v)));
}

async function decodedVertexCountAndBounds(
  glb: Uint8Array,
  method: CompressionMethod,
): Promise<{ vertexCount: number; bounds: Bounds | null }> {
  const document = await readGlb(glb, method);
  const scene = document.getRoot().listScenes()[0];
  const primitive = document.getRoot().listMeshes()[0]?.listPrimitives()[0];
  const vertexCount = primitive?.getAttribute('POSITION')?.getCount() ?? 0;

  if (!scene || vertexCount === 0) return { vertexCount, bounds: null };

  const bbox = getBounds(scene);
  return { vertexCount, bounds: { min: bbox.min, max: bbox.max } };
}

/**
 * Runs one real mesh through the uncompressed baseline, Meshopt and Draco, recording decode
 * time, encoded byte size, and whether vertex count / world-space bounds survive each codec
 * within DEFAULT_BOUNDS_TOLERANCE_METERS of the reference (axis-converted, uncompressed) mesh.
 */
export async function benchmarkMesh(pick: BenchmarkMeshPick, license: LicenseTag = 'cc-by-sa-4.0'): Promise<MeshBenchmarkResult> {
  const mesh = parseObjMesh(readFileSync(pick.objFilePath, 'utf-8'));
  const referenceBounds = referenceBoundsGltfSpace(mesh);

  const asset = await convertMesh({ objectName: pick.objectName, structureId: null, license, mesh });

  const variants: { method: MethodName; buffer: Uint8Array; readMethod: CompressionMethod }[] = [
    { method: 'uncompressed', buffer: asset.buffer, readMethod: 'none' },
    { method: 'meshopt', buffer: await compressWithMeshopt(asset.buffer), readMethod: 'meshopt' },
    { method: 'draco', buffer: await compressWithDraco(asset.buffer), readMethod: 'draco' },
  ];

  const methods: MethodBenchmark[] = [];
  for (const variant of variants) {
    const start = performance.now();
    const { vertexCount, bounds } = await decodedVertexCountAndBounds(variant.buffer, variant.readMethod);
    const decodeTimeMs = performance.now() - start;

    methods.push({
      method: variant.method,
      byteSize: variant.buffer.byteLength,
      decodeTimeMs,
      vertexCountMatches: vertexCount === mesh.vertices.length,
      boundsWithinTolerance: boundsClose(referenceBounds, bounds, DEFAULT_BOUNDS_TOLERANCE_METERS),
    });
  }

  return {
    label: pick.label,
    objectName: pick.objectName,
    vertexCount: mesh.vertices.length,
    triangleCount: mesh.faces.length,
    methods,
  };
}

export async function runBenchmark(picks: BenchmarkMeshPick[], license?: LicenseTag): Promise<MeshBenchmarkResult[]> {
  const results: MeshBenchmarkResult[] = [];
  for (const pick of picks) {
    results.push(await benchmarkMesh(pick, license));
  }
  return results;
}

export type MeshCandidate = {
  objectName: string;
  objFilePath: string;
  vertexCount: number;
};

/**
 * Picks one small/medium/large real mesh by vertex count from a list of candidates, for an
 * apples-to-apples benchmark across very different mesh sizes. Candidates with fewer than 10
 * vertices (lymph nodes, foramina, etc. exported as near-point meshes) are excluded — they are
 * real meshes but not representative of "small" in the sense the benchmark cares about (a
 * typical small-but-renderable structure, not a degenerate one). Returns null when there are
 * fewer than 3 usable candidates.
 */
export function pickRepresentativeMeshes(
  candidates: MeshCandidate[],
): { small: MeshCandidate; medium: MeshCandidate; large: MeshCandidate } | null {
  const usable = [...candidates].filter((c) => c.vertexCount >= 10).sort((a, b) => a.vertexCount - b.vertexCount);
  if (usable.length < 3) return null;

  return {
    small: usable[0]!,
    medium: usable[Math.floor(usable.length / 2)]!,
    large: usable[usable.length - 1]!,
  };
}

function objectNameFromObjFile(fileName: string): string {
  return fileName
    .replace(/^\d+_/, '')
    .replace(/\.obj$/, '')
    .replace(/_/g, ' ');
}

function countVertexLines(content: string): number {
  let count = 0;
  for (const line of content.split(/\r?\n/)) {
    if (line.startsWith('v ')) count += 1;
  }
  return count;
}

/**
 * CLI entry point: `node src/convert/benchmark.ts <objDir>` scans every .obj file in `objDir`,
 * picks representative small/medium/large real meshes by vertex count, runs the full benchmark
 * against them, and prints the JSON report to stdout — the source of the numbers recorded in
 * docs/atlas/compression-benchmark.md.
 */
export async function main(objDir: string): Promise<MeshBenchmarkResult[]> {
  const files = readdirSync(objDir).filter((f) => f.endsWith('.obj'));

  const candidates: MeshCandidate[] = files.map((file) => {
    const objFilePath = join(objDir, file);
    const vertexCount = countVertexLines(readFileSync(objFilePath, 'utf-8'));
    return { objectName: objectNameFromObjFile(file), objFilePath, vertexCount };
  });

  const picks = pickRepresentativeMeshes(candidates);
  if (!picks) {
    throw new Error(`Not enough usable (>=10 vertex) OBJ files in ${objDir} to benchmark small/medium/large.`);
  }

  return runBenchmark([
    { label: 'small', objectName: picks.small.objectName, objFilePath: picks.small.objFilePath },
    { label: 'medium', objectName: picks.medium.objectName, objFilePath: picks.medium.objFilePath },
    { label: 'large', objectName: picks.large.objectName, objFilePath: picks.large.objFilePath },
  ]);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const objDir = process.argv[2];
  if (!objDir) {
    console.error('Usage: node src/convert/benchmark.ts <objDir>');
    process.exitCode = 1;
  } else {
    main(objDir)
      .then((results) => {
        console.log(JSON.stringify(results, null, 2));
      })
      .catch((error: unknown) => {
        console.error(error);
        process.exitCode = 1;
      });
  }
}

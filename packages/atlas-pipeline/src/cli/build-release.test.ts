import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { CatalogBuildResult } from '../metadata/types';
import { buildRelease } from './build-release';

const TRIANGLE_OBJ = ['v 0 0 0', 'v 1 0 0', 'v 0 1 0', 'vn 0 0 1', 'vn 0 0 1', 'vn 0 0 1', 'f 1//1 2//2 3//3', ''].join(
  '\n',
);

// Mirrors a real Z-Anatomy export quirk: some real, non-excluded, vertex-only-valid OBJs
// (reference-point markers, named with a ".j" suffix, e.g. "Canal for vertebral artery.j") have
// only 2 vertices and zero triangulated faces -- there is no surface to render. Task 4's
// convertMesh()/compressWithMeshopt() pipeline does not guard against this (the Meshopt encoder
// asserts on a mesh with no triangle data), so build-release.ts must skip these defensively
// rather than let one degenerate real mesh crash an entire release build.
const DEGENERATE_POINT_OBJ = ['v 0 0 0', 'v 0 0 1', 'vn 0 0 1', 'vn 0 0 1', ''].join('\n');

function structure(overrides: Partial<CatalogBuildResult['structures'][number]>): CatalogBuildResult['structures'][number] {
  return {
    id: 'za:placeholder',
    name: 'Placeholder',
    path: ['Placeholder'],
    parentId: null,
    depth: 1,
    ta2Id: null,
    englishName: null,
    latinName: null,
    portugueseName: null,
    license: 'cc-by-sa-4.0',
    excluded: false,
    excludedReason: null,
    objectNames: [],
    ...overrides,
  };
}

const catalog: CatalogBuildResult = {
  structures: [
    structure({
      id: 'za:bonus-collection/skeletal-system/femur',
      name: 'Femur',
      path: ['Bonus collection', 'Skeletal system', 'Femur'],
      ta2Id: '1',
      objectNames: ['Femur.l', 'Femur.r'],
    }),
    structure({
      id: 'za:bonus-collection/nervous-system/sense-organs/ear/internal-ear/cochlea',
      name: 'Cochlea',
      path: ['Bonus collection', 'Nervous system', 'Sense organs', 'Ear', 'Internal ear', 'Cochlea'],
      license: 'cc-by-nc-sa-4.0',
      excluded: true,
      excludedReason: '"Anatomy of the Inner Ear" is CC BY-NC-SA 4.0',
      objectNames: ['Cochlea.r'],
    }),
  ],
  unmappedToTa2: [],
  duplicateEnglishNamesInTa2: [],
  cycles: [],
};

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function writeFixtureObjDir(): string {
  const objDir = makeTempDir('atlas-build-release-obj-');
  writeFileSync(join(objDir, '00000_Femur.l.obj'), TRIANGLE_OBJ);
  writeFileSync(join(objDir, '00001_Femur.r.obj'), TRIANGLE_OBJ);
  writeFileSync(join(objDir, '00002_Cochlea.r.obj'), TRIANGLE_OBJ);
  writeFileSync(join(objDir, '00003_Canal_for_vertebral_artery_.j.obj'), DEGENERATE_POINT_OBJ);
  return objDir;
}

function writeCatalogFile(): string {
  const dir = makeTempDir('atlas-build-release-catalog-');
  const path = join(dir, 'catalog.json');
  writeFileSync(path, JSON.stringify(catalog));
  return path;
}

describe('buildRelease', () => {
  it('converts, groups, and writes a manifest.json plus per-package GLB files', async () => {
    const objDir = writeFixtureObjDir();
    const catalogPath = writeCatalogFile();
    const outDir = makeTempDir('atlas-build-release-out-');

    const result = await buildRelease({ objDir, outDir, catalogPath });

    expect(result.converted).toBe(2);
    expect(result.skippedExcluded).toBe(1);
    expect(result.skippedDegenerate).toBe(1);
    expect(result.manifest.schemaVersion).toBe(1);

    const manifestOnDisk = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf-8'));
    expect(manifestOnDisk).toEqual(result.manifest);

    // The excluded Cochlea structure must never appear.
    expect(result.manifest.structures.find((s) => s.id.includes('cochlea'))).toBeUndefined();

    const packagesDir = join(outDir, 'packages');
    expect(existsSync(packagesDir)).toBe(true);
    const packageDirs = readdirSync(packagesDir);
    expect(packageDirs.length).toBeGreaterThan(0);

    // Every GLB file physically written is accounted for by the manifest's byte sizes.
    let totalWrittenBytes = 0;
    for (const pkgDirName of packageDirs) {
      const files = readdirSync(join(packagesDir, pkgDirName)).filter((f) => f.endsWith('.glb'));
      expect(files.length).toBeGreaterThan(0);
      for (const file of files) {
        totalWrittenBytes += readFileSync(join(packagesDir, pkgDirName, file)).byteLength;
      }
    }
    const manifestTotalBytes = result.manifest.packages.reduce((sum, p) => sum + p.byteSize, 0);
    expect(totalWrittenBytes).toBe(manifestTotalBytes);
  });

  it('skips a real-world degenerate (zero-face, point-only) mesh instead of crashing the whole build', async () => {
    const objDir = writeFixtureObjDir();
    const catalogPath = writeCatalogFile();
    const outDir = makeTempDir('atlas-build-release-out-');

    const result = await buildRelease({ objDir, outDir, catalogPath });

    expect(result.skippedDegenerate).toBe(1);
    const allFiles = readdirSync(join(outDir, 'packages')).flatMap((d) => readdirSync(join(outDir, 'packages', d)));
    expect(allFiles.some((f) => f.toLowerCase().includes('canal-for-vertebral-artery'))).toBe(false);
  });

  it('never writes a GLB for a license-excluded object', async () => {
    const objDir = writeFixtureObjDir();
    const catalogPath = writeCatalogFile();
    const outDir = makeTempDir('atlas-build-release-out-');

    await buildRelease({ objDir, outDir, catalogPath });

    const packagesDir = join(outDir, 'packages');
    const allFiles = readdirSync(packagesDir).flatMap((d) => readdirSync(join(packagesDir, d)));
    expect(allFiles.some((f) => f.toLowerCase().includes('cochlea'))).toBe(false);
  });

  it('produces a byte-identical manifest.json across two independent builds of the same input', async () => {
    const objDir = writeFixtureObjDir();
    const catalogPath = writeCatalogFile();
    const outDirA = makeTempDir('atlas-build-release-out-a-');
    const outDirB = makeTempDir('atlas-build-release-out-b-');

    await buildRelease({ objDir, outDir: outDirA, catalogPath });
    await buildRelease({ objDir, outDir: outDirB, catalogPath });

    const manifestA = readFileSync(join(outDirA, 'manifest.json'), 'utf-8');
    const manifestB = readFileSync(join(outDirB, 'manifest.json'), 'utf-8');
    expect(manifestA).toBe(manifestB);
  });
});

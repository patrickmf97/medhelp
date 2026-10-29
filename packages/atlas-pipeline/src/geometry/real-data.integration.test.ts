import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { AnatomyStructureRecord, CatalogBuildResult } from '../metadata/types';
import { parseObj } from './parse-obj';
import { buildExportReport } from './report';
import type { MeshInput } from './types';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..', '..');

const ATLAS_SOURCE_DIR = process.env.ATLAS_SOURCE_DIR ?? join(homedir(), 'medhelp-atlas-source');
const EXPORT_DIR = join(ATLAS_SOURCE_DIR, 'export');
const OBJ_DIR = join(EXPORT_DIR, 'obj');
const MANIFEST_DIR = join(EXPORT_DIR, 'batch-manifests');
const CATALOG_PATH = join(EXPORT_DIR, 'catalog.json');

type BatchRecord = {
  name: string;
  globalIndex: number;
  excluded: boolean;
  objFile: string | null;
  vertCountAtSource?: number;
};

type BatchManifest = {
  startIndex: number;
  endIndex: number;
  totalMeshObjects: number;
  records: BatchRecord[];
};

const haveRealExport =
  existsSync(MANIFEST_DIR) && existsSync(CATALOG_PATH) && readdirSync(MANIFEST_DIR).length > 0;

describe.skipIf(!haveRealExport)('geometry export report from real Blender batches', () => {
  it('aggregates every batch manifest into one deterministic, tested export report', () => {
    // This reads and parses every exported OBJ file (up to all 4569 real mesh objects once the
    // full-scene export is complete), which comfortably exceeds vitest's default 5s timeout.
    const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8')) as CatalogBuildResult;

    const structureIdByObjectName = new Map<string, string>();
    const unmappedStructureIds = new Set<string>();
    for (const structure of catalog.structures as AnatomyStructureRecord[]) {
      if (structure.ta2Id === null) unmappedStructureIds.add(structure.id);
      for (const objectName of structure.objectNames) {
        structureIdByObjectName.set(objectName, structure.id);
      }
    }

    const manifestFiles = readdirSync(MANIFEST_DIR).filter((f) => f.endsWith('.json'));
    expect(manifestFiles.length).toBeGreaterThan(0);

    const excludedObjectNames = new Set<string>();
    const inputs: MeshInput[] = [];
    let totalRecordsSeen = 0;

    for (const file of manifestFiles) {
      const manifest = JSON.parse(readFileSync(join(MANIFEST_DIR, file), 'utf-8')) as BatchManifest;
      for (const record of manifest.records) {
        totalRecordsSeen += 1;
        const structureId = structureIdByObjectName.get(record.name) ?? null;

        if (record.excluded) {
          excludedObjectNames.add(record.name);
          inputs.push({ objectName: record.name, structureId, vertices: [] });
          continue;
        }

        const vertices = record.objFile
          ? parseObj(readFileSync(join(OBJ_DIR, record.objFile), 'utf-8'))
          : [];

        inputs.push({ objectName: record.name, structureId, vertices });
      }
    }

    // No duplicate processing of the same object across overlapping/rerun batches.
    const uniqueNames = new Set(inputs.map((i) => i.objectName));
    expect(uniqueNames.size).toBe(inputs.length);
    expect(totalRecordsSeen).toBe(inputs.length);

    const report = buildExportReport(inputs, { excludedObjectNames, unmappedStructureIds });

    // Sanity on real data: every license-excluded object produced an `excluded` record and no
    // OBJ file leaked through for it.
    expect(report.excluded.length).toBe(excludedObjectNames.size);
    for (const record of report.excluded) {
      expect(record.bounds).toBeNull();
    }
    expect(report.totals.processed).toBe(inputs.length);
    expect(report.accepted.length).toBeGreaterThan(0);

    // Deterministic: rebuilding from the same inputs again is byte-identical.
    const second = buildExportReport(inputs, { excludedObjectNames, unmappedStructureIds });
    expect(second).toEqual(report);

    mkdirSync(join(repoRoot, 'docs', 'atlas'), { recursive: true });
    writeFileSync(join(repoRoot, 'docs', 'atlas', 'geometry-export-report.json'), JSON.stringify(report, null, 2));

    writeFileSync(join(EXPORT_DIR, 'geometry-export-report-full.json'), JSON.stringify(report, null, 2));
  }, 60_000);
});

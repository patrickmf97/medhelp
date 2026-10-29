import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { buildCatalog } from './build-catalog';
import { parseTa2Csv } from './parse-ta2';
import { adaptSceneDump } from './raw-scene-dump';
import type { RawSceneDump } from './raw-scene-dump';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..', '..');

const ATLAS_SOURCE_DIR = process.env.ATLAS_SOURCE_DIR ?? join(homedir(), 'medhelp-atlas-source');
const TA2_PATH = join(ATLAS_SOURCE_DIR, 'TA2.csv');
const SCENE_DUMP_PATH = join(ATLAS_SOURCE_DIR, 'export', 'scene-dump.json');
const EXPORT_DIR = join(ATLAS_SOURCE_DIR, 'export');

const haveRealData = existsSync(TA2_PATH) && existsSync(SCENE_DUMP_PATH);

describe.skipIf(!haveRealData)('metadata catalog built from the real Z-Anatomy scene', () => {
  it('builds a sane catalog and writes it (plus a small committed summary) to disk', () => {
    const ta2Rows = parseTa2Csv(readFileSync(TA2_PATH, 'utf-8'));
    const rawDump = JSON.parse(readFileSync(SCENE_DUMP_PATH, 'utf-8')) as RawSceneDump;
    const scene = adaptSceneDump(rawDump);

    const result = buildCatalog(ta2Rows, scene);

    // Basic sanity on real data shape.
    expect(result.structures.length).toBe(rawDump.totals.collections);
    expect(result.cycles).toEqual([]);

    const byName = new Map(result.structures.map((s) => [s.name, s]));

    const kidney = byName.get('Kidney');
    expect(kidney?.license).toBe('cc-by-nc-4.0');
    expect(kidney?.excluded).toBe(true);
    const kidneyLobe = byName.get('Kidney lobe');
    expect(kidneyLobe?.excluded).toBe(true);

    const internalEar = byName.get('Internal ear');
    expect(internalEar?.license).toBe('cc-by-nc-sa-4.0');
    expect(internalEar?.excluded).toBe(true);
    const cochlea = byName.get('Cochlea');
    expect(cochlea?.excluded).toBe(true);

    const cranialNerves = byName.get('Cranial nerves');
    expect(cranialNerves?.license).toBe('cc-by-4.0');
    expect(cranialNerves?.excluded).toBe(false);

    const heart = byName.get('Heart');
    expect(heart?.license).toBe('cc-by-sa-4.0');
    expect(heart?.excluded).toBe(false);

    // Idempotency against real data too.
    const second = buildCatalog(ta2Rows, scene);
    expect(second).toEqual(result);

    const excludedObjectNames = result.structures
      .filter((s) => s.excluded)
      .flatMap((s) => s.objectNames)
      .sort();

    mkdirSync(EXPORT_DIR, { recursive: true });
    writeFileSync(join(EXPORT_DIR, 'catalog.json'), JSON.stringify(result, null, 2));
    writeFileSync(join(EXPORT_DIR, 'excluded-object-names.json'), JSON.stringify(excludedObjectNames, null, 2));

    const summary = {
      generatedFrom: 'real Z-Anatomy Startup.blend scene graph + TA2.csv',
      totals: {
        structures: result.structures.length,
        unmappedToTa2: result.unmappedToTa2.length,
        duplicateEnglishNamesInTa2: result.duplicateEnglishNamesInTa2.length,
        cycles: result.cycles.length,
        excludedStructures: result.structures.filter((s) => s.excluded).length,
        excludedObjects: excludedObjectNames.length,
        licenseBreakdown: Object.fromEntries(
          [...new Set(result.structures.map((s) => s.license))]
            .sort()
            .map((license) => [license, result.structures.filter((s) => s.license === license).length]),
        ),
      },
    };
    mkdirSync(join(repoRoot, 'docs', 'atlas'), { recursive: true });
    writeFileSync(join(repoRoot, 'docs', 'atlas', 'metadata-catalog-summary.json'), JSON.stringify(summary, null, 2));

    expect(summary.totals.structures).toBeGreaterThan(0);
  });
});

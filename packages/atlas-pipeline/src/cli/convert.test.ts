import { describe, expect, it } from 'vitest';

import type { CatalogBuildResult } from '../metadata/types';
import { objectNameFromObjFileName, resolveStructureInfo } from './convert';

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
      id: 'za:muscular-system',
      name: '5: Muscular system',
      ta2Id: '1',
      englishName: 'Muscular system',
      objectNames: ['Adductor magnus.l'],
    }),
    // Real Z-Anatomy data: the same object name ("Cochlea.r") appears under more than one
    // independent grouping tree (the anatomical-system hierarchy AND the separate
    // "regions of human body" hierarchy — see docs/atlas/provenance.md), and — critically — a
    // broad, non-excluded ancestor ("Sense organs") is pushed to the catalog's structure list
    // *before* the deep, excluded "Cochlea" structure for the very same object. A naive
    // "first match wins" lookup would therefore find the non-excluded ancestor first and miss
    // the exclusion entirely. License exclusion has to win regardless of array order, since it's
    // a hard "never publish NC-licensed content" constraint.
    structure({
      id: 'za:nervous-system-sense-organs',
      name: 'Sense organs',
      depth: 1,
      ta2Id: '2',
      objectNames: ['Cochlea.r'],
    }),
    structure({
      id: 'za:bonus-collection/nervous-system/sense-organs/ear/internal-ear/bony-labyrinth/cochlea',
      name: 'Cochlea',
      depth: 7,
      license: 'cc-by-nc-sa-4.0',
      excluded: true,
      excludedReason: '"Anatomy of the Inner Ear" is CC BY-NC-SA 4.0',
      objectNames: ['Cochlea.r'],
    }),
    structure({
      id: 'za:bonus-collection/regions-of-human-body/main-divisions/head',
      name: 'Head',
      depth: 4,
      objectNames: ['Cochlea.r'],
    }),
  ],
  unmappedToTa2: [],
  duplicateEnglishNamesInTa2: [],
  cycles: [],
};

describe('objectNameFromObjFileName', () => {
  it('strips the numeric prefix and .obj extension, and restores spaces', () => {
    expect(objectNameFromObjFileName('00115_Adductor_magnus.l.obj')).toBe('Adductor magnus.l');
  });
});

describe('resolveStructureInfo', () => {
  it('resolves a known object name to its structure id and license', () => {
    const info = resolveStructureInfo(catalog, 'Adductor magnus.l');
    expect(info).toEqual({ structureId: 'za:muscular-system', license: 'cc-by-sa-4.0', excluded: false });
  });

  it('flags an object as excluded if ANY matching structure excludes it, even when a later, non-excluded match for the same object name exists in a different grouping tree', () => {
    const info = resolveStructureInfo(catalog, 'Cochlea.r');
    expect(info).toEqual({
      structureId: 'za:bonus-collection/nervous-system/sense-organs/ear/internal-ear/bony-labyrinth/cochlea',
      license: 'cc-by-nc-sa-4.0',
      excluded: true,
    });
  });

  it('falls back to a null structureId and the default license for an unmapped object', () => {
    const info = resolveStructureInfo(catalog, 'Some unmapped thing');
    expect(info).toEqual({ structureId: null, license: 'cc-by-sa-4.0', excluded: false });
  });
});

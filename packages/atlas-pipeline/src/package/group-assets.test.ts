import { describe, expect, it } from 'vitest';

import type { ConvertedAsset } from '../convert/convert-glb';
import type { AnatomyStructureRecord } from '../metadata/types';
import { DEFAULT_MAX_PACKAGE_BYTES, groupAssets, groupKeyForPath } from './group-assets';

function structure(overrides: Partial<AnatomyStructureRecord>): AnatomyStructureRecord {
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

function asset(overrides: Partial<ConvertedAsset>): ConvertedAsset {
  return {
    objectName: 'Placeholder object',
    structureId: null,
    license: 'cc-by-sa-4.0',
    buffer: new Uint8Array([1, 2, 3]),
    ...overrides,
  };
}

describe('groupKeyForPath', () => {
  it('unwraps the real Z-Anatomy "Bonus collection" tree to its real system/region name', () => {
    expect(groupKeyForPath(['Bonus collection', 'Nervous system', 'Sense organs', 'Ear'])).toBe('Nervous system');
  });

  it('uses the top-level name directly for the flat numbered system collections', () => {
    expect(groupKeyForPath(['4: Muscular system'])).toBe('4: Muscular system');
  });

  it('falls back to "Bonus collection" itself when nothing deeper exists', () => {
    expect(groupKeyForPath(['Bonus collection'])).toBe('Bonus collection');
  });
});

describe('groupAssets', () => {
  const structures: AnatomyStructureRecord[] = [
    structure({
      id: 'za:bonus-collection/skeletal-system/skull',
      name: 'Skull',
      path: ['Bonus collection', 'Skeletal system', 'Skull'],
      objectNames: ['Skull'],
    }),
    structure({
      id: 'za:bonus-collection/skeletal-system/femur',
      name: 'Femur',
      path: ['Bonus collection', 'Skeletal system', 'Femur'],
      objectNames: ['Femur.l', 'Femur.r'],
    }),
    structure({
      id: 'za:bonus-collection/nervous-system/brain',
      name: 'Brain',
      path: ['Bonus collection', 'Nervous system', 'Brain'],
      objectNames: ['Brain'],
    }),
  ];

  it('groups assets by their structure’s real system/region, not the raw path[0] wrapper', () => {
    const assets = [
      asset({ objectName: 'Skull', structureId: 'za:bonus-collection/skeletal-system/skull' }),
      asset({ objectName: 'Femur.l', structureId: 'za:bonus-collection/skeletal-system/femur' }),
      asset({ objectName: 'Brain', structureId: 'za:bonus-collection/nervous-system/brain' }),
    ];

    const packages = groupAssets(assets, structures);
    const groupKeys = new Set(packages.map((p) => p.groupKey));
    expect(groupKeys).toEqual(new Set(['Skeletal system', 'Nervous system']));
  });

  it('buckets assets with an unmapped (null) or unknown structureId into "unmapped"', () => {
    const assets = [asset({ objectName: 'Mystery thing', structureId: null })];
    const packages = groupAssets(assets, structures);
    expect(packages).toHaveLength(1);
    expect(packages[0]?.groupKey).toBe('unmapped');
  });

  it('gives every package a stable, slugified id and sums its own byte size correctly', () => {
    const assets = [
      asset({ objectName: 'Femur.l', structureId: 'za:bonus-collection/skeletal-system/femur', buffer: new Uint8Array(10) }),
      asset({ objectName: 'Femur.r', structureId: 'za:bonus-collection/skeletal-system/femur', buffer: new Uint8Array(20) }),
    ];
    const packages = groupAssets(assets, structures);
    expect(packages).toHaveLength(1);
    expect(packages[0]?.id).toBe('skeletal-system-0');
    expect(packages[0]?.byteSize).toBe(30);
    expect(packages[0]?.assets).toHaveLength(2);
  });

  it('never splits assets that share a single structureId across two packages, even over budget', () => {
    const assets = [
      asset({ objectName: 'Femur.l', structureId: 'za:bonus-collection/skeletal-system/femur', buffer: new Uint8Array(6) }),
      asset({ objectName: 'Femur.r', structureId: 'za:bonus-collection/skeletal-system/femur', buffer: new Uint8Array(6) }),
    ];
    // A budget smaller than the combined size of one structure's assets must not split them.
    const packages = groupAssets(assets, structures, 10);
    expect(packages).toHaveLength(1);
    expect(packages[0]?.assets.map((a) => a.objectName).sort()).toEqual(['Femur.l', 'Femur.r']);
  });

  it('splits a group into multiple parts once the byte budget is exceeded across structures', () => {
    const assets = [
      asset({ objectName: 'Skull', structureId: 'za:bonus-collection/skeletal-system/skull', buffer: new Uint8Array(8) }),
      asset({ objectName: 'Femur.l', structureId: 'za:bonus-collection/skeletal-system/femur', buffer: new Uint8Array(8) }),
      asset({ objectName: 'Femur.r', structureId: 'za:bonus-collection/skeletal-system/femur', buffer: new Uint8Array(8) }),
    ];
    const packages = groupAssets(assets, structures, 10);
    const skeletal = packages.filter((p) => p.groupKey === 'Skeletal system');
    expect(skeletal.length).toBeGreaterThan(1);
    expect(skeletal.map((p) => p.id)).toEqual(['skeletal-system-0', 'skeletal-system-1']);
    // Every asset must still be accounted for exactly once.
    const allNames = skeletal.flatMap((p) => p.assets.map((a) => a.objectName)).sort();
    expect(allNames).toEqual(['Femur.l', 'Femur.r', 'Skull']);
  });

  it('is deterministic regardless of input asset order', () => {
    const assets = [
      asset({ objectName: 'Brain', structureId: 'za:bonus-collection/nervous-system/brain' }),
      asset({ objectName: 'Skull', structureId: 'za:bonus-collection/skeletal-system/skull' }),
      asset({ objectName: 'Femur.l', structureId: 'za:bonus-collection/skeletal-system/femur' }),
      asset({ objectName: 'Femur.r', structureId: 'za:bonus-collection/skeletal-system/femur' }),
    ];
    const forward = groupAssets(assets, structures);
    const backward = groupAssets([...assets].reverse(), structures);
    expect(forward.map((p) => ({ id: p.id, names: p.assets.map((a) => a.objectName) }))).toEqual(
      backward.map((p) => ({ id: p.id, names: p.assets.map((a) => a.objectName) })),
    );
  });

  it('exports a sane default byte budget', () => {
    expect(DEFAULT_MAX_PACKAGE_BYTES).toBeGreaterThan(1024 * 1024);
  });
});

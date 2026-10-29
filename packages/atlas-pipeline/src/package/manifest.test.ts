import { describe, expect, it } from 'vitest';

import type { ConvertedAsset } from '../convert/convert-glb';
import type { AnatomyStructureRecord } from '../metadata/types';
import { groupAssets } from './group-assets';
import { buildManifest } from './manifest';

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

const structures: AnatomyStructureRecord[] = [
  structure({
    id: 'za:bonus-collection/skeletal-system',
    name: 'Skeletal system',
    path: ['Bonus collection', 'Skeletal system'],
    depth: 2,
    objectNames: [],
  }),
  structure({
    id: 'za:bonus-collection/skeletal-system/skull',
    name: 'Skull',
    path: ['Bonus collection', 'Skeletal system', 'Skull'],
    parentId: 'za:bonus-collection/skeletal-system',
    depth: 3,
    englishName: 'Skull',
    objectNames: ['Skull'],
  }),
  structure({
    id: 'za:bonus-collection/skeletal-system/femur',
    name: 'Femur',
    path: ['Bonus collection', 'Skeletal system', 'Femur'],
    parentId: 'za:bonus-collection/skeletal-system',
    depth: 3,
    objectNames: ['Femur.l', 'Femur.r'],
  }),
  structure({
    id: 'za:bonus-collection/nervous-system/brain',
    name: 'Brain',
    path: ['Bonus collection', 'Nervous system', 'Brain'],
    depth: 3,
    objectNames: ['Brain'],
  }),
  structure({
    id: 'za:bonus-collection/nervous-system/sense-organs/ear/internal-ear/cochlea',
    name: 'Cochlea',
    path: ['Bonus collection', 'Nervous system', 'Sense organs', 'Ear', 'Internal ear', 'Cochlea'],
    depth: 6,
    license: 'cc-by-nc-sa-4.0',
    excluded: true,
    excludedReason: '"Anatomy of the Inner Ear" is CC BY-NC-SA 4.0',
    objectNames: ['Cochlea.r'],
  }),
];

const assets: ConvertedAsset[] = [
  asset({ objectName: 'Skull', structureId: 'za:bonus-collection/skeletal-system/skull', buffer: new Uint8Array(10) }),
  asset({ objectName: 'Femur.l', structureId: 'za:bonus-collection/skeletal-system/femur', buffer: new Uint8Array(20) }),
  asset({ objectName: 'Femur.r', structureId: 'za:bonus-collection/skeletal-system/femur', buffer: new Uint8Array(20) }),
  asset({ objectName: 'Brain', structureId: 'za:bonus-collection/nervous-system/brain', buffer: new Uint8Array(30) }),
  asset({ objectName: 'Mystery thing', structureId: null, buffer: new Uint8Array(5) }),
];

describe('buildManifest', () => {
  it('reports schemaVersion 1', () => {
    const manifest = buildManifest(groupAssets(assets, structures), structures);
    expect(manifest.schemaVersion).toBe(1);
  });

  it('gives every structure a unique id', () => {
    const manifest = buildManifest(groupAssets(assets, structures), structures);
    expect(new Set(manifest.structures.map((s) => s.id)).size).toBe(manifest.structures.length);
  });

  it('never lists a license-excluded structure, even though no asset referenced it here', () => {
    const manifest = buildManifest(groupAssets(assets, structures), structures);
    expect(manifest.structures.find((s) => s.id.includes('cochlea'))).toBeUndefined();
  });

  it('drops an excluded structure from the manifest even if an asset somehow still references it (defense in depth)', () => {
    const withExcludedAsset = [
      ...assets,
      asset({ objectName: 'Cochlea.r', structureId: 'za:bonus-collection/nervous-system/sense-organs/ear/internal-ear/cochlea' }),
    ];
    const manifest = buildManifest(groupAssets(withExcludedAsset, structures), structures);
    expect(manifest.structures.find((s) => s.id.includes('cochlea'))).toBeUndefined();
  });

  it('assigns each structure to exactly the package that owns its asset(s)', () => {
    const packages = groupAssets(assets, structures);
    const manifest = buildManifest(packages, structures);

    const skull = manifest.structures.find((s) => s.id === 'za:bonus-collection/skeletal-system/skull');
    const femur = manifest.structures.find((s) => s.id === 'za:bonus-collection/skeletal-system/femur');
    expect(skull?.packageId).toBe(femur?.packageId);

    const ownerPackage = manifest.packages.find((p) => p.id === skull?.packageId);
    expect(ownerPackage?.structureIds).toContain('za:bonus-collection/skeletal-system/skull');
    expect(ownerPackage?.structureIds).toContain('za:bonus-collection/skeletal-system/femur');
  });

  it('carries parent/child relationships through from the catalog', () => {
    const manifest = buildManifest(groupAssets(assets, structures), structures);
    const skull = manifest.structures.find((s) => s.id === 'za:bonus-collection/skeletal-system/skull');
    expect(skull?.parentId).toBe('za:bonus-collection/skeletal-system');
  });

  it('records source attribution (license, url, modification notes)', () => {
    const manifest = buildManifest(groupAssets(assets, structures), structures);
    expect(manifest.source.license).toBe('cc-by-sa-4.0');
    expect(manifest.source.licenseUrl).toMatch(/creativecommons\.org/);
    expect(manifest.source.modificationNotes.length).toBeGreaterThan(0);
  });

  it('includes a per-package integrity hash that changes when package bytes change', () => {
    const manifestA = buildManifest(groupAssets(assets, structures), structures);
    const mutatedAssets = assets.map((a) =>
      a.objectName === 'Skull' ? { ...a, buffer: new Uint8Array([9, 9, 9, 9, 9, 9, 9, 9, 9, 9]) } : a,
    );
    const manifestB = buildManifest(groupAssets(mutatedAssets, structures), structures);

    const packageA = manifestA.packages.find((p) => p.structureIds.includes('za:bonus-collection/skeletal-system/skull'));
    const packageB = manifestB.packages.find((p) => p.structureIds.includes('za:bonus-collection/skeletal-system/skull'));
    expect(packageA?.hash).not.toBe(packageB?.hash);
  });

  it('records each package’s byte size', () => {
    const manifest = buildManifest(groupAssets(assets, structures), structures);
    const total = manifest.packages.reduce((sum, p) => sum + p.byteSize, 0);
    expect(total).toBe(10 + 20 + 20 + 30 + 5);
  });

  it('produces a byte-identical manifest across two independent builds from the same input, regardless of input order', () => {
    const shuffled = [...assets].reverse();
    const manifestA = buildManifest(groupAssets(assets, structures), structures);
    const manifestB = buildManifest(groupAssets(shuffled, structures), structures);
    expect(JSON.stringify(manifestA)).toBe(JSON.stringify(manifestB));
  });

  it('produces a byte-identical manifest when the whole pipeline is simply re-run twice', () => {
    const manifestA = buildManifest(groupAssets(assets, structures), structures);
    const manifestB = buildManifest(groupAssets(assets, structures), structures);
    expect(JSON.stringify(manifestA)).toBe(JSON.stringify(manifestB));
  });
});

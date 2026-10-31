import { describe, expect, it } from 'vitest';

import type { CatalogBuildResult } from '../metadata/types';
import type { AtlasManifestV1, ManifestPackage } from '../package/manifest';
import {
  humanizeObjectName,
  labelFlatManifest,
  objectNamesBySlug,
  resolvePackageLabel,
} from './label-flat-manifest';

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

function manifestPackage(overrides: Partial<ManifestPackage>): ManifestPackage {
  return {
    id: 'placeholder',
    groupKey: 'unmapped',
    byteSize: 0,
    hash: 'hash-placeholder',
    structureIds: [],
    ...overrides,
  };
}

function manifest(packages: ManifestPackage[]): AtlasManifestV1 {
  return {
    schemaVersion: 1,
    source: {
      name: 'Test fixture',
      license: 'cc-by-sa-4.0',
      licenseUrl: 'https://example.com/license',
      modificationNotes: 'synthetic test fixture, not real content',
    },
    packages,
    structures: [],
  };
}

describe('humanizeObjectName', () => {
  it('strips a plain left/right laterality suffix and title-cases the rest', () => {
    expect(humanizeObjectName('Adductor magnus.l')).toBe('Adductor Magnus');
    expect(humanizeObjectName('Adductor magnus.r')).toBe('Adductor Magnus');
  });

  it('strips a lettered+numbered variant/laterality suffix (e.g. ".e1l", ".o2r")', () => {
    expect(humanizeObjectName('Plantar interossei muscles.e1l')).toBe('Plantar Interossei Muscles');
    expect(humanizeObjectName('Something weird.o2r')).toBe('Something Weird');
  });

  it('normalizes underscores and collapsed whitespace left behind by stripped punctuation', () => {
    // Real case: "(Abdominal part of pectoralis major muscle).l" loses its parentheses on export
    // to an OBJ filename, which objectNameFromObjFileName recovers as a trailing-space variant.
    expect(humanizeObjectName('Abdominal part of pectoralis major muscle .l')).toBe(
      'Abdominal Part Of Pectoralis Major Muscle',
    );
  });

  it('leaves a name with no laterality suffix untouched apart from title-casing', () => {
    expect(humanizeObjectName('pectoralis major muscle')).toBe('Pectoralis Major Muscle');
  });
});

describe('resolvePackageLabel', () => {
  const catalog: CatalogBuildResult = {
    structures: [
      structure({
        id: 'za:adductor-magnus',
        name: 'Adductor magnus',
        englishName: 'Adductor magnus',
        portugueseName: 'Músculo adutor magno',
        objectNames: ['Adductor magnus.l', 'Adductor magnus.r'],
      }),
      structure({
        id: 'za:no-portuguese-yet',
        name: 'Some gap structure',
        englishName: 'Some gap structure',
        portugueseName: null,
        objectNames: ['Some gap structure.l'],
      }),
    ],
    unmappedToTa2: [],
    duplicateEnglishNamesInTa2: [],
    cycles: [],
  };

  it('prefers the catalog match\'s Portuguese name', () => {
    const result = resolvePackageLabel(catalog, 'Adductor magnus.l');
    expect(result).toEqual({ label: 'Músculo adutor magno', source: 'portuguese' });
  });

  it('falls back to the catalog match\'s English name when Portuguese is a known TA2 gap', () => {
    const result = resolvePackageLabel(catalog, 'Some gap structure.l');
    expect(result).toEqual({ label: 'Some gap structure', source: 'english' });
  });

  it('falls back to a humanized object name when there is no catalog match at all', () => {
    const result = resolvePackageLabel(catalog, 'Totally unmapped thing.r');
    expect(result).toEqual({ label: 'Totally Unmapped Thing', source: 'humanized' });
  });

  it('falls back to humanized when no catalog is supplied', () => {
    const result = resolvePackageLabel(null, 'Adductor magnus.l');
    expect(result).toEqual({ label: 'Adductor Magnus', source: 'humanized' });
  });

  it('strips a leading "N: " top-level-system index prefix from a real Portuguese/English catalog name', () => {
    const catalogWithIndexedNames: CatalogBuildResult = {
      structures: [
        structure({
          id: 'za:muscular-insertions',
          englishName: '2: Muscular insertions',
          portugueseName: '2: Inserções musculares',
          objectNames: ['Some insertion.l'],
        }),
      ],
      unmappedToTa2: [],
      duplicateEnglishNamesInTa2: [],
      cycles: [],
    };

    expect(resolvePackageLabel(catalogWithIndexedNames, 'Some insertion.l')).toEqual({
      label: 'Inserções musculares',
      source: 'portuguese',
    });
  });
});

describe('objectNamesBySlug', () => {
  it('recovers each real object name from its v2-export OBJ filename, keyed by the same slug build-release.ts uses for the package id', () => {
    const index = objectNamesBySlug([
      '00002_Abdominal_part_of_pectoralis_major_muscle_.l.obj',
      '00115_Adductor_magnus.l.obj',
      'not-an-obj-file.txt',
    ]);

    expect(index.get('abdominal-part-of-pectoralis-major-muscle-l')).toBe(
      'Abdominal part of pectoralis major muscle .l',
    );
    expect(index.get('adductor-magnus-l')).toBe('Adductor magnus.l');
    expect(index.size).toBe(2);
  });

  it('keeps the first object name on a slug collision rather than throwing', () => {
    const index = objectNamesBySlug(['00000_Foo.l.obj', '00001_FOO.l.obj']);
    expect(index.size).toBe(1);
    expect(index.get('foo-l')).toBe('Foo.l');
  });
});

describe('labelFlatManifest', () => {
  const catalog: CatalogBuildResult = {
    structures: [
      structure({
        id: 'za:adductor-magnus',
        englishName: 'Adductor magnus',
        portugueseName: 'Músculo adutor magno',
        objectNames: ['Adductor magnus.l'],
      }),
      structure({
        id: 'za:no-portuguese-yet',
        englishName: 'Some gap structure',
        portugueseName: null,
        objectNames: ['Some gap structure.r'],
      }),
    ],
    unmappedToTa2: [],
    duplicateEnglishNamesInTa2: [],
    cycles: [],
  };

  const objFileNames = [
    '00115_Adductor_magnus.l.obj',
    '00200_Some_gap_structure.r.obj',
    '00300_Totally_unmapped_thing.l.obj',
  ];

  it('labels every resolvable package and tallies which source each label came from', () => {
    const input = manifest([
      manifestPackage({ id: 'adductor-magnus-l' }),
      manifestPackage({ id: 'some-gap-structure-r' }),
      manifestPackage({ id: 'totally-unmapped-thing-l' }),
    ]);

    const { manifest: labeled, stats } = labelFlatManifest(input, objFileNames, catalog);

    expect(labeled.packages.find((p) => p.id === 'adductor-magnus-l')?.label).toBe('Músculo adutor magno');
    expect(labeled.packages.find((p) => p.id === 'some-gap-structure-r')?.label).toBe('Some gap structure');
    expect(labeled.packages.find((p) => p.id === 'totally-unmapped-thing-l')?.label).toBe('Totally Unmapped Thing');

    expect(stats).toEqual({
      total: 3,
      portuguese: 1,
      english: 1,
      humanized: 1,
      unresolvedPackageIds: [],
    });
  });

  it('tracks (without throwing) a package id with no matching real object name', () => {
    const input = manifest([manifestPackage({ id: 'no-such-object-anywhere' })]);

    const { manifest: labeled, stats } = labelFlatManifest(input, objFileNames, catalog);

    expect(labeled.packages[0]!.label).toBeUndefined();
    expect(stats.unresolvedPackageIds).toEqual(['no-such-object-anywhere']);
  });

  it('never mutates the input manifest', () => {
    const input = manifest([manifestPackage({ id: 'adductor-magnus-l' })]);
    const inputCopy = JSON.parse(JSON.stringify(input));

    labelFlatManifest(input, objFileNames, catalog);

    expect(input).toEqual(inputCopy);
  });
});

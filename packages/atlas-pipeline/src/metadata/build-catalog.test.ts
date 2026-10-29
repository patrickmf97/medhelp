import { describe, expect, it } from 'vitest';

import { buildCatalog } from './build-catalog';
import type { SceneDump, Ta2Row } from './types';

const ta2Fixture: Ta2Row[] = [
  { ta2Id: '98', english: 'Head', latin: 'Caput', portuguese: 'Cabeça' },
  { ta2Id: '101', english: 'Forehead', latin: 'Frons', portuguese: 'Testa' },
  { ta2Id: '5120', english: 'Heart', latin: 'Cor', portuguese: 'Coração' },
  { ta2Id: '5121', english: 'Kidney', latin: 'Ren', portuguese: 'Rim' },
  { ta2Id: '7777', english: 'Kidney', latin: 'Ren duplicatus', portuguese: 'Rim' },
];

function makeSceneFixture(): SceneDump {
  return {
    sceneRootChildren: ['1: Skeletal system', '5: Cardiovascular system'],
    collections: {
      '1: Skeletal system': { name: '1: Skeletal system', children: ['Head'], objectNames: [] },
      Head: { name: 'Head', children: ['Forehead'], objectNames: ['Head.mesh'] },
      Forehead: { name: 'Forehead', children: [], objectNames: ['Forehead.l', 'Forehead.r'] },
      '5: Cardiovascular system': {
        name: '5: Cardiovascular system',
        children: ['Heart', 'Kidney'],
        objectNames: [],
      },
      Heart: { name: 'Heart', children: ['Mystery organ'], objectNames: ['Heart.mesh'] },
      'Mystery organ': { name: 'Mystery organ', children: [], objectNames: ['Mystery.mesh'] },
      Kidney: { name: 'Kidney', children: ['Kidney lobe'], objectNames: [] },
      'Kidney lobe': { name: 'Kidney lobe', children: [], objectNames: ['KidneyLobe.mesh'] },
      'Cycletest A': { name: 'Cycletest A', children: ['Cycletest B'], objectNames: [] },
      'Cycletest B': { name: 'Cycletest B', children: ['Cycletest A'], objectNames: [] },
    },
  };
}

function byName(result: ReturnType<typeof buildCatalog>, name: string) {
  const match = result.structures.find((s) => s.name === name);
  if (!match) throw new Error(`fixture missing expected structure "${name}"`);
  return match;
}

describe('buildCatalog', () => {
  it('assigns stable ids derived from the full hierarchical path', () => {
    const result = buildCatalog(ta2Fixture, makeSceneFixture());
    const forehead = byName(result, 'Forehead');

    expect(forehead.id).toBe('za:skeletal-system/head/forehead');
    expect(forehead.parentId).toBe('za:skeletal-system/head');
    expect(forehead.depth).toBe(3);
    expect(forehead.path).toEqual(['1: Skeletal system', 'Head', 'Forehead']);
  });

  it('is idempotent: rebuilding from the same fixture twice yields identical ids and records', () => {
    const first = buildCatalog(ta2Fixture, makeSceneFixture());
    const second = buildCatalog(ta2Fixture, makeSceneFixture());

    expect(second).toEqual(first);
  });

  it('matches Portuguese, English and Latin aliases from TA2', () => {
    const result = buildCatalog(ta2Fixture, makeSceneFixture());
    const heart = byName(result, 'Heart');

    expect(heart.ta2Id).toBe('5120');
    expect(heart.englishName).toBe('Heart');
    expect(heart.latinName).toBe('Cor');
    expect(heart.portugueseName).toBe('Coração');
  });

  it('reports structures with no TA2 match as unmapped', () => {
    const result = buildCatalog(ta2Fixture, makeSceneFixture());
    expect(result.unmappedToTa2).toContain('Mystery organ');
  });

  it('flags duplicate English names in the TA2 source and resolves matches deterministically', () => {
    const result = buildCatalog(ta2Fixture, makeSceneFixture());
    expect(result.duplicateEnglishNamesInTa2).toContain('kidney');

    const kidney = byName(result, 'Kidney');
    // Deterministic: always the lowest ta2Id among the ambiguous duplicates.
    expect(kidney.ta2Id).toBe('5121');
  });

  it('tags the Kidney structure as the NC exclusion and propagates it to descendants that do not repeat the name', () => {
    const result = buildCatalog(ta2Fixture, makeSceneFixture());
    const kidney = byName(result, 'Kidney');
    const kidneyLobe = byName(result, 'Kidney lobe');

    expect(kidney.license).toBe('cc-by-nc-4.0');
    expect(kidney.excluded).toBe(true);
    expect(kidneyLobe.license).toBe('cc-by-nc-4.0');
    expect(kidneyLobe.excluded).toBe(true);
    expect(kidneyLobe.excludedReason).toContain('Kidney');
  });

  it('defaults unrelated structures to the CC BY-SA 4.0 license and not excluded', () => {
    const result = buildCatalog(ta2Fixture, makeSceneFixture());
    const heart = byName(result, 'Heart');

    expect(heart.license).toBe('cc-by-sa-4.0');
    expect(heart.excluded).toBe(false);
    expect(heart.excludedReason).toBeNull();
  });

  it('detects a cycle among structures without hanging, and does not let it corrupt unrelated branches', () => {
    const result = buildCatalog(ta2Fixture, makeSceneFixture());

    expect(result.cycles.length).toBeGreaterThan(0);
    expect(result.cycles[0]).toEqual(expect.arrayContaining(['Cycletest A', 'Cycletest B']));

    // the cycle must not prevent unrelated parts of the tree from building correctly
    expect(byName(result, 'Forehead').id).toBe('za:skeletal-system/head/forehead');
  });

  it('never produces a structure whose id equals its own parentId (no structure is its own ancestor)', () => {
    const result = buildCatalog(ta2Fixture, makeSceneFixture());
    for (const structure of result.structures) {
      expect(structure.id).not.toBe(structure.parentId);
    }
  });
});

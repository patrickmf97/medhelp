import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseTa2Csv } from './parse-ta2';

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, '..', '..', 'fixtures', 'metadata', 'ta2-sample.csv');

describe('parseTa2Csv', () => {
  it('parses the real TA2 column layout (semicolon-delimited, whole-line-quoted, BOM-prefixed)', () => {
    const content = readFileSync(fixturePath, 'utf-8');
    const rows = parseTa2Csv(content);

    expect(rows).toEqual([
      { ta2Id: '1', english: 'General terms', latin: 'Termini generales', portuguese: 'Termos gerais' },
      { ta2Id: '98', english: 'Head', latin: 'Caput', portuguese: 'Cabeça' },
      { ta2Id: '101', english: 'Forehead', latin: 'Frons', portuguese: 'Testa' },
      { ta2Id: '5120', english: 'Heart', latin: 'Cor', portuguese: 'Coração' },
      { ta2Id: '5121', english: 'Kidney', latin: 'Ren', portuguese: 'Rim' },
      { ta2Id: '7777', english: 'Kidney', latin: 'Ren duplicatus', portuguese: 'Rim' },
    ]);
  });

  it('skips the header row and trailing empty placeholder rows', () => {
    const rows = parseTa2Csv(readFileSync(fixturePath, 'utf-8'));
    expect(rows.some((row) => row.ta2Id === 'TA2ID')).toBe(false);
    expect(rows.every((row) => row.ta2Id.trim() !== '')).toBe(true);
  });

  it('handles a minimal in-memory CSV without a BOM', () => {
    const csv = '"TA2ID;English;Latin;Français;Español;Portugues;Italiano;Parsi"\n"1;Foo;Fooum;;;Fuu;;"\n';
    expect(parseTa2Csv(csv)).toEqual([{ ta2Id: '1', english: 'Foo', latin: 'Fooum', portuguese: 'Fuu' }]);
  });
});

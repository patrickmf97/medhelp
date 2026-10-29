import type { Ta2Row } from './types';

const EXPECTED_HEADER_FIRST_COLUMN = 'TA2ID';

/**
 * Parses Terminologia Anatomica 2 (TA2.csv) as actually shipped by Z-Anatomy: UTF-8 with a BOM,
 * one anatomical term per line, the whole line wrapped in a single pair of double quotes, and
 * fields inside separated by semicolons (not commas) in column order:
 *   TA2ID; English; Latin; Français; Español; Portugues; Italiano; Parsi
 *
 * Only the columns MEDHELP actually needs (id, English, Latin, Portuguese) are kept. The header
 * row and trailing empty placeholder rows (e.g. `";;;;;;;"`) are skipped.
 */
export function parseTa2Csv(content: string): Ta2Row[] {
  const BOM_CHAR_CODE = 0xfeff;
  const withoutBom = content.charCodeAt(0) === BOM_CHAR_CODE ? content.slice(1) : content;
  const rows: Ta2Row[] = [];

  for (const rawLine of withoutBom.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '') continue;

    const unquoted = line.startsWith('"') && line.endsWith('"') ? line.slice(1, -1) : line;
    const fields = unquoted.split(';');

    const ta2Id = (fields[0] ?? '').trim();
    if (ta2Id === '' || ta2Id === EXPECTED_HEADER_FIRST_COLUMN) continue;

    rows.push({
      ta2Id,
      english: (fields[1] ?? '').trim(),
      latin: (fields[2] ?? '').trim(),
      portuguese: (fields[5] ?? '').trim(),
    });
  }

  return rows;
}

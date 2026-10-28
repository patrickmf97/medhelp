import { detectCycles } from './detect-cycles';
import { classifySelfLicense } from './license-rules';
import { normalizeName, slugify } from './normalize-name';
import { DEFAULT_LICENSE } from './types';
import type { AnatomyStructureRecord, CatalogBuildResult, LicenseClassification, SceneDump, Ta2Row } from './types';

function buildTa2Index(rows: Ta2Row[]): Map<string, Ta2Row[]> {
  const index = new Map<string, Ta2Row[]>();
  for (const row of rows) {
    const key = normalizeName(row.english);
    const bucket = index.get(key);
    if (bucket) bucket.push(row);
    else index.set(key, [row]);
  }
  return index;
}

/**
 * Builds a flat parent-pointer map across every collection in the scene (not just ones reachable
 * from a declared root), by inverting each collection's `children` links. Used both to run
 * cycle detection over the whole graph and as a lookup during tree traversal.
 */
function buildParentPointers(scene: SceneDump): Map<string, string | null> {
  const parentOf = new Map<string, string | null>();

  for (const name of Object.keys(scene.collections)) {
    parentOf.set(name, null);
  }
  for (const [name, collection] of Object.entries(scene.collections)) {
    for (const child of collection.children) {
      // First parent wins; the real scene graph has zero collections with more than one parent.
      if (!parentOf.has(child) || parentOf.get(child) === null) {
        parentOf.set(child, name);
      }
    }
  }
  for (const rootName of scene.sceneRootChildren) {
    parentOf.set(rootName, null);
  }

  return parentOf;
}

export function buildCatalog(ta2Rows: Ta2Row[], scene: SceneDump): CatalogBuildResult {
  const ta2Index = buildTa2Index(ta2Rows);
  const duplicateEnglishNamesInTa2 = [...ta2Index.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([name]) => name)
    .sort();

  const parentOf = buildParentPointers(scene);
  const cycles = detectCycles([...parentOf.entries()].map(([id, parentId]) => ({ id, parentId })));
  const cyclicNames = new Set(cycles.flat());

  const structures: AnatomyStructureRecord[] = [];
  const unmappedToTa2: string[] = [];
  const visited = new Set<string>();
  const licenseById = new Map<string, LicenseClassification>();
  const idByName = new Map<string, string>();

  function visit(name: string, parentId: string | null, parentPath: string[]): void {
    if (visited.has(name)) return;
    const collection = scene.collections[name];
    if (!collection) return;

    visited.add(name);

    const path = [...parentPath, name];
    const id = `za:${slugify(path)}`;
    idByName.set(name, id);

    const selfLicense = classifySelfLicense(name);
    const parentLicense = parentId ? licenseById.get(parentId) ?? null : null;
    const licenseInfo: LicenseClassification =
      selfLicense ?? parentLicense ?? { license: DEFAULT_LICENSE, excluded: false, reason: null };
    licenseById.set(id, licenseInfo);

    const normalized = normalizeName(name);
    const candidates = ta2Index.get(normalized) ?? [];
    const match =
      candidates.length > 0 ? [...candidates].sort((a, b) => Number(a.ta2Id) - Number(b.ta2Id))[0]! : null;
    if (!match) unmappedToTa2.push(name);

    structures.push({
      id,
      name,
      path,
      parentId,
      depth: path.length,
      ta2Id: match?.ta2Id ?? null,
      englishName: match?.english ?? null,
      latinName: match?.latin ?? null,
      portugueseName: match?.portuguese ?? null,
      license: licenseInfo.license,
      excluded: licenseInfo.excluded,
      excludedReason: licenseInfo.reason,
      objectNames: [...collection.objectNames],
    });

    // Do not recurse into a child that participates in a detected cycle: it has already been
    // reported in `cycles`, and walking into it here would either loop forever or silently
    // re-parent it under the wrong ancestor. `visited` alone prevents infinite recursion, but
    // skipping cyclic children keeps the resulting tree free of structures whose correctness we
    // cannot vouch for.
    for (const child of collection.children) {
      if (cyclicNames.has(child) && cyclicNames.has(name)) continue;
      visit(child, id, path);
    }
  }

  for (const rootName of scene.sceneRootChildren) {
    visit(rootName, null, []);
  }

  return {
    structures,
    unmappedToTa2: [...new Set(unmappedToTa2)].sort(),
    duplicateEnglishNamesInTa2,
    cycles,
  };
}

import type { ConvertedAsset } from '../convert/convert-glb';
import type { AnatomyStructureRecord } from '../metadata/types';

export type AssetPackage = {
  /** Stable, slugified id: "<system-slug>-<partIndex>" (e.g. "nervous-system-0"). */
  id: string;
  /** The real, human-readable system/region name this package belongs to (see groupKeyForPath). */
  groupKey: string;
  /** Every asset this package owns, in a fixed deterministic order (see the sort in groupAssets). */
  assets: ConvertedAsset[];
  /** Sum of every asset's buffer length, in bytes. */
  byteSize: number;
};

const BONUS_COLLECTION_WRAPPER = 'Bonus collection';

/** The bucket name for assets whose structureId is null or not present in the given catalog. */
export const UNMAPPED_GROUP_KEY = 'unmapped';

/**
 * Maximum bytes a single package is allowed to accumulate before a group's assets spill into a
 * new part. The real pipeline's goal (per the Atlas plan) is a viewer that loads one
 * system/region at a time rather than the whole atlas up front, so this budget is sized around
 * "one fetch, fast": 4 MiB comfortably downloads and parses in well under a second on a typical
 * mobile connection, while staying an order of magnitude above the largest *single* real
 * Meshopt-compressed GLB measured in Task 4's benchmark (~589 KB, for the single largest mesh in
 * the entire 4,552-file export — see docs/atlas/compression-benchmark.md) so no realistic single
 * asset can blow the budget on its own. Z-Anatomy's own largest system groupings (e.g. "Nervous
 * system", with hundreds of real meshes) comfortably exceed this on their own and are expected to
 * split into several numbered parts — see the "-0", "-1", ... package ids below.
 */
export const DEFAULT_MAX_PACKAGE_BYTES = 4 * 1024 * 1024;

/**
 * Resolves a catalog structure's real anatomical system/region name from its full ancestor path.
 *
 * Z-Anatomy's scene graph has two independent trees that both ultimately classify the same
 * objects: eleven flat, numbered top-level collections ("4: Muscular system", directly listing
 * hundreds of objects with no sub-collections), and a single deep "Bonus collection" tree that
 * re-derives the same systems (and more — "Arthrology", "Regions of human body", ...) as nested
 * sub-collections. In the real data, the overwhelming majority of catalog structures nest under
 * "Bonus collection" (1,933 of 1,944 in the full real catalog), so grouping by `path[0]` alone
 * would dump nearly everything into one "Bonus collection" bucket. Unwrapping one level in that
 * case recovers the real system/region name ("Nervous system", "Skeletal system", ...) that the
 * plan's "package systems/regions" goal actually means — see docs/atlas/provenance.md for the
 * real scene-graph layout this mirrors.
 */
export function groupKeyForPath(path: readonly string[]): string {
  if (path[0] === BONUS_COLLECTION_WRAPPER && path.length > 1) {
    return path[1]!;
  }
  return path[0] ?? UNMAPPED_GROUP_KEY;
}

/** Builds a stable, filesystem/id-safe slug from a real system/region name (not path-aware — see
 * metadata/normalize-name.ts's `slugify` for the path-based structure-id variant this mirrors). */
function slugifyGroupKey(key: string): string {
  return key
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^\d+:\s*/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** One atomic, never-split unit of packing: either every asset sharing a single structureId
 * (so that structure is always owned by exactly one package), or a single unmapped asset. */
type PackingUnit = {
  sortKey: string;
  assets: ConvertedAsset[];
  byteSize: number;
};

function buildPackingUnits(assets: readonly ConvertedAsset[]): PackingUnit[] {
  const byStructureId = new Map<string, ConvertedAsset[]>();
  const unmapped: ConvertedAsset[] = [];

  for (const asset of assets) {
    if (asset.structureId === null) {
      unmapped.push(asset);
      continue;
    }
    const bucket = byStructureId.get(asset.structureId);
    if (bucket) bucket.push(asset);
    else byStructureId.set(asset.structureId, [asset]);
  }

  const units: PackingUnit[] = [];
  for (const [structureId, structureAssets] of byStructureId) {
    // Sorted by objectName (not left as encountered) so a unit's own internal asset order is
    // just as input-order-independent as the group/unit ordering around it.
    const sortedAssets = [...structureAssets].sort((a, b) => a.objectName.localeCompare(b.objectName));
    units.push({
      sortKey: `0:${structureId}`,
      assets: sortedAssets,
      byteSize: sortedAssets.reduce((sum, a) => sum + a.buffer.byteLength, 0),
    });
  }
  for (const asset of unmapped) {
    units.push({
      sortKey: `1:${asset.objectName}`,
      assets: [asset],
      byteSize: asset.buffer.byteLength,
    });
  }

  return units.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

/**
 * Groups converted GLB assets into byte-budgeted packages by their structure's real anatomical
 * system/region (see groupKeyForPath), so a future viewer can load one system/region at a time.
 *
 * Packing within a group is a simple deterministic greedy bin-pack over `maxPackageBytes`:
 * assets are first collapsed into atomic units (every asset sharing one structureId stays
 * together — see buildPackingUnits), sorted into a fixed order, then appended to the current
 * package until adding the next unit would exceed the budget, at which point a new part starts.
 * A single unit bigger than the budget on its own still becomes its own (over-budget) package
 * rather than being split — atomic structure ownership (every structure owned by exactly one
 * package, never two) takes priority over the byte budget, which is a soft target.
 *
 * Both the group iteration order and the packing order within each group are fully determined by
 * sorted keys (never by input array order or Map iteration order), so the same input assets
 * always produce byte-identical packages regardless of what order they're passed in.
 */
export function groupAssets(
  assets: readonly ConvertedAsset[],
  structures: readonly AnatomyStructureRecord[],
  maxPackageBytes: number = DEFAULT_MAX_PACKAGE_BYTES,
): AssetPackage[] {
  const structureById = new Map(structures.map((s) => [s.id, s]));

  const byGroupKey = new Map<string, ConvertedAsset[]>();
  for (const asset of assets) {
    const structure = asset.structureId !== null ? structureById.get(asset.structureId) ?? null : null;
    const groupKey = structure ? groupKeyForPath(structure.path) : UNMAPPED_GROUP_KEY;
    const bucket = byGroupKey.get(groupKey);
    if (bucket) bucket.push(asset);
    else byGroupKey.set(groupKey, [asset]);
  }

  const packages: AssetPackage[] = [];

  for (const groupKey of [...byGroupKey.keys()].sort()) {
    const units = buildPackingUnits(byGroupKey.get(groupKey)!);
    const slug = slugifyGroupKey(groupKey);

    let partIndex = 0;
    let currentAssets: ConvertedAsset[] = [];
    let currentBytes = 0;

    const flush = (): void => {
      if (currentAssets.length === 0) return;
      packages.push({ id: `${slug}-${partIndex}`, groupKey, assets: currentAssets, byteSize: currentBytes });
      partIndex += 1;
      currentAssets = [];
      currentBytes = 0;
    };

    for (const unit of units) {
      if (currentAssets.length > 0 && currentBytes + unit.byteSize > maxPackageBytes) {
        flush();
      }
      currentAssets.push(...unit.assets);
      currentBytes += unit.byteSize;
    }
    flush();
  }

  return packages;
}

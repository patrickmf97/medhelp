import { LICENSE_URLS, MODIFICATION_NOTES } from '../convert/convert-glb';
import { DEFAULT_LICENSE } from '../metadata/types';
import type { AnatomyStructureRecord, LicenseTag } from '../metadata/types';
import type { AssetPackage } from './group-assets';
import { hashAssets } from './hash';

export type ManifestPackage = {
  id: string;
  groupKey: string;
  byteSize: number;
  /** sha256 content hash of this package's assets (see hash.ts) — changes if any asset's bytes,
   * name, membership, or order changes. Used both for integrity checking and to detect unchanged
   * content across rebuilds. */
  hash: string;
  /** Every catalog structure id this package owns, sorted. A structure id appears in exactly one
   * package's structureIds across the whole manifest (see buildManifest). */
  structureIds: string[];
  /** Human-readable display name for this package, in Portuguese when available. Optional and
   * additive: `buildManifest` itself never sets it (a system/region package can bundle many
   * objects, so it has no single display name) — it is only populated by the one-GLB-per-package
   * "flattened" manifest layout (see cli/label-flat-manifest.ts), where each package already
   * corresponds to exactly one real anatomical structure. Absent (undefined) on any manifest this
   * field doesn't apply to, never an empty string. */
  label?: string;
};

export type ManifestStructure = {
  id: string;
  name: string;
  englishName: string | null;
  latinName: string | null;
  portugueseName: string | null;
  license: LicenseTag;
  /** The single package that owns this structure's asset(s). */
  packageId: string;
  /** The parent structure id from the metadata catalog's hierarchy, or null at a tree root. May
   * reference a structure id that is not itself present in `structures` (an ancestor collection
   * with no directly-attached, packaged asset of its own) — consult the full metadata catalog
   * for ancestors beyond this manifest's own structure list. */
  parentId: string | null;
};

export type AtlasManifestV1 = {
  schemaVersion: 1;
  /** Top-level source attribution for the release as a whole. Per-structure license is recorded
   * individually on each entry in `structures` (the dataset mixes CC BY-SA 4.0 default content
   * with a few CC BY 4.0 exceptions — see metadata/license-rules.ts); this is the default,
   * primary license and provenance text, mirrored from convert/convert-glb.ts so every published
   * asset and the manifest that describes them agree on the same wording. */
  source: {
    name: string;
    license: LicenseTag;
    licenseUrl: string;
    modificationNotes: string;
  };
  /** Sorted by package id. */
  packages: ManifestPackage[];
  /** Sorted by structure id. Never includes a license-excluded structure (see
   * metadata/license-rules.ts) — even defensively, if one somehow still reached this function. */
  structures: ManifestStructure[];
};

/**
 * Builds the versioned release manifest from already-grouped packages (see group-assets.ts) and
 * the full metadata catalog (for structure names/licenses/hierarchy — see
 * metadata/build-catalog.ts). Every ordering decision here is driven by a sort on a stable key
 * (ids), never by the input packages'/structures' array order or any Map iteration order, so two
 * builds from the same (possibly differently-ordered) input produce a byte-identical manifest —
 * see manifest.test.ts's determinism tests.
 *
 * Deliberately excludes a wall-clock timestamp or any other field that would vary between two
 * builds of identical input: the plan's "byte-identical manifest" determinism requirement is
 * exact-equality, not "equal except for build time".
 */
export function buildManifest(packages: readonly AssetPackage[], structures: readonly AnatomyStructureRecord[]): AtlasManifestV1 {
  const structureById = new Map(structures.map((s) => [s.id, s]));
  const packageIdByStructureId = new Map<string, string>();

  const manifestPackages: ManifestPackage[] = packages
    .map((pkg): ManifestPackage => {
      const structureIds = [...new Set(pkg.assets.map((a) => a.structureId).filter((id): id is string => id !== null))]
        .filter((id) => {
          const structure = structureById.get(id);
          // Defense in depth only: cli/build-release.ts and cli/convert.ts both already refuse to
          // convert a license-excluded structure's objects in the first place, so this should
          // never trigger on real input — but a manifest must never list excluded content
          // regardless of how an asset for it got here.
          return structure !== undefined && !structure.excluded;
        })
        .sort();

      for (const id of structureIds) {
        packageIdByStructureId.set(id, pkg.id);
      }

      return {
        id: pkg.id,
        groupKey: pkg.groupKey,
        byteSize: pkg.byteSize,
        hash: hashAssets(pkg.assets),
        structureIds,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const manifestStructures: ManifestStructure[] = [...packageIdByStructureId.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, packageId]): ManifestStructure => {
      const structure = structureById.get(id);
      if (!structure) {
        // Unreachable: packageIdByStructureId is only ever populated from ids already resolved
        // against structureById above.
        throw new Error(`Manifest references unknown structure id: ${id}`);
      }
      return {
        id: structure.id,
        name: structure.name,
        englishName: structure.englishName,
        latinName: structure.latinName,
        portugueseName: structure.portugueseName,
        license: structure.license,
        packageId,
        parentId: structure.parentId,
      };
    });

  return {
    schemaVersion: 1,
    source: {
      name: 'Z-Anatomy — The libre 3D atlas of anatomy (derived from BodyParts3D)',
      license: DEFAULT_LICENSE,
      licenseUrl: LICENSE_URLS[DEFAULT_LICENSE],
      modificationNotes: MODIFICATION_NOTES,
    },
    packages: manifestPackages,
    structures: manifestStructures,
  };
}

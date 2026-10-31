import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

import type { CatalogBuildResult } from '../metadata/types';
import { slugify } from '../metadata/normalize-name';
import type { AtlasManifestV1, ManifestPackage } from '../package/manifest';
import { objectNameFromObjFileName, resolveStructureInfo } from './convert';

export type LabelSource = 'portuguese' | 'english' | 'humanized';

export type LabelResolution = { label: string; source: LabelSource };

/**
 * Strips a trailing Z-Anatomy laterality/variant suffix (".l", ".r", ".ol", ".or", ".el", ".er",
 * ".e1l", ".e2r", …; see export-v2/obj's real filenames for the full set of these suffixes) from
 * an object name, then normalizes underscores/whitespace and title-cases what remains. This is
 * only the last-resort display name for a package whose object name has no catalog match at all
 * (see `resolvePackageLabel`) — it never tries to translate the laterality back in (e.g. into
 * "esquerdo"/"direito"), it just drops it so the remaining words read as a plain structure name.
 */
export function humanizeObjectName(objectName: string): string {
  const withoutLaterality = objectName.replace(/\.(?:[eo]\d*)?[lr]$/i, '');
  const normalized = withoutLaterality.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  if (normalized.length === 0) {
    // Defensive only: a real object name is never just a laterality suffix on its own.
    return objectName.trim();
  }
  return normalized
    .split(' ')
    .map((word) => (word.length === 0 ? word : word[0]!.toUpperCase() + word.slice(1).toLowerCase()))
    .join(' ');
}

/**
 * Strips a leading "N: " top-level-system index prefix (e.g. "2: Inserções musculares" ->
 * "Inserções musculares") from a catalog name string. Several real top-level system/region
 * structures carry this numbering in their `name`/`englishName`/`portugueseName` fields (see the
 * real catalog.json), and `resolveStructureInfo`'s own "first ta2Id-mapped match wins" rule (see
 * its doc comment in cli/convert.ts) frequently resolves a specific leaf object to one of these
 * broad top-level structures rather than a more specific descendant — this already matches the
 * same structure id the pipeline already bakes into that asset's color (see build-release.ts), so
 * it is not something this label step changes. This helper only cleans up the raw digit prefix
 * for display, mirroring the same pattern apps/web's navigation panel already applies to
 * `groupKey` (see atlas-real-viewer.tsx's `displayLabel`) — it never changes which structure
 * supplied the name.
 */
function stripSystemIndexPrefix(name: string): string {
  return name.replace(/^\d+:\s*/, '');
}

/**
 * Resolves one package's real Z-Anatomy object name to a Portuguese-first display label:
 *  1. A catalog match with a real `portugueseName` (the common case — 88.7% of the real dataset).
 *  2. That same match's `englishName`, when the TA2 mapping has no Portuguese name for it yet (a
 *     documented, known gap — see this task's report for the real coverage numbers).
 *  3. A humanized version of the raw object name, when the object has no catalog match at all.
 *
 * Reuses `resolveStructureInfo` (cli/convert.ts) rather than re-deriving which structure a given
 * object name belongs to, so a package's label always agrees with the same structure its
 * color/grouping already resolved to during conversion.
 */
export function resolvePackageLabel(catalog: CatalogBuildResult | null, objectName: string): LabelResolution {
  const info = resolveStructureInfo(catalog, objectName);
  const structure = info.structureId !== null ? catalog?.structures.find((s) => s.id === info.structureId) ?? null : null;

  if (structure?.portugueseName) {
    return { label: stripSystemIndexPrefix(structure.portugueseName), source: 'portuguese' };
  }
  if (structure?.englishName) {
    return { label: stripSystemIndexPrefix(structure.englishName), source: 'english' };
  }
  return { label: humanizeObjectName(objectName), source: 'humanized' };
}

/**
 * Builds a `slugify([objectName]) -> objectName` index from a real v2 export's OBJ filenames —
 * the exact inverse of how a flattened package's id was produced in the first place
 * (`cli/build-release.ts` writes each asset as `${slugify([asset.objectName])}.glb`, and the
 * one-off flattening this task fixes up kept that same filename, minus the extension, as the
 * package id). Non-`.obj` entries are ignored. On a slug collision (two distinct object names
 * normalizing to the same slug — not expected against the real dataset, see build-release.ts's
 * own comment on this) the first object name encountered wins; this never throws, since a label
 * is strictly better-than-nothing informational metadata, never a build-blocking concern.
 */
export function objectNamesBySlug(objFileNames: readonly string[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const file of objFileNames) {
    if (!file.endsWith('.obj')) continue;
    const objectName = objectNameFromObjFileName(file);
    const slug = slugify([objectName]);
    if (!result.has(slug)) {
      result.set(slug, objectName);
    }
  }
  return result;
}

export type LabelFlatManifestStats = {
  total: number;
  portuguese: number;
  english: number;
  humanized: number;
  /** Package ids with no matching real object name at all (not expected for a real flat
   * manifest built from this same OBJ export, but tracked rather than silently dropped). */
  unresolvedPackageIds: string[];
};

/**
 * Pure labeling step for Task "Part 1" of the labels/callouts work: given an already-built flat
 * manifest (one GLB per individual structure, `structures: []`, see apps/web/public/atlas's real
 * manifest.json), the real v2 export's OBJ filenames (to recover each package's original Z-
 * Anatomy object name — the flattening step lost this), and the real metadata catalog, returns a
 * new manifest whose every package additionally carries a `label` (see `ManifestPackage.label`)
 * plus resolution stats for reporting. Never mutates its inputs.
 */
export function labelFlatManifest(
  manifest: AtlasManifestV1,
  objFileNames: readonly string[],
  catalog: CatalogBuildResult | null,
): { manifest: AtlasManifestV1; stats: LabelFlatManifestStats } {
  const nameBySlug = objectNamesBySlug(objFileNames);
  const unresolvedPackageIds: string[] = [];
  let portuguese = 0;
  let english = 0;
  let humanized = 0;

  const packages: ManifestPackage[] = manifest.packages.map((pkg) => {
    const objectName = nameBySlug.get(pkg.id);
    if (objectName === undefined) {
      unresolvedPackageIds.push(pkg.id);
      return pkg;
    }

    const resolution = resolvePackageLabel(catalog, objectName);
    if (resolution.source === 'portuguese') portuguese += 1;
    else if (resolution.source === 'english') english += 1;
    else humanized += 1;

    return { ...pkg, label: resolution.label };
  });

  return {
    manifest: { ...manifest, packages },
    stats: { total: manifest.packages.length, portuguese, english, humanized, unresolvedPackageIds },
  };
}

type CliArgs = { manifestPath: string; objDir: string; catalogPath: string };

function parseArgs(argv: string[]): CliArgs {
  const [manifestPath, objDir, catalogPath] = argv;
  if (!manifestPath || !objDir || !catalogPath) {
    throw new Error('Usage: node src/cli/label-flat-manifest.ts <manifestPath> <objDir> <catalogPath>');
  }
  return { manifestPath, objDir, catalogPath };
}

/**
 * CLI entry point: reads the real flat manifest + real v2 OBJ export directory + real metadata
 * catalog from disk, labels every package (see `labelFlatManifest`), and overwrites
 * `manifestPath` in place with the result. Written minified (no indentation), matching the
 * already-committed `apps/web/public/atlas/manifest.json`'s own format — unlike
 * cli/build-release.ts's pretty-printed pre-deploy output, this file is a production static
 * asset fetched directly by every visitor's browser, so keeping it compact (not re-formatting it
 * to the pipeline's pretty style) avoids needlessly inflating a ~600KB file that is otherwise
 * unrelated to this label-only edit.
 */
export function runLabelFlatManifest(args: CliArgs): { stats: LabelFlatManifestStats } {
  const manifest = JSON.parse(readFileSync(args.manifestPath, 'utf-8')) as AtlasManifestV1;
  const objFileNames = readdirSync(args.objDir);
  const catalog = JSON.parse(readFileSync(args.catalogPath, 'utf-8')) as CatalogBuildResult;

  const { manifest: labeled, stats } = labelFlatManifest(manifest, objFileNames, catalog);
  writeFileSync(args.manifestPath, JSON.stringify(labeled));
  return { stats };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));
  const { stats } = runLabelFlatManifest(args);
  console.log(
    `Labeled ${stats.total} packages: ${stats.portuguese} portuguese, ${stats.english} english fallback, ` +
      `${stats.humanized} humanized fallback. ${stats.unresolvedPackageIds.length} package id(s) had no matching real object name.`,
  );
}

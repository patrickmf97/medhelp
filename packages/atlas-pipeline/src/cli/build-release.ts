import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { compressWithMeshopt } from '../convert/compress';
import { convertMesh } from '../convert/convert-glb';
import type { ConvertedAsset } from '../convert/convert-glb';
import { parseObjMesh } from '../geometry/parse-obj-mesh';
import { slugify } from '../metadata/normalize-name';
import type { CatalogBuildResult } from '../metadata/types';
import { DEFAULT_MAX_PACKAGE_BYTES, UNMAPPED_GROUP_KEY, groupAssets, groupKeyForPath } from '../package/group-assets';
import { buildManifest } from '../package/manifest';
import type { AtlasManifestV1 } from '../package/manifest';
import { objectNameFromObjFileName, resolveStructureInfo } from './convert';

export type BuildReleaseArgs = {
  objDir: string;
  outDir: string;
  catalogPath: string;
  maxPackageBytes?: number;
};

export type BuildReleaseResult = {
  manifest: AtlasManifestV1;
  converted: number;
  skippedExcluded: number;
  /** Real, non-excluded OBJs with zero triangulated faces (reference-point markers such as
   * "Canal for vertebral artery.j" — see the guard below) that were skipped because there is no
   * surface to convert. */
  skippedDegenerate: number;
};

/**
 * End-to-end release build for Task 5 ("package systems/regions and emit a versioned
 * manifest"): converts every real OBJ in `objDir` to a Meshopt-compressed GLB (same
 * conversion/compression choices cli/convert.ts already made and benchmarked — see
 * docs/atlas/compression-benchmark.md), groups the results into byte-budgeted system/region
 * packages (package/group-assets.ts), and writes both the packaged GLBs and the release
 * manifest (package/manifest.ts) to `outDir`:
 *
 *   outDir/manifest.json
 *   outDir/packages/<packageId>/<slugified-object-name>.glb
 *
 * License-excluded structures (Inner Ear / Kidney, etc. — see metadata/license-rules.ts) are
 * skipped before conversion ever runs, exactly like cli/convert.ts: never converted, never
 * written to disk, never grouped, never present in the manifest.
 *
 * Two runs over the same `objDir`/`catalogPath` always produce a byte-identical manifest.json
 * (see group-assets.ts's and manifest.ts's own determinism guarantees) — this function adds no
 * further nondeterminism (no wall-clock timestamp, no random ids).
 */
export async function buildRelease(args: BuildReleaseArgs): Promise<BuildReleaseResult> {
  const catalog = JSON.parse(readFileSync(args.catalogPath, 'utf-8')) as CatalogBuildResult;
  // Mirrors groupAssets()'s own structureId -> groupKey resolution exactly, so the color baked
  // into each GLB here always matches the real system/region the asset ends up packaged under.
  const structureById = new Map(catalog.structures.map((s) => [s.id, s]));

  mkdirSync(args.outDir, { recursive: true });

  const files = readdirSync(args.objDir).filter((f) => f.endsWith('.obj'));
  const assets: ConvertedAsset[] = [];
  let skippedExcluded = 0;
  let skippedDegenerate = 0;

  for (const file of files) {
    const objectName = objectNameFromObjFileName(file);
    const info = resolveStructureInfo(catalog, objectName);

    if (info.excluded) {
      skippedExcluded += 1;
      continue;
    }

    const mesh = parseObjMesh(readFileSync(join(args.objDir, file), 'utf-8'));

    // Some real, non-excluded Z-Anatomy OBJs are reference-point markers (named with a ".j"
    // suffix, e.g. "Canal for vertebral artery.j") that passed Task 3's vertex-only validation
    // (non-empty, finite vertices) but have zero triangulated faces -- there is no surface to
    // render. Task 4's convertMesh()/compressWithMeshopt() pipeline does not guard against this
    // (the Meshopt encoder asserts on a mesh with no triangle data), so this is skipped
    // defensively here rather than letting one degenerate real mesh crash an entire release
    // build; see also the real-data run in the Task 5 PR description for how many of these exist
    // in the full export.
    if (mesh.faces.length === 0) {
      skippedDegenerate += 1;
      continue;
    }

    const structure = info.structureId !== null ? structureById.get(info.structureId) ?? null : null;
    const groupKey = structure ? groupKeyForPath(structure.path) : UNMAPPED_GROUP_KEY;

    const uncompressed = await convertMesh({
      objectName,
      structureId: info.structureId,
      license: info.license,
      mesh,
      groupKey,
    });
    const compressedBuffer = await compressWithMeshopt(uncompressed.buffer);

    assets.push({ ...uncompressed, buffer: compressedBuffer });
  }

  const packages = groupAssets(assets, catalog.structures, args.maxPackageBytes ?? DEFAULT_MAX_PACKAGE_BYTES);
  const manifest = buildManifest(packages, catalog.structures);

  const packagesDir = join(args.outDir, 'packages');
  for (const pkg of packages) {
    const pkgDir = join(packagesDir, pkg.id);
    mkdirSync(pkgDir, { recursive: true });
    for (const asset of pkg.assets) {
      // Object names are unique per real OBJ export (one object per file — see
      // objectNameFromObjFileName), so slugify(objectName) collisions are not expected against
      // the real dataset; a collision here would overwrite a sibling file within the same
      // package rather than corrupt the manifest (which records byte sizes/hashes from the
      // in-memory assets, not a re-read of what landed on disk).
      const fileName = `${slugify([asset.objectName])}.glb`;
      writeFileSync(join(pkgDir, fileName), asset.buffer);
    }
  }

  writeFileSync(join(args.outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  return { manifest, converted: assets.length, skippedExcluded, skippedDegenerate };
}

type CliArgs = {
  objDir: string;
  outDir: string;
  catalogPath: string;
};

function parseArgs(argv: string[]): CliArgs {
  const [objDir, outDir, catalogPath] = argv;
  if (!objDir || !outDir || !catalogPath) {
    throw new Error('Usage: node src/cli/build-release.ts <objDir> <outDir> <catalogPath>');
  }
  return { objDir, outDir, catalogPath };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));
  buildRelease(args)
    .then(({ converted, skippedExcluded, skippedDegenerate, manifest }) => {
      console.log(
        `Built release: ${converted} assets converted (${skippedExcluded} license-excluded, ` +
          `${skippedDegenerate} degenerate/zero-face skipped) into ${manifest.packages.length} packages, ` +
          `${manifest.structures.length} structures. Wrote ${args.outDir}/manifest.json.`,
      );
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}

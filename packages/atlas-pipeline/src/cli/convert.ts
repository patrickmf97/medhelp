import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { parseObjMesh } from '../geometry/parse-obj-mesh';
import { DEFAULT_LICENSE } from '../metadata/types';
import type { CatalogBuildResult, LicenseTag } from '../metadata/types';
import { compressWithMeshopt } from '../convert/compress';
import { convertMesh } from '../convert/convert-glb';

export type StructureInfo = {
  structureId: string | null;
  license: LicenseTag;
  excluded: boolean;
};

/**
 * Recovers the Z-Anatomy object name from a v2 export's OBJ filename (e.g.
 * "00115_Adductor_magnus.l.obj" -> "Adductor magnus.l"): drop the zero-padded batch index
 * prefix and the extension, then restore spaces from underscores. This is the inverse of
 * whatever naming the Blender export script used — see export_batch_v2.py outside this repo.
 */
export function objectNameFromObjFileName(fileName: string): string {
  return fileName
    .replace(/^\d+_/, '')
    .replace(/\.obj$/, '')
    .replace(/_/g, ' ');
}

/**
 * Looks up an object name's structure ID, license and exclusion status in a pre-built metadata
 * catalog (see metadata/build-catalog.ts).
 *
 * Z-Anatomy's scene graph groups the same object under more than one *independent* tree — the
 * anatomical-system hierarchy and the separate "regions of human body" hierarchy both reference
 * the same objects (see docs/atlas/provenance.md) — so an object name can legitimately match
 * several catalog structures with different license classifications, in no particular depth
 * order. Exclusion is a hard license constraint ("never publish NC-licensed content
 * commercially"), so if *any* matching structure says excluded, the object is excluded — a
 * non-excluded match from an unrelated grouping tree must never override that. (A naive "first
 * match in array order wins" is not safe here: the broad, non-excluded ancestor is frequently
 * listed before the deep, excluded structure for the same object.)
 *
 * When nothing is excluded, structureId prefers a TA2-mapped match (a recognized anatomical
 * structure, not just a loose regional grouping) for more meaningful traceability, falling back
 * to the first match; either way the result is a deterministic function of the catalog's own
 * (stable) structure order, satisfying "structure IDs must remain stable across pipeline
 * reruns". Objects absent from the catalog (never seen by Z-Anatomy's TA2 mapping, or no catalog
 * supplied at all) fall back to a null structure ID and the default CC BY-SA 4.0 license, rather
 * than being skipped — provenance is still attached once the catalog catches up, per the plan's
 * "unmapped is informational, not blocking" rule from Task 3.
 */
export function resolveStructureInfo(catalog: CatalogBuildResult | null, objectName: string): StructureInfo {
  const matches = catalog?.structures.filter((structure) => structure.objectNames.includes(objectName)) ?? [];
  if (matches.length === 0) {
    return { structureId: null, license: DEFAULT_LICENSE, excluded: false };
  }

  const excludedMatch = matches.find((structure) => structure.excluded);
  if (excludedMatch) {
    return { structureId: excludedMatch.id, license: excludedMatch.license, excluded: true };
  }

  const bestMatch = matches.find((structure) => structure.ta2Id !== null) ?? matches[0]!;
  return { structureId: bestMatch.id, license: bestMatch.license, excluded: false };
}

type CliArgs = {
  objDir: string;
  outDir: string;
  catalogPath: string | null;
};

function parseArgs(argv: string[]): CliArgs {
  const [objDir, outDir, catalogPath] = argv;
  if (!objDir || !outDir) {
    throw new Error('Usage: node src/cli/convert.ts <objDir> <outDir> [catalogPath]');
  }
  return { objDir, outDir, catalogPath: catalogPath ?? null };
}

/**
 * Converts every OBJ file in `objDir` (v2 export format: vertices + normals + faces) to a
 * Meshopt-compressed GLB in `outDir`, preserving each asset's structure ID and license (resolved
 * against `catalogPath`'s metadata catalog, if given — see metadata/build-catalog.ts for how
 * that catalog is produced). License-excluded structures (e.g. the Inner Ear / Kidney
 * subtrees — see docs/atlas/provenance.md) are skipped entirely: never converted, never written,
 * per the Atlas plan's "never publish" constraint on non-commercial-licensed content.
 *
 * Meshopt is the default compression here because it benchmarked with consistently lower decode
 * time than Draco across small/medium/large real meshes while still cutting file size
 * substantially — see docs/atlas/compression-benchmark.md for the real numbers and the full
 * rationale. Draco (compressWithDraco, in ../convert/compress.ts) remains available for callers
 * that want to opt specific large assets into the smaller-but-slower-to-decode alternative.
 */
export async function convertDirectory(
  args: CliArgs,
): Promise<{ converted: number; skippedExcluded: number; skippedDegenerate: number }> {
  const catalog: CatalogBuildResult | null = args.catalogPath
    ? (JSON.parse(readFileSync(args.catalogPath, 'utf-8')) as CatalogBuildResult)
    : null;

  mkdirSync(args.outDir, { recursive: true });

  const files = readdirSync(args.objDir).filter((f) => f.endsWith('.obj'));
  let converted = 0;
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

    // Real Z-Anatomy data includes reference-point markers (e.g. "Canal for vertebral
    // artery.j") that are 2-vertex, zero-face objects: they pass Task 3's vertex-only
    // validation but have no triangle data, which crashes Meshopt's encoder (an assertion
    // failure, not a thrown domain error) rather than producing an empty/degenerate GLB.
    if (mesh.faces.length === 0) {
      skippedDegenerate += 1;
      continue;
    }

    const asset = await convertMesh({
      objectName,
      structureId: info.structureId,
      license: info.license,
      mesh,
    });
    const compressed = await compressWithMeshopt(asset.buffer);

    const outFile = join(args.outDir, `${basename(file, '.obj')}.glb`);
    writeFileSync(outFile, compressed);
    converted += 1;
  }

  return { converted, skippedExcluded, skippedDegenerate };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));
  convertDirectory(args)
    .then(({ converted, skippedExcluded, skippedDegenerate }) => {
      console.log(
        `Converted ${converted} meshes to GLB in ${args.outDir} ` +
          `(${skippedExcluded} license-excluded, ${skippedDegenerate} degenerate/zero-face skipped).`,
      );
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}

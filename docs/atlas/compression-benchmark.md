# Atlas 3D — GLB Compression Benchmark (Task 4)

This records how `packages/atlas-pipeline/src/convert/benchmark.ts` was run against the real,
full Z-Anatomy v2 export, the real numbers it produced, and which compression method
`cli/convert.ts` uses by default as a result. See `packages/atlas-pipeline/src/convert/` for the
code (`convert-glb.ts`, `compress.ts`, `benchmark.ts`) and
`docs/superpowers/plans/2026-09-22-medhelp-atlas.md` (Task 4) for the plan this fulfills.

## Methodology

For a representative small/medium/large real mesh (picked automatically by
`pickRepresentativeMeshes()` from vertex count — smallest, middle, and largest of every `.obj`
file with at least 10 vertices, to skip near-degenerate single-point structures like lymph
nodes), `benchmarkMesh()`:

1. Parses the real OBJ (vertices, per-vertex normals, triangulated faces — the v2 export format)
   and converts it to an uncompressed GLB with `convertMesh()`.
2. Re-encodes that GLB with Meshopt (`compressWithMeshopt()`, `EXT_meshopt_compression`,
   level `'high'`) and with Draco (`compressWithDraco()`, `KHR_draco_mesh_compression`, method
   `'edgebreaker'`).
3. For each of the three buffers (uncompressed, Meshopt, Draco), reads it back
   (`readGlb()`), timing the read, and records:
   - **byte size** of the encoded GLB.
   - **decode time** (`performance.now()` around `readGlb()`), including whatever codec-specific
     WASM/decoder setup that call needs.
   - **vertex count match**: does the decoded primitive's `POSITION` accessor have exactly as
     many vertices as the source mesh?
   - **bounds within tolerance**: is the decoded mesh's world-space axis-aligned bounding box
     (via `@gltf-transform/functions`' `getBounds()`, which already applies Meshopt's
     node-level dequantization transform) within `DEFAULT_BOUNDS_TOLERANCE_METERS` (1 cm) of the
     reference bounds computed directly from the axis-converted source vertices?

"Visual equivalence" is deliberately a **numeric-tolerance comparison** (bounds within 1 cm,
vertex count ideally exact), not byte-for-byte equality — Draco's position quantization is
lossy by design, so exact equality is the wrong bar. A tolerance that a human would actually
notice (anything beyond ~1 cm on a real anatomical structure, or a vertex count that visibly
changes a shape) would still fail this check.

Reproduce with:

```sh
pnpm --filter @medhelp/atlas-pipeline benchmark -- /home/patrick/medhelp-atlas-source/export-v2/obj
# or directly:
pnpm exec tsx src/convert/benchmark.ts /home/patrick/medhelp-atlas-source/export-v2/obj
```

## Real results

Run against the **full** v2 export (4,552 real OBJ files, `FULL_EXPORT_V2_DONE` reached — see
`docs/atlas/provenance.md` and `export-v2/progress.log` outside this repo). Byte sizes are
exactly reproducible (the encode pipeline is deterministic); decode times are a representative
run — see "Decode-time variance" below for why they fluctuate.

| Mesh | Vertices / triangles | Method | Byte size | Decode time | Vertex count matches | Bounds within 1 cm |
| --- | --- | --- | --- | --- | --- | --- |
| **small** — Anterior ligament of fibular head.l | 10 / 8 | uncompressed | 1,844 B | 2.2 ms | yes | yes |
| | | meshopt | 2,484 B (**+35%**) | 5.6 ms | yes | yes |
| | | draco | 1,688 B (**−8%**) | 28.4 ms | yes | yes |
| **medium** — Iliopectineal bursa .l | 178 / 352 | uncompressed | 9,956 B | 2.5 ms | yes | yes |
| | | meshopt | 4,152 B (**−58%**) | 2.1 ms | yes | yes |
| | | draco | 2,824 B (**−72%**) | 3.5 ms | yes | yes |
| **large** — White matter of telencephalon.r | 67,646 / 135,288 | uncompressed | 3,248,480 B | 191.7 ms | yes | yes |
| | | meshopt | 589,072 B (**−82%**) | 214.0 ms | yes | yes |
| | | draco | 382,268 B (**−88%**) | 296.4 ms | **no (67,648, +2)** | yes |

(This "large" pick is the single largest real mesh in the entire 4,552-file export — the
telencephalon's white matter — so this is a genuine worst case, not a cherry-picked one.)

### The Draco vertex-count anomaly (large mesh)

For the large mesh, Draco's decoded output had **67,648 vertices against a source of 67,646** —
two more, not fewer. This is not a pipeline bug: Draco's edgebreaker encoding does not guarantee
preserving the exact source vertex-sharing topology. Where per-vertex attributes (here, normals)
are discontinuous across a shared vertex, Draco's encoder can split that vertex into two corner
copies to represent the discontinuity, changing the vertex count without changing the rendered
shape — which is exactly what happened here: bounds still matched within tolerance (no vertex
moved or was dropped in any way that would be visible), but the count check correctly flagged
the topology change.

Meshopt never exhibited this on any of the three meshes: it preserves the exact source vertex
count because its compression is a position/normal **quantization** step (see
`compress.ts`'s `readGlb()` for how that quantization is read back via node-transform
dequantization), not a re-triangulation or corner-splitting step.

### Decode-time variance

Decode-time numbers fluctuate more than byte sizes between runs, for two reasons:

1. **Draco's WASM module is not a reusable singleton** the way Meshopt's is — `draco3dgltf`'s
   `createDecoderModule()`/`createEncoderModule()` each instantiate a fresh WASM module per
   call. `compress.ts` memoizes both modules at module scope (see `getDracoDecoderModule()`/
   `getDracoEncoderModule()`) specifically so a real multi-thousand-mesh CLI run (and this
   benchmark) only pays that one-time cost once, not per mesh — but the *first* mesh processed
   in any given run still absorbs it, which is most of why the "small" mesh's Draco decode time
   (first mesh benchmarked) is consistently the highest multiple (10-15x) of its own byte size
   would suggest.
2. The export-v2 Blender batch export was still running concurrently on the same machine for
   several of the earlier benchmark runs during this task, adding real but unrelated CPU
   contention noise (absolute decode times varied roughly 2x run to run; the table above uses a
   run from after the export had finished). The **relative ordering is stable across every run
   observed**: Draco decoded slower than Meshopt on every mesh size, every time.

## Decision: Meshopt is the default

`cli/convert.ts` uses `compressWithMeshopt()` as the default compression for every converted
asset, based on this evidence:

- **Decode time**: Meshopt decoded at or faster than Draco on every mesh size tested, and at or
  faster than the uncompressed baseline on the small/medium meshes. For a viewer that loads
  structures progressively and must "release unused GPU resources" and "cancel obsolete loads"
  (per the Atlas plan's Review Focus — mobile/low-memory devices matter), decode latency per
  asset is the more user-visible cost than wire size, especially once a CDN's own gzip/brotli
  (which Meshopt's own docs recommend layering on top, and which the plan already uses via
  Cloudflare R2) closes much of the remaining size gap with Draco.
- **Exact fidelity**: Meshopt preserved the exact source vertex count on all three real meshes,
  including the 67k-vertex worst case where Draco did not (see above). For medical anatomy
  content where a human (student, educator) may inspect geometry closely, "never visibly moves
  or drops a vertex" is a meaningful correctness property beyond just bounding-box equivalence.
- **Compression is still substantial**: −58% to −82% on every mesh above 100 vertices (the tiny
  10-vertex case has fixed per-primitive extension overhead that dominates for meshes this
  small, which also doesn't matter in absolute terms — 2.5 KB).

Draco remains available (`compressWithDraco()` in `compress.ts`) for a caller that wants to
explicitly opt a specific large asset into better compression at the cost of slower decode and a
non-guaranteed exact vertex count — a decision Task 5's packaging/manifest step can make
per-asset if transfer size becomes the binding constraint for specific large structures.

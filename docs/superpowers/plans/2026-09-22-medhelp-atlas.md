# MEDHELP Atlas 3D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reproducible BodyParts3D asset pipeline and an adaptive web Atlas that integrates with MEDHELP through the approved typed contract.

**Architecture:** Keep offline asset processing in `tools/atlas-pipeline` and runtime rendering in `packages/atlas-viewer`. The pipeline emits immutable, hashed manifests and optimized GLB packages; the viewer loads only required packages and never owns identity, billing or educational content.

**Tech Stack:** Node.js 22, TypeScript strict, pnpm 10, Three.js, React Three Fiber, glTF/GLB, glTF Transform, Meshopt or Draco selected by benchmark, Vitest, Playwright, Cloudflare R2.

**Spec:** `docs/superpowers/specs/2026-09-22-medhelp-design.md`

## Global Constraints

- Source dataset is BodyParts3D 4.0 under CC BY 4.0.
- Preserve source provenance, license URL and modification notes in every published asset version.
- The initial body is the available adult male reference and must be labeled as such.
- Search supports Portuguese, English and Latin names.
- Runtime features include select, search, filter, hide, show, isolate, transparency, favorite and educational links.
- Assets load progressively by system/region and release unused GPU resources.
- Viewer failure must not crash the surrounding MEDHELP application.
- WebGL-unavailable devices receive a useful image/text fallback.
- Platform auth, access and content remain outside the viewer.
- The public demo uses an explicit structure allowlist.
- Never publish original source archives as public runtime files.

## Review Focus

- Missing, corrupt or partially downloaded GLB packages must yield a recoverable viewer state.
- Structure IDs must remain stable across pipeline reruns and asset versions.
- Rapid filter/search changes must cancel obsolete loads and avoid stale scene mutations.
- Low-memory/mobile devices must reduce quality before the browser process crashes.
- Every displayed source-derived asset must remain traceable to the CC BY 4.0 attribution record.

## Planned File Map

```text
tools/atlas-pipeline/src/        # acquisition validation, conversion and packaging
tools/atlas-pipeline/fixtures/   # tiny synthetic OBJ/metadata fixtures only
packages/atlas-viewer/src/       # renderer, state, controls and fallback
packages/atlas-contract/src/     # shared platform interface from platform plan
apps/web/app/atlas/              # authenticated host route
apps/web/app/explorar/atlas/     # public demo host route
supabase/migrations/             # anatomy metadata and content relations
docs/atlas/                      # provenance, benchmarks and operating guide
```

---

### Task 1: Lock provenance and validate the source distribution

**Files:**
- Create: `docs/atlas/bodyparts3d-provenance.md`
- Create: `tools/atlas-pipeline/src/source/validate-source.ts`
- Create: `tools/atlas-pipeline/fixtures/source-manifest.json`
- Test: `tools/atlas-pipeline/src/source/validate-source.test.ts`

**Interfaces:**
- Produces: `validateSource(input: SourceDescriptor): SourceValidation`.
- Produces: immutable descriptor containing version, download origin, license, archive hash and acquisition date.

- [ ] **Step 1: Create a small fixture and tests for correct hash, wrong hash and missing license**

```ts
expect(validateSource(validDescriptor)).toEqual({ ok: true, errors: [] });
expect(validateSource({ ...validDescriptor, sha256: 'bad' }).ok).toBe(false);
```

- [ ] **Step 2: Run the focused test and verify the validator is missing**

- [ ] **Step 3: Implement strict validation and write the official provenance/attribution record**

```ts
export type SourceDescriptor = { name: 'BodyParts3D'; version: '4.0'; license: 'CC BY 4.0'; sourceUrl: string; sha256: string; acquiredAt: string };
```

- [ ] **Step 4: Run tests and verify the real archive descriptor without copying the archive into Git**

- [ ] **Step 5: Commit with `docs: lock atlas source provenance`**

### Task 2: Import anatomical metadata with stable multilingual IDs

**Files:**
- Create: `tools/atlas-pipeline/src/metadata/{parse,normalize,types}.ts`
- Create: `supabase/migrations/202609220008_anatomy.sql`
- Create: `tools/atlas-pipeline/fixtures/anatomy.tsv`
- Test: `tools/atlas-pipeline/src/metadata/normalize.test.ts`, `supabase/tests/anatomy_test.sql`

**Interfaces:**
- Produces: `normalizeStructure(row: SourceRow): AnatomyStructureRecord`.
- Produces: `anatomy_structures`, `anatomy_names`, `anatomy_relations`, `anatomy_content_links`, `anatomy_favorites`.

- [ ] **Step 1: Test stable source IDs, hierarchy cycles, duplicate names and Portuguese/English/Latin aliases**

```ts
expect(normalizeStructure(row).id).toBe(`bp3d:${row.fmaId}`);
```

- [ ] **Step 2: Run tests and verify failure**

- [ ] **Step 3: Implement parsers, normalization, cycle detection and database constraints/RLS**

- [ ] **Step 4: Import the fixture twice and verify identical IDs with idempotent upserts**

- [ ] **Step 5: Commit with `feat: add anatomical metadata catalog`**

### Task 3: Discover and normalize OBJ geometry

**Files:**
- Create: `tools/atlas-pipeline/src/geometry/{discover,normalize,transform}.ts`
- Create: `tools/atlas-pipeline/fixtures/triangle.obj`
- Test: `tools/atlas-pipeline/src/geometry/normalize.test.ts`

**Interfaces:**
- Produces: `normalizeGeometry(inputPath, options): Promise<NormalizedMesh>` with meters, Y-up coordinates and a declared origin.

- [ ] **Step 1: Test non-finite vertices, empty meshes, orientation and deterministic bounds**

```ts
expect(result.bounds.min).toEqual([0, 0, 0]);
expect(result.vertices.every(Number.isFinite)).toBe(true);
```

- [ ] **Step 2: Run tests and verify failure**

- [ ] **Step 3: Implement safe discovery and deterministic transform without editing source files**

- [ ] **Step 4: Produce a JSON report listing accepted, rejected and unmapped OBJ files**

- [ ] **Step 5: Commit with `feat: normalize atlas source geometry`**

### Task 4: Convert GLB packages and select compression by benchmark

**Files:**
- Create: `tools/atlas-pipeline/src/convert/{convert-glb,compress,benchmark}.ts`
- Create: `tools/atlas-pipeline/src/cli/convert.ts`
- Test: `tools/atlas-pipeline/src/convert/convert-glb.test.ts`
- Create: `docs/atlas/compression-benchmark.md`

**Interfaces:**
- Consumes: normalized meshes from Task 3.
- Produces: `convertMesh(job: ConversionJob): Promise<ConvertedAsset>`.

- [ ] **Step 1: Test valid GLB magic bytes, preserved structure ID and deterministic output metadata**

```ts
expect(buffer.subarray(0, 4).toString('utf8')).toBe('glTF');
expect(asset.structureId).toBe('bp3d:FMA123');
```

- [ ] **Step 2: Run tests and verify failure**

- [ ] **Step 3: Implement glTF Transform conversion and benchmark uncompressed, Meshopt and Draco on representative small/medium/large meshes**

- [ ] **Step 4: Record decode time, byte size and visual equivalence; select one default and preserve the benchmark evidence**

- [ ] **Step 5: Commit with `feat: convert and compress atlas assets`**

### Task 5: Package systems/regions and emit a versioned manifest

**Files:**
- Create: `tools/atlas-pipeline/src/package/{group-assets,manifest,hash}.ts`
- Create: `tools/atlas-pipeline/src/cli/build-release.ts`
- Test: `tools/atlas-pipeline/src/package/manifest.test.ts`

**Interfaces:**
- Produces: `AtlasManifestV1` with version, license, packages, structures, hashes, byte sizes and relationships.

- [ ] **Step 1: Test deterministic ordering, unique structure ownership and hash changes after byte changes**

```ts
expect(manifest.schemaVersion).toBe(1);
expect(new Set(manifest.structures.map(s => s.id)).size).toBe(manifest.structures.length);
```

- [ ] **Step 2: Run tests and verify failure**

- [ ] **Step 3: Implement grouping by system/region with maximum package budget and manifest schema validation**

- [ ] **Step 4: Build the fixture release twice and byte-compare both manifests**

- [ ] **Step 5: Commit with `feat: package versioned atlas releases`**

### Task 6: Publish immutable assets and activate releases safely

**Files:**
- Create: `tools/atlas-pipeline/src/publish/{storage,release}.ts`
- Create: `tools/atlas-pipeline/src/cli/publish.ts`
- Create: `supabase/migrations/202609220009_anatomy_assets.sql`
- Test: `tools/atlas-pipeline/src/publish/release.test.ts`

**Interfaces:**
- Produces: `publishRelease(manifest, storage): Promise<PublishedRelease>` and atomic active-version record.

- [ ] **Step 1: Test upload skip on matching hash, rejection on collision and no activation after partial failure**

```ts
await expect(publishRelease(brokenManifest, fakeStorage)).rejects.toThrow('Release not activated');
```

- [ ] **Step 2: Run tests and verify failure**

- [ ] **Step 3: Implement content-addressed keys, private source separation and atomic activation**

- [ ] **Step 4: Publish fixture assets to a local S3-compatible test target and verify hashes**

- [ ] **Step 5: Commit with `feat: publish immutable atlas releases`**

### Task 7: Create the viewer core and cancellable progressive loader

**Files:**
- Create: `packages/atlas-viewer/src/{atlas-viewer,scene,types}.tsx`
- Create: `packages/atlas-viewer/src/loading/{loader,cache,dispose}.ts`
- Test: `packages/atlas-viewer/src/loading/loader.test.ts`, `packages/atlas-viewer/src/atlas-viewer.test.tsx`

**Interfaces:**
- Consumes: `AtlasViewerProps` from `@medhelp/atlas-contract` and `AtlasManifestV1`.
- Produces: lazy React component `AtlasViewer` and `AtlasAssetLoader.loadPackage(id, signal)`.

- [ ] **Step 1: Test initial shell, package deduplication, AbortSignal cancellation and GPU disposal**

```ts
const first = loader.loadPackage('skeletal-head', controller.signal);
controller.abort();
await expect(first).rejects.toMatchObject({ name: 'AbortError' });
```

- [ ] **Step 2: Run tests and verify failure**

- [ ] **Step 3: Implement Canvas shell, Suspense boundary, loader cache and explicit geometry/material disposal**

- [ ] **Step 4: Verify stale requests cannot mutate the current scene**

- [ ] **Step 5: Commit with `feat: add progressive atlas viewer core`**

### Task 8: Add camera, selection and structure display controls

**Files:**
- Create: `packages/atlas-viewer/src/interaction/{selection,camera,visibility}.ts`
- Create: `packages/atlas-viewer/src/components/{toolbar,structure-tree}.tsx`
- Test: `packages/atlas-viewer/src/interaction/visibility.test.ts`, `packages/atlas-viewer/src/interaction/selection.test.ts`

**Interfaces:**
- Produces: `selectStructure`, `focusStructure`, `hideStructure`, `isolateStructure`, `setStructureOpacity`, `resetScene`.

- [ ] **Step 1: Test pointer selection, keyboard tree selection, isolate/reset and opacity clamping**

```ts
expect(clampOpacity(-1)).toBe(0);
expect(clampOpacity(2)).toBe(1);
```

- [ ] **Step 2: Run tests and verify failure**

- [ ] **Step 3: Implement raycasting, orbit controls, camera fit and state transitions independent of React components**

- [ ] **Step 4: Emit `structure_selected` only for allowed/loaded structures**

- [ ] **Step 5: Commit with `feat: add atlas exploration controls`**

### Task 9: Add multilingual search, filters and educational panel

**Files:**
- Create: `packages/atlas-viewer/src/search/{index,normalize-query}.ts`
- Create: `packages/atlas-viewer/src/components/{search,filters,structure-panel}.tsx`
- Test: `packages/atlas-viewer/src/search/index.test.ts`, `packages/atlas-viewer/src/components/structure-panel.test.tsx`

**Interfaces:**
- Consumes: names, systems, regions and content links from platform APIs.
- Produces: `searchStructures(query, filters): SearchResult[]`.

- [ ] **Step 1: Test accent-insensitive Portuguese, English/Latin aliases, system filter and empty query**

```ts
expect(searchStructures('coracao', {})).toContainEqual(expect.objectContaining({ preferredName: 'Coração' }));
```

- [ ] **Step 2: Run tests and verify failure**

- [ ] **Step 3: Implement normalized index and UI without embedding medical descriptions in GLB files**

- [ ] **Step 4: Connect summary, flashcard, question and favorite events through the contract**

- [ ] **Step 5: Commit with `feat: add atlas search and educational context`**

### Task 10: Add adaptive quality, recovery and non-WebGL fallback

**Files:**
- Create: `packages/atlas-viewer/src/performance/{capabilities,quality-budget}.ts`
- Create: `packages/atlas-viewer/src/components/{viewer-error,fallback-atlas}.tsx`
- Test: `packages/atlas-viewer/src/performance/quality-budget.test.ts`, `packages/atlas-viewer/src/components/fallback-atlas.test.tsx`

**Interfaces:**
- Produces: `chooseQualityBudget(capabilities): QualityBudget` and recoverable viewer states.

- [ ] **Step 1: Test no-WebGL, low memory, reduced motion, failed package and retry success**

```ts
expect(chooseQualityBudget({ webgl: false, deviceMemoryGb: 2 }).mode).toBe('fallback');
```

- [ ] **Step 2: Run tests and verify failure**

- [ ] **Step 3: Implement capability detection, concurrent-load limits, adaptive pixel ratio and fallback UI**

- [ ] **Step 4: Verify viewer errors emit a recoverable code and never escape the package error boundary**

- [ ] **Step 5: Commit with `feat: make atlas adaptive and recoverable`**

### Task 11: Integrate authenticated and public-demo hosts

**Files:**
- Modify: `apps/web/app/atlas/page.tsx`, `apps/web/app/explorar/atlas/page.tsx`
- Modify: `apps/web/components/atlas/atlas-shell.tsx`
- Create: `apps/web/lib/atlas/{manifest,access,events}.ts`
- Test: `apps/web/tests/e2e/{atlas-premium,atlas-demo}.spec.ts`

**Interfaces:**
- Consumes: platform `AtlasViewerProps`, server access decision and demo allowlist.
- Produces: complete premium route and restricted public demo route.

- [ ] **Step 1: Test premium access, expired access, demo allowlist and deep link to a structure ID**

```ts
await page.goto('/explorar/atlas?estrutura=bp3d:FMA123');
await expect(page.getByText('Conteúdo disponível na assinatura')).toBeVisible();
```

- [ ] **Step 2: Run E2E tests and verify integration failure**

- [ ] **Step 3: Implement server-derived props, lazy import and typed event handling**

- [ ] **Step 4: Verify direct asset URLs do not bypass premium metadata authorization**

- [ ] **Step 5: Commit with `feat: integrate atlas with medhelp access`**

### Task 12: Validate performance, accessibility, attribution and release operations

**Files:**
- Create: `apps/web/tests/e2e/atlas-performance.spec.ts`
- Create: `docs/atlas/{performance-budget,release-runbook,credits}.md`
- Modify: `apps/web/app/creditos/page.tsx`
- Test: `tools/atlas-pipeline/src/package/license.test.ts`

**Interfaces:**
- Consumes: pipeline release and integrated viewer.
- Produces: release candidate with documented budgets, attribution and rollback.

- [ ] **Step 1: Test manifest attribution, license link, modification notice and adult-male-reference disclosure**

```ts
expect(manifest.attribution.license).toBe('CC BY 4.0');
expect(manifest.attribution.modified).toBe(true);
```

- [ ] **Step 2: Define executable budgets for initial JS, first demo package, frame stability and peak loaded geometry**

- [ ] **Step 3: Run Playwright traces on representative desktop and mobile profiles; optimize until budgets pass**

- [ ] **Step 4: Run full pipeline/viewer/E2E suites, test rollback to the previous active manifest and verify keyboard fallback navigation**

- [ ] **Step 5: Commit results with `chore: prepare atlas release candidate`**

## Plan Completion Gate

Atlas implementation is complete only when the pipeline rebuilds the same fixture release deterministically, every runtime file is hash-verified and attributable, progressive loading/recovery tests pass, public demo access is constrained, premium integration passes E2E, and the fallback remains useful with WebGL disabled.


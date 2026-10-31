'use client';

import { AtlasViewer } from '@medhelp/atlas-viewer';
import type { AtlasManifestSource } from '@medhelp/atlas-viewer';
import { useEffect, useMemo, useState } from 'react';

/**
 * Provisional asset location: a flat manifest + one GLB per individual anatomical structure,
 * published as a plain Next.js public asset under `apps/web/public/atlas/`. There is no CDN/R2
 * publish step yet (pipeline Task 6, not built) — see this route's PR description for why this is
 * a deliberate, temporary tradeoff, not the final production asset architecture.
 */
const ATLAS_MANIFEST_URL = '/atlas/manifest.json';

/**
 * Passed to `AtlasViewer` as-is, deliberately `kind: 'url'` and not `kind: 'manifest'`: a
 * `{ kind: 'manifest' }` source gives `AtlasViewer` no URL to anchor each package GLB's address
 * on, so it falls back to resolving `<id>.glb` against the *page's* URL — which silently breaks
 * on this route (`/explorar/atlas` has its own path segment, so that fallback resolves to
 * `/explorar/<id>.glb` instead of `/atlas/<id>.glb`; confirmed as a real 404 in this task's
 * browser verification, not a hypothetical). Keeping `kind: 'url'` costs a second ~600KB fetch of
 * manifest.json (this component below also fetches it, to build the system checklist) — trivial
 * next to the ~26MB of GLBs this whole task is about not loading eagerly, and far cheaper than
 * carrying a fragile URL-resolution workaround.
 *
 * Declared once at module scope (not inline in JSX) so its identity never changes across
 * `AtlasRealViewer` re-renders — `AtlasViewer`'s internal effects depend on `manifestSource`
 * precisely so a *new* manifest resets the whole loaded scene; a fresh object literal on every
 * render (e.g. one re-created on every checkbox toggle) would trip that same reset path for no
 * reason, discarding and re-fetching every already-visible system on every toggle.
 */
const ATLAS_MANIFEST_SOURCE: AtlasManifestSource = { kind: 'url', url: ATLAS_MANIFEST_URL };

/** The real manifest this route reads to build its navigation panel (system names + counts).
 * Extracted from `AtlasViewer`'s own public `AtlasManifestSource` type rather than depending on
 * `@medhelp/atlas-pipeline` directly, so this app only needs to agree with the viewer's contract,
 * not reach past it. */
export type AtlasManifest = Extract<AtlasManifestSource, { kind: 'manifest' }>['manifest'];

type SystemOption = {
  groupKey: string;
  label: string;
  count: number;
};

/**
 * Portuguese display names for the real Z-Anatomy top-level system/region names a real built
 * manifest.json carries as `groupKey` (see @medhelp/atlas-pipeline's group-assets.ts
 * `groupKeyForPath` and system-palette.ts, which this mirrors) — the rest of this route's copy is
 * Portuguese, so the navigation panel should read the same way. Falls back to the English name
 * (numeric prefix stripped) for any real groupKey this map doesn't have yet, rather than hiding
 * an unrecognized system from the panel.
 */
const SYSTEM_LABELS_PT_BR: Record<string, string> = {
  '1: Skeletal system': 'Sistema esquelético',
  '2: Muscular insertions': 'Inserções musculares',
  '3: Joints': 'Articulações',
  '4: Muscular system': 'Sistema muscular',
  '5: Cardiovascular system': 'Sistema cardiovascular',
  '6: Lymphoid organs': 'Órgãos linfoides',
  '7: Nervous system & Sense organs': 'Sistema nervoso e órgãos dos sentidos',
  '8: Visceral systems': 'Sistemas viscerais',
  '9: Regions of human body': 'Regiões do corpo humano',
  'Reference lines, reference planes, movements': 'Linhas e planos de referência, movimentos',
  unmapped: 'Não mapeado',
};

function displayLabel(groupKey: string): string {
  return SYSTEM_LABELS_PT_BR[groupKey] ?? groupKey.replace(/^\d+:\s*/, '');
}

/**
 * The real manifest groupKey this viewer loads by default: a full skeleton is recognizable
 * immediately, without being the heaviest system to fetch (muscular system is the largest real
 * group by byte size — see this task's report for the real numbers). Matched by display name
 * rather than an exact string so a future pipeline rerun that renumbers/retitles the source
 * collections doesn't silently fall back to "nothing visible".
 */
function isDefaultSystem(groupKey: string): boolean {
  return displayLabel(groupKey).toLowerCase() === 'sistema esquelético';
}

function buildSystemOptions(manifest: AtlasManifest): SystemOption[] {
  const counts = new Map<string, number>();
  for (const pkg of manifest.packages) {
    counts.set(pkg.groupKey, (counts.get(pkg.groupKey) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([groupKey, count]) => ({ groupKey, label: displayLabel(groupKey), count }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

/**
 * Client wrapper around the real `@medhelp/atlas-viewer` package (camera, lighting, progressive
 * loading all live there — see packages/atlas-viewer/src). Kept as its own small client component,
 * matching this app's existing convention of a 'use client' leaf component imported from a server
 * page (see components/public/content-explorer.tsx), so the route's page.tsx itself can stay a
 * server component for metadata/layout.
 *
 * Fetches the manifest itself to build the system checklist below (real system names + package
 * counts, from the manifest's own `groupKey` field) — `AtlasViewer` fetches its own copy
 * separately (see `ATLAS_MANIFEST_SOURCE`'s doc comment for why `kind: 'url'` is kept, not
 * `kind: 'manifest'`, despite the duplicate ~600KB request this implies).
 *
 * Renders a navigation panel of real anatomical systems (one checkbox per real manifest
 * `groupKey`) that drives `AtlasViewer`'s `visibleGroupKeys` prop: this is the perf fix for a
 * manifest listing thousands of packages (~2,960 real structure GLBs, ~26MB) — only the systems
 * the user has checked are ever fetched. One system (the skeleton) starts checked so the scene
 * isn't empty on first paint, without front-loading every system like before.
 */
export function AtlasRealViewer() {
  const [manifest, setManifest] = useState<AtlasManifest | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [visibleGroupKeys, setVisibleGroupKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();

    fetch(ATLAS_MANIFEST_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch atlas manifest: ${response.status} ${response.statusText}`);
        }
        return response.json() as Promise<AtlasManifest>;
      })
      .then((loadedManifest) => {
        if (controller.signal.aborted) return;
        setManifest(loadedManifest);
        const defaultGroupKey = loadedManifest.packages.map((pkg) => pkg.groupKey).find(isDefaultSystem);
        setVisibleGroupKeys(new Set(defaultGroupKey ? [defaultGroupKey] : []));
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      });

    return () => controller.abort();
  }, []);

  const systemOptions = useMemo(() => (manifest ? buildSystemOptions(manifest) : []), [manifest]);

  function toggleSystem(groupKey: string): void {
    setVisibleGroupKeys((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }

  if (error) {
    return (
      <div aria-label="Visualizador 3D do Atlas MEDHELP" className="atlas-viewer-shell">
        <div role="alert">{error.message}</div>
      </div>
    );
  }

  return (
    <div className="atlas-nav-layout">
      <nav aria-label="Sistemas anatômicos visíveis" className="atlas-systems-nav">
        <h2 className="atlas-systems-nav__title">Sistemas</h2>
        <ul className="atlas-systems-nav__list">
          {systemOptions.length === 0 ? (
            <li className="atlas-systems-nav__hint">Carregando sistemas…</li>
          ) : (
            systemOptions.map((system) => (
              <li key={system.groupKey}>
                <label className="atlas-systems-nav__item">
                  <input
                    checked={visibleGroupKeys.has(system.groupKey)}
                    onChange={() => toggleSystem(system.groupKey)}
                    type="checkbox"
                  />
                  <span className="atlas-systems-nav__label">{system.label}</span>
                  <span className="atlas-systems-nav__count">{system.count}</span>
                </label>
              </li>
            ))
          )}
        </ul>
      </nav>

      <div aria-label="Visualizador 3D do Atlas MEDHELP" className="atlas-viewer-shell">
        {manifest ? (
          <AtlasViewer manifestSource={ATLAS_MANIFEST_SOURCE} visibleGroupKeys={visibleGroupKeys} />
        ) : (
          <div role="status">Carregando o Atlas 3D…</div>
        )}
      </div>
    </div>
  );
}

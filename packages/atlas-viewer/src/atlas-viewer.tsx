import type { AtlasManifestV1 } from '@medhelp/atlas-pipeline';
import { Component, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { AtlasPackageCache } from './loading/cache';
import { AtlasAssetLoader } from './loading/loader';
import type { FetchPackageBytes } from './loading/loader';
import { AtlasScene } from './scene';
import type { AtlasViewerProps, AtlasViewerState, LoadedAtlasPackage } from './types';

/**
 * Default package-byte fetcher: resolves each package's GLB next to the manifest it came from
 * (`<manifestUrl directory>/<packageId>.glb`). This is a provisional convention, not part of the
 * public contract (`AtlasViewerProps` has no field for it) — Task 6 (publish) and a later route-
 * integration task own the real asset storage/CDN layout and may replace this fetcher entirely as
 * a non-breaking internal change.
 */
/**
 * How many packages AtlasViewer fetches/parses at once. Bounded (not unlimited) so a manifest
 * with thousands of packages doesn't open thousands of simultaneous requests; high enough that a
 * manifest with a realistic handful of packages still loads effectively all at once.
 */
const PACKAGE_LOAD_CONCURRENCY = 16;

function createDefaultFetchPackageBytes(manifestUrl: string | undefined): FetchPackageBytes {
  return async (id, signal) => {
    const pageOrigin = typeof window !== 'undefined' ? window.location.href : 'http://localhost/';
    // manifestUrl is commonly a root-relative path (e.g. a Next.js public asset, "/atlas/manifest.json")
    // rather than an absolute URL, and `new URL()` requires its base argument to itself be absolute —
    // resolve it against the current page origin first so a relative manifestUrl doesn't throw.
    const base = manifestUrl ? new URL(manifestUrl, pageOrigin).toString() : pageOrigin;
    const url = new URL(`${id}.glb`, base).toString();
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch atlas package "${id}": ${response.status} ${response.statusText}`);
    }
    return response.arrayBuffer();
  };
}

async function resolveManifest(
  source: AtlasViewerProps['manifestSource'],
  signal: AbortSignal,
): Promise<AtlasManifestV1> {
  if (source.kind === 'manifest') {
    return source.manifest;
  }
  const response = await fetch(source.url, { signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch atlas manifest: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as AtlasManifestV1;
}

type SceneBoundaryProps = { children: ReactNode; onError: (error: Error) => void };
type SceneBoundaryState = { failed: boolean };

/**
 * Contains a synchronous render failure inside the 3D scene so it cannot crash the surrounding
 * MEDHELP application (Global Constraint: "Viewer failure must not crash the surrounding MEDHELP
 * application"). Function components cannot catch render errors, so this is the one class
 * component in the package.
 */
class AtlasSceneBoundary extends Component<SceneBoundaryProps, SceneBoundaryState> {
  override state: SceneBoundaryState = { failed: false };

  static getDerivedStateFromError(): SceneBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: unknown): void {
    this.props.onError(error instanceof Error ? error : new Error(String(error)));
  }

  override render(): ReactNode {
    if (this.state.failed) {
      return <div role="alert">Não foi possível exibir o Atlas 3D agora.</div>;
    }
    return this.props.children;
  }
}

/** A stable, order-independent string key for a `visibleGroupKeys` prop value, used only to
 * decide *when* the package-loading effect below needs to rerun — never read back into a Set,
 * so an empty-string edge case can't be confused with "no restriction" (see its one caller). */
function groupKeysCacheKey(groupKeys: string[] | null): string | undefined {
  return groupKeys === null ? undefined : [...groupKeys].sort().join('\u0000');
}

/**
 * Public Atlas 3D viewer component (Task 7: viewer core + cancellable progressive loader; Part 1
 * of the color/nav/perf task adds `visibleGroupKeys`-scoped loading on top).
 *
 * Resolves `manifestSource` into an `AtlasManifestV1`, then progressively loads whichever of its
 * packages are currently visible (see `visibleGroupKeys` on `AtlasViewerProps`) via
 * `AtlasAssetLoader`, so the scene fills in incrementally rather than blocking on every package
 * at once. This is the viewer's main defense against a real public manifest listing thousands of
 * packages (e.g. apps/web's /explorar/atlas route, ~2,960 individual structure GLBs, ~26MB) —
 * loading only a caller-chosen subset is what keeps the browser light; see atlas-real-viewer.tsx
 * for the navigation panel that drives this prop. Selection, search and the educational panel are
 * still deliberately not part of this component — later tasks add them on top.
 */
export function AtlasViewer({ manifestSource, visibleGroupKeys }: AtlasViewerProps): ReactNode {
  const [state, setState] = useState<AtlasViewerState>({ status: 'loading-manifest' });
  const cacheRef = useRef<AtlasPackageCache | null>(null);

  // `undefined` means "no restriction" (every package visible) — the pre-navigation-panel
  // default, and what every viewer-core test below still exercises. A real `Set`/array
  // (including an empty one) restricts to its members. Spread once per render so both the
  // dependency key and the loading effect's closure see the exact same snapshot.
  const visibleGroupKeysArray = visibleGroupKeys === undefined ? null : [...visibleGroupKeys];
  const visibleGroupKeysKey = groupKeysCacheKey(visibleGroupKeysArray);

  // The manifest this render's packages should be loaded from, if one has already resolved —
  // used as a dependency below so the package-loading effect reruns exactly when a *new*
  // manifest arrives, without needing its own ref (state.manifest is already a stable
  // reference across renders that don't change it).
  const currentManifest = state.status === 'loading-packages' || state.status === 'ready' ? state.manifest : null;

  // Effect 1: resolve manifestSource into a manifest. This is the only effect that clears the
  // whole package cache (a brand new manifest means every previously loaded package belongs to
  // a stale manifest and must be disposed) — the package-loading effect below never does.
  useEffect(() => {
    if (!cacheRef.current) {
      cacheRef.current = new AtlasPackageCache();
    }
    const cache = cacheRef.current;
    cache.clear();

    const controller = new AbortController();
    let cancelled = false;
    setState({ status: 'loading-manifest' });

    resolveManifest(manifestSource, controller.signal)
      .then((manifest) => {
        if (controller.signal.aborted || cancelled) return;
        setState({ status: 'loading-packages', manifest, loaded: [] });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || cancelled) return;
        setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) });
      });

    return () => {
      cancelled = true;
      controller.abort();
      cache.clear();
    };
    // manifestSource is expected to be a stable reference from the host (new object identity ==
    // "load a different manifest/structure set"); re-identifying it aborts the previous load.
  }, [manifestSource]);

  // Effect 2: load (and unload) packages for whichever manifest is current, filtered to
  // `visibleGroupKeys`. Reruns whenever a new manifest resolves above, or whenever the *content*
  // of `visibleGroupKeys` changes (toggling a system on/off in a host's navigation panel) — but
  // deliberately never clears the whole cache itself: a package that stays visible across a
  // visibleGroupKeys change must not be refetched, and a package that *leaves* visibility is
  // evicted (and its GPU resources disposed via AtlasPackageCache) individually, not by wiping
  // everything and starting over.
  useEffect(() => {
    const manifest = currentManifest;
    const cache = cacheRef.current;
    if (!manifest || !cache) return;

    const groupKeySet = visibleGroupKeysArray === null ? null : new Set(visibleGroupKeysArray);
    const isVisible = (pkg: AtlasManifestV1['packages'][number]): boolean =>
      groupKeySet === null || groupKeySet.has(pkg.groupKey);

    const filteredPackages = manifest.packages.filter(isVisible);
    const filteredIds = new Set(filteredPackages.map((pkg) => pkg.id));

    // Toggle-off: evict (and dispose) every cached package that is no longer visible, before
    // doing anything else, so the scene drops them immediately rather than waiting on any new
    // fetch to complete.
    for (const loadedPkg of cache.values()) {
      if (!filteredIds.has(loadedPkg.id)) {
        cache.evict(loadedPkg.id);
      }
    }

    // Arrow function expressions, not function declarations: a hoisted function declaration's
    // body is type-checked against `cache`/`manifest`'s pre-narrowing (possibly-null) type, since
    // TS can't rule out the declaration being invoked before the narrowing above runs. These are
    // defined (and only ever called) after that narrowing, so an arrow const keeps it narrowed.
    const publish = (status: 'loading-packages' | 'ready'): void => {
      const orderedLoaded = filteredPackages
        .map((pkg) => cache.get(pkg.id))
        .filter((entry): entry is LoadedAtlasPackage => entry !== undefined);
      setState({ status, manifest, loaded: orderedLoaded });
    };

    publish('loading-packages');

    const toLoad = filteredPackages.filter((pkg) => !cache.has(pkg.id));
    if (toLoad.length === 0) {
      publish('ready');
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    const fetchBytes = createDefaultFetchPackageBytes(manifestSource.kind === 'url' ? manifestSource.url : undefined);
    const loader = new AtlasAssetLoader(fetchBytes);

    // Bounded concurrency, not strictly sequential: several packages in flight at once still
    // fills the scene progressively (it just fills in faster), and a slow package no longer
    // blocks faster ones behind it in the manifest.
    let nextIndex = 0;

    const worker = async (): Promise<void> => {
      while (true) {
        if (controller.signal.aborted || cancelled) return;
        const index = nextIndex;
        nextIndex += 1;
        const pkg = toLoad[index];
        if (!pkg) return;

        const object = await loader.loadPackage(pkg.id, controller.signal);
        if (controller.signal.aborted || cancelled) return;

        cache.set({ id: pkg.id, object });
        publish('loading-packages');
      }
    };

    const workerCount = Math.min(PACKAGE_LOAD_CONCURRENCY, toLoad.length);
    Promise.all(Array.from({ length: workerCount }, () => worker()))
      .then(() => {
        if (controller.signal.aborted || cancelled) return;
        publish('ready');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || cancelled) return;
        setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // visibleGroupKeysArray is intentionally not listed: its *content* is already captured by
    // visibleGroupKeysKey, and re-triggering on its (every-render-new) array identity would
    // defeat the point of the string key.
  }, [currentManifest, visibleGroupKeysKey, manifestSource]);

  function handleSceneError(error: Error): void {
    setState({ status: 'error', error });
  }

  if (state.status === 'loading-manifest') {
    return <div role="status">Carregando o Atlas 3D…</div>;
  }

  if (state.status === 'error') {
    return <div role="alert">{state.error.message}</div>;
  }

  return (
    <div data-atlas-viewer-status={state.status}>
      <AtlasSceneBoundary onError={handleSceneError}>
        <AtlasScene loaded={state.loaded} />
      </AtlasSceneBoundary>
    </div>
  );
}

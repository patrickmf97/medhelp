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

/**
 * Public Atlas 3D viewer component (Task 7: viewer core + cancellable progressive loader).
 *
 * Resolves `manifestSource` into an `AtlasManifestV1`, then progressively loads each of its
 * packages one at a time via `AtlasAssetLoader` so the scene fills in incrementally rather than
 * blocking on every package at once. Camera/selection controls, search and the educational panel
 * are deliberately not part of this component — later tasks add them on top.
 */
export function AtlasViewer({ manifestSource }: AtlasViewerProps): ReactNode {
  const [state, setState] = useState<AtlasViewerState>({ status: 'loading-manifest' });
  const cacheRef = useRef<AtlasPackageCache | null>(null);

  useEffect(() => {
    if (!cacheRef.current) {
      cacheRef.current = new AtlasPackageCache();
    }
    const cache = cacheRef.current;
    cache.clear();

    const controller = new AbortController();
    let cancelled = false;
    setState({ status: 'loading-manifest' });

    async function run(): Promise<void> {
      const manifest = await resolveManifest(manifestSource, controller.signal);
      if (controller.signal.aborted || cancelled) return;

      setState({ status: 'loading-packages', manifest, loaded: [] });

      const fetchBytes = createDefaultFetchPackageBytes(
        manifestSource.kind === 'url' ? manifestSource.url : undefined,
      );
      const loader = new AtlasAssetLoader(fetchBytes);

      // Bounded concurrency, not strictly sequential: a real public manifest can list thousands
      // of small packages (e.g. apps/web's /explorar/atlas route, ~2,960 individual structure
      // GLBs) and loading those one at a time made the scene take minutes to fill in. Several
      // in flight at once still fills the scene progressively (it just fills in faster), and a
      // slow package no longer blocks faster ones behind it in the manifest.
      const completed = new Map<string, LoadedAtlasPackage>();
      let nextIndex = 0;

      function publish(): void {
        const orderedLoaded = manifest.packages
          .map((pkg) => completed.get(pkg.id))
          .filter((entry): entry is LoadedAtlasPackage => entry !== undefined);
        setState({ status: 'loading-packages', manifest, loaded: orderedLoaded });
      }

      async function worker(): Promise<void> {
        while (true) {
          if (controller.signal.aborted || cancelled) return;
          const index = nextIndex;
          nextIndex += 1;
          const pkg = manifest.packages[index];
          if (!pkg) return;

          const object = await loader.loadPackage(pkg.id, controller.signal);
          if (controller.signal.aborted || cancelled) return;

          const loadedPackage: LoadedAtlasPackage = { id: pkg.id, object };
          cache.set(loadedPackage);
          completed.set(pkg.id, loadedPackage);
          publish();
        }
      }

      const workerCount = Math.min(PACKAGE_LOAD_CONCURRENCY, manifest.packages.length);
      await Promise.all(Array.from({ length: workerCount }, () => worker()));

      if (controller.signal.aborted || cancelled) return;
      const loaded = manifest.packages
        .map((pkg) => completed.get(pkg.id))
        .filter((entry): entry is LoadedAtlasPackage => entry !== undefined);
      setState({ status: 'ready', manifest, loaded: [...loaded] });
    }

    run().catch((error: unknown) => {
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

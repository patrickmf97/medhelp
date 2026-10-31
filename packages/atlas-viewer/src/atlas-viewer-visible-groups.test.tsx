import type { AtlasManifestV1 } from '@medhelp/atlas-pipeline';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { Group, Object3D } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AtlasViewer } from './atlas-viewer';
import type { LoadedAtlasPackage } from './types';

// Same rationale as atlas-viewer.test.tsx: a real WebGL context isn't available under jsdom, so
// the scene is stubbed to a plain div listing whichever package ids it was handed.
vi.mock('./scene', () => ({
  AtlasScene: ({ loaded }: { loaded: LoadedAtlasPackage[] }) => (
    <div data-testid="atlas-scene">{loaded.map((pkg) => pkg.id).join(',')}</div>
  ),
}));

// Tracks one dispose spy per package id, keyed by the id this fake loader decoded out of the
// (fake) fetched bytes — see createFetchMock below, which encodes the id into the "GLB" buffer
// precisely so this mock can recover it without needing real binary GLB parsing.
const disposeSpiesByPackageId = new Map<string, ReturnType<typeof vi.fn>>();

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => {
  class FakeGLTFLoader {
    setMeshoptDecoder() {
      // no-op fake
    }
    parse(buffer: ArrayBuffer, _path: string, onLoad: (gltf: { scene: unknown }) => void) {
      const id = new TextDecoder().decode(buffer);
      const disposeGeometry = vi.fn();
      disposeSpiesByPackageId.set(id, disposeGeometry);

      const mesh = new Object3D();
      (mesh as unknown as { geometry: { dispose: () => void } }).geometry = { dispose: disposeGeometry };
      (mesh as unknown as { material: { dispose: () => void } }).material = { dispose: vi.fn() };

      const group = new Group();
      group.add(mesh);
      onLoad({ scene: group });
    }
  }
  return { GLTFLoader: FakeGLTFLoader };
});
vi.mock('three/examples/jsm/libs/meshopt_decoder.module.js', () => ({ MeshoptDecoder: {} }));

type ManifestPackageSpec = { id: string; groupKey: string };

function makeManifest(packages: ManifestPackageSpec[]): AtlasManifestV1 {
  return {
    schemaVersion: 1,
    source: {
      name: 'Test fixture',
      license: 'cc-by-sa-4.0',
      licenseUrl: 'https://example.com/license',
      modificationNotes: 'synthetic test fixture, not real content',
    },
    packages: packages.map(({ id, groupKey }) => ({
      id,
      groupKey,
      byteSize: 0,
      hash: `hash-${id}`,
      structureIds: [],
    })),
    structures: [],
  };
}

/** A fetch mock whose fake GLB "bytes" are just the requested package id encoded as UTF-8 — the
 * fake GLTFLoader above decodes it straight back out, so every loaded object can be attributed
 * to a specific package id without any real binary GLB parsing. */
function createFetchMock(requestedUrls: string[]): typeof fetch {
  return vi.fn((input: string | URL) => {
    const href = typeof input === 'string' ? input : input.toString();
    requestedUrls.push(href);
    const match = /\/([^/]+)\.glb$/.exec(href);
    const id = match ? match[1]! : 'unknown';
    return Promise.resolve({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode(id).buffer,
    });
  }) as unknown as typeof fetch;
}

describe('AtlasViewer visibleGroupKeys', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    disposeSpiesByPackageId.clear();
  });

  it('loads every package when visibleGroupKeys is omitted (backward-compatible default)', async () => {
    const requestedUrls: string[] = [];
    global.fetch = createFetchMock(requestedUrls);

    const manifest = makeManifest([
      { id: 'skull', groupKey: 'skeletal' },
      { id: 'biceps', groupKey: 'muscular' },
    ]);

    render(<AtlasViewer manifestSource={{ kind: 'manifest', manifest }} />);

    await waitFor(() => {
      expect(screen.getByTestId('atlas-scene')).toHaveTextContent('skull,biceps');
    });
  });

  it('loads only packages whose groupKey is in visibleGroupKeys, never fetching the others', async () => {
    const requestedUrls: string[] = [];
    global.fetch = createFetchMock(requestedUrls);

    const manifest = makeManifest([
      { id: 'skull', groupKey: 'skeletal' },
      { id: 'biceps', groupKey: 'muscular' },
    ]);

    render(
      <AtlasViewer manifestSource={{ kind: 'manifest', manifest }} visibleGroupKeys={new Set(['skeletal'])} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('atlas-scene')).toHaveTextContent('skull');
    });
    expect(screen.getByTestId('atlas-scene').textContent).not.toContain('biceps');
    expect(requestedUrls.some((url) => url.includes('biceps'))).toBe(false);
  });

  it('loads nothing when visibleGroupKeys is an empty set', async () => {
    const requestedUrls: string[] = [];
    global.fetch = createFetchMock(requestedUrls);

    const manifest = makeManifest([{ id: 'skull', groupKey: 'skeletal' }]);

    render(<AtlasViewer manifestSource={{ kind: 'manifest', manifest }} visibleGroupKeys={new Set()} />);

    await waitFor(() => {
      expect(document.querySelector('[data-atlas-viewer-status="ready"]')).toBeTruthy();
    });
    expect(screen.getByTestId('atlas-scene')).toHaveTextContent('');
    expect(requestedUrls.some((url) => url.includes('skull.glb'))).toBe(false);
  });

  it('toggling a group on loads just that group, and toggling it off disposes its packages and drops them from the scene', async () => {
    const requestedUrls: string[] = [];
    global.fetch = createFetchMock(requestedUrls);

    const manifest = makeManifest([
      { id: 'skull', groupKey: 'skeletal' },
      { id: 'biceps', groupKey: 'muscular' },
    ]);

    const { rerender } = render(
      <AtlasViewer manifestSource={{ kind: 'manifest', manifest }} visibleGroupKeys={new Set(['skeletal'])} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('atlas-scene')).toHaveTextContent('skull');
    });

    // Toggle "muscular" on as well.
    rerender(
      <AtlasViewer
        manifestSource={{ kind: 'manifest', manifest }}
        visibleGroupKeys={new Set(['skeletal', 'muscular'])}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('atlas-scene')).toHaveTextContent('skull,biceps');
    });

    const bicepsDispose = disposeSpiesByPackageId.get('biceps');
    expect(bicepsDispose).toBeDefined();
    expect(bicepsDispose).not.toHaveBeenCalled();

    // Toggle "muscular" back off — biceps must disappear from the scene AND be disposed, not
    // just hidden (no GPU-memory leak).
    rerender(
      <AtlasViewer manifestSource={{ kind: 'manifest', manifest }} visibleGroupKeys={new Set(['skeletal'])} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('atlas-scene').textContent).not.toContain('biceps');
    });
    expect(screen.getByTestId('atlas-scene')).toHaveTextContent('skull');
    expect(bicepsDispose).toHaveBeenCalled();

    // skull (still visible throughout) must never have been disposed.
    expect(disposeSpiesByPackageId.get('skull')).not.toHaveBeenCalled();
  });

  it('refetches a package after it is toggled off and back on (cache does not retain evicted packages)', async () => {
    const requestedUrls: string[] = [];
    global.fetch = createFetchMock(requestedUrls);

    const manifest = makeManifest([{ id: 'biceps', groupKey: 'muscular' }]);

    const { rerender } = render(
      <AtlasViewer manifestSource={{ kind: 'manifest', manifest }} visibleGroupKeys={new Set(['muscular'])} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('atlas-scene')).toHaveTextContent('biceps');
    });
    const fetchCountAfterFirstLoad = requestedUrls.filter((u) => u.includes('biceps')).length;
    expect(fetchCountAfterFirstLoad).toBeGreaterThan(0);

    rerender(<AtlasViewer manifestSource={{ kind: 'manifest', manifest }} visibleGroupKeys={new Set([])} />);
    await waitFor(() => {
      expect(screen.getByTestId('atlas-scene').textContent).not.toContain('biceps');
    });

    rerender(
      <AtlasViewer manifestSource={{ kind: 'manifest', manifest }} visibleGroupKeys={new Set(['muscular'])} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('atlas-scene')).toHaveTextContent('biceps');
    });

    const fetchCountAfterSecondLoad = requestedUrls.filter((u) => u.includes('biceps')).length;
    expect(fetchCountAfterSecondLoad).toBeGreaterThan(fetchCountAfterFirstLoad);
  });
});

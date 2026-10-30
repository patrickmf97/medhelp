import type { AtlasManifestV1 } from '@medhelp/atlas-pipeline';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { Group } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AtlasViewer } from './atlas-viewer';
import type { LoadedAtlasPackage } from './types';

// The full R3F <Canvas> needs a real WebGL context, which jsdom does not provide. scene.tsx's
// rendering is exercised separately (through smaller, mockable units); here we only care that
// AtlasViewer passes the right `loaded` packages through, so the scene is stubbed out.
vi.mock('./scene', () => ({
  AtlasScene: ({ loaded }: { loaded: LoadedAtlasPackage[] }) => (
    <div data-testid="atlas-scene">{loaded.map((pkg) => pkg.id).join(',')}</div>
  ),
}));

// Stub three's GLTFLoader so package "parsing" is instant and deterministic, without touching
// real binary GLB parsing (that path has its own dedicated test in loading/loader.test.ts).
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => {
  class FakeGLTFLoader {
    setMeshoptDecoder() {
      // no-op: this fake never actually decodes bytes, see parse() below.
    }
    parse(_buffer: ArrayBuffer, _path: string, onLoad: (gltf: { scene: unknown }) => void) {
      onLoad({ scene: new Group() });
    }
  }
  return { GLTFLoader: FakeGLTFLoader };
});
vi.mock('three/examples/jsm/libs/meshopt_decoder.module.js', () => ({ MeshoptDecoder: {} }));

function makeManifest(packageIds: string[]): AtlasManifestV1 {
  return {
    schemaVersion: 1,
    source: {
      name: 'Test fixture',
      license: 'cc-by-sa-4.0',
      licenseUrl: 'https://example.com/license',
      modificationNotes: 'synthetic test fixture, not real content',
    },
    packages: packageIds.map((id) => ({
      id,
      groupKey: 'test-group',
      byteSize: 0,
      hash: `hash-${id}`,
      structureIds: [],
    })),
    structures: [],
  };
}

type FetchResponseStub = { ok: boolean; status?: number; statusText?: string; arrayBuffer: () => Promise<ArrayBuffer>; json?: () => Promise<unknown> };

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('AtlasViewer', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('renders the initial loading shell before the manifest resolves', () => {
    render(<AtlasViewer manifestSource={{ kind: 'manifest', manifest: makeManifest([]) }} />);

    expect(screen.getByRole('status')).toHaveTextContent('Carregando');
  });

  it('progressively loads every package in the manifest and renders the ready scene', async () => {
    global.fetch = vi.fn(
      async (): Promise<FetchResponseStub> => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }),
    ) as unknown as typeof fetch;

    render(
      <AtlasViewer
        manifestSource={{ kind: 'manifest', manifest: makeManifest(['package-a', 'package-b']) }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('atlas-scene')).toHaveTextContent('package-a,package-b');
    });
  });

  it('surfaces a manifest fetch failure as an alert instead of throwing', async () => {
    global.fetch = vi.fn(
      async (): Promise<FetchResponseStub> => ({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        arrayBuffer: async () => new ArrayBuffer(0),
        json: async () => ({}),
      }),
    ) as unknown as typeof fetch;

    render(<AtlasViewer manifestSource={{ kind: 'url', url: 'https://example.com/manifest.json' }} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch atlas manifest');
    });
  });

  it('resolves package URLs against the page origin when the manifest URL is relative (e.g. a Next.js public asset)', async () => {
    const requestedUrls: string[] = [];
    global.fetch = vi.fn((input: string | URL): Promise<FetchResponseStub> => {
      const href = typeof input === 'string' ? input : input.toString();
      requestedUrls.push(href);
      if (href.endsWith('manifest.json')) {
        return Promise.resolve({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(0),
          json: async () => makeManifest(['sample']),
        });
      }
      return Promise.resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });
    }) as unknown as typeof fetch;

    render(<AtlasViewer manifestSource={{ kind: 'url', url: '/atlas/manifest.json' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('atlas-scene')).toHaveTextContent('sample');
    });

    expect(requestedUrls.some((url) => url.endsWith('/atlas/sample.glb'))).toBe(true);
  });

  it('never shows a superseded manifest source\'s packages once a newer one is supplied', async () => {
    const slow = createDeferred<FetchResponseStub>();

    global.fetch = vi.fn((input: string | URL) => {
      const href = typeof input === 'string' ? input : input.toString();
      if (href.includes('stale-package')) {
        return slow.promise;
      }
      return Promise.resolve<FetchResponseStub>({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });
    }) as unknown as typeof fetch;

    const staleManifest = makeManifest(['stale-package']);
    const freshManifest = makeManifest(['fresh-package']);

    const { rerender } = render(
      <AtlasViewer manifestSource={{ kind: 'manifest', manifest: staleManifest }} />,
    );

    rerender(<AtlasViewer manifestSource={{ kind: 'manifest', manifest: freshManifest }} />);

    await waitFor(() => {
      expect(screen.getByTestId('atlas-scene')).toHaveTextContent('fresh-package');
    });

    // The stale package's fetch finally resolves late — it must never reach the rendered scene.
    slow.resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });
    await Promise.resolve();
    await Promise.resolve();

    expect(screen.getByTestId('atlas-scene')).toHaveTextContent('fresh-package');
    expect(screen.getByTestId('atlas-scene').textContent).not.toContain('stale-package');
  });

  it('loads packages with bounded concurrency instead of strictly one at a time, so a slow early package does not block a fast later one', async () => {
    // Regression: a real public manifest can have thousands of small packages (one real-world
    // route serves ~2,960 individual structure GLBs — see apps/web's /explorar/atlas route).
    // Strictly sequential loading made that route take minutes to reach "ready". The fast
    // "package-2" here must be able to appear in the scene before the slow "package-0" resolves.
    const slow = createDeferred<FetchResponseStub>();

    global.fetch = vi.fn((input: string | URL) => {
      const href = typeof input === 'string' ? input : input.toString();
      if (href.includes('package-0')) {
        return slow.promise;
      }
      return Promise.resolve<FetchResponseStub>({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });
    }) as unknown as typeof fetch;

    render(
      <AtlasViewer
        manifestSource={{ kind: 'manifest', manifest: makeManifest(['package-0', 'package-1', 'package-2']) }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('atlas-scene')).toHaveTextContent('package-2');
    });
    expect(screen.getByTestId('atlas-scene').textContent).not.toContain('package-0');

    slow.resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });

    await waitFor(() => {
      expect(screen.getByTestId('atlas-scene')).toHaveTextContent('package-0');
    });
  });

  it('final ready state lists every package in manifest order regardless of resolution order', async () => {
    const order: string[] = [];
    global.fetch = vi.fn(async (input: string | URL): Promise<FetchResponseStub> => {
      const href = typeof input === 'string' ? input : input.toString();
      order.push(href);
      // "package-b" resolves fastest, "package-a" slowest — resolution order is reversed from
      // manifest order, to prove the final array is sorted by manifest order, not arrival order.
      const delay = href.includes('package-a') ? 15 : href.includes('package-b') ? 0 : 5;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) };
    }) as unknown as typeof fetch;

    render(
      <AtlasViewer
        manifestSource={{ kind: 'manifest', manifest: makeManifest(['package-a', 'package-b', 'package-c']) }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('atlas-scene')).toHaveTextContent('package-a,package-b,package-c');
    });
  });
});

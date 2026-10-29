import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Object3D } from 'three';
import { Group } from 'three';
import { describe, expect, it, vi } from 'vitest';

import { AtlasAssetLoader, parseGlbWithThree } from './loader';

const here = dirname(fileURLToPath(import.meta.url));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Builds the smallest valid GLB buffer (a single empty scene, no meshes/buffers) by hand, per
 * the glTF 2.0 binary container spec — no network, no gltf-transform dependency needed just to
 * get one real, parseable fixture for the "real parser" test below. */
function buildMinimalGlb(): ArrayBuffer {
  const json = JSON.stringify({ asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [] }] });
  const jsonBytes = new TextEncoder().encode(json);
  const paddedLength = Math.ceil(jsonBytes.length / 4) * 4;
  const padded = new Uint8Array(paddedLength).fill(0x20);
  padded.set(jsonBytes);

  const totalLength = 12 + 8 + padded.length;
  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);

  view.setUint32(0, 0x46546c67, true); // magic 'glTF'
  view.setUint32(4, 2, true); // version
  view.setUint32(8, totalLength, true); // total length

  view.setUint32(12, padded.length, true); // chunk length
  view.setUint32(16, 0x4e4f534a, true); // chunk type 'JSON'
  new Uint8Array(buffer, 20, padded.length).set(padded);

  return buffer;
}

describe('AtlasAssetLoader', () => {
  it('dedupes concurrent requests for the same package id into a single fetch', async () => {
    const object: Object3D = new Group();
    const fetchPackageBytes = vi.fn(async () => new ArrayBuffer(0));
    const parseGlb = vi.fn(async () => object);
    const loader = new AtlasAssetLoader(fetchPackageBytes, parseGlb);

    const a = loader.loadPackage('skeletal-head', new AbortController().signal);
    const b = loader.loadPackage('skeletal-head', new AbortController().signal);

    await expect(a).resolves.toBe(object);
    await expect(b).resolves.toBe(object);
    expect(fetchPackageBytes).toHaveBeenCalledTimes(1);
    expect(parseGlb).toHaveBeenCalledTimes(1);
  });

  it('rejects with an AbortError when the signal aborts mid-load', async () => {
    const fetchDeferred = createDeferred<ArrayBuffer>();
    const fetchPackageBytes = vi.fn(() => fetchDeferred.promise);
    const loader = new AtlasAssetLoader(fetchPackageBytes, vi.fn(async () => new Group()));
    const controller = new AbortController();

    const first = loader.loadPackage('skeletal-head', controller.signal);
    controller.abort();

    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects immediately if given an already-aborted signal', async () => {
    const fetchPackageBytes = vi.fn(async () => new ArrayBuffer(0));
    const loader = new AtlasAssetLoader(fetchPackageBytes, vi.fn(async () => new Group()));
    const controller = new AbortController();
    controller.abort();

    await expect(loader.loadPackage('skeletal-head', controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(fetchPackageBytes).not.toHaveBeenCalled();
  });

  it('never resolves a caller whose request was superseded — the scene only reflects the latest load', async () => {
    const fetchA = createDeferred<ArrayBuffer>();
    const fetchB = createDeferred<ArrayBuffer>();
    const bufferA = new ArrayBuffer(1);
    const bufferB = new ArrayBuffer(2);
    const objectA = new Group();
    const objectB = new Group();

    // Keyed by id/buffer identity rather than call order, since A's parse is never actually
    // invoked below (its load is aborted before parsing) — ordinal mock queues would silently
    // assign B's result to A's slot instead.
    const fetchPackageBytes = vi.fn((id: string) => (id === 'structure-a' ? fetchA.promise : fetchB.promise));
    const parseGlb = vi.fn(async (buffer: ArrayBuffer) => (buffer === bufferA ? objectA : objectB));

    const loader = new AtlasAssetLoader(fetchPackageBytes, parseGlb);

    const controllerA = new AbortController();
    const onResolveA = vi.fn();
    const onRejectA = vi.fn();
    loader.loadPackage('structure-a', controllerA.signal).then(onResolveA, onRejectA);

    // Simulate a rapid filter/search change: abandon A before it ever resolves, then start B.
    controllerA.abort();
    const controllerB = new AbortController();
    const second = loader.loadPackage('structure-b', controllerB.signal);

    // A's underlying fetch finally resolves late — its side effect must never fire.
    fetchA.resolve(bufferA);
    fetchB.resolve(bufferB);
    const resultB = await second;

    expect(resultB).toBe(objectB);
    expect(onResolveA).not.toHaveBeenCalled();
    expect(onRejectA).toHaveBeenCalledWith(expect.objectContaining({ name: 'AbortError' }));
  });

  it('does not cancel a second caller still waiting on the same id when a first caller aborts', async () => {
    const fetchDeferred = createDeferred<ArrayBuffer>();
    const object = new Group();
    const fetchPackageBytes = vi.fn(() => fetchDeferred.promise);
    const parseGlb = vi.fn(async () => object);
    const loader = new AtlasAssetLoader(fetchPackageBytes, parseGlb);

    const controllerA = new AbortController();
    const controllerB = new AbortController();

    const first = loader.loadPackage('skeletal-head', controllerA.signal);
    const second = loader.loadPackage('skeletal-head', controllerB.signal);

    controllerA.abort();
    await expect(first).rejects.toMatchObject({ name: 'AbortError' });

    fetchDeferred.resolve(new ArrayBuffer(0));
    await expect(second).resolves.toBe(object);
  });

  it('aborts the underlying fetch once every caller for an id has aborted', async () => {
    let capturedSignal: AbortSignal | undefined;
    const fetchPackageBytes = vi.fn((_id: string, signal: AbortSignal) => {
      capturedSignal = signal;
      return new Promise<ArrayBuffer>(() => {
        /* never settles on its own */
      });
    });
    const loader = new AtlasAssetLoader(fetchPackageBytes, vi.fn(async () => new Group()));
    const controller = new AbortController();

    const only = loader.loadPackage('skeletal-head', controller.signal);
    controller.abort();
    await expect(only).rejects.toMatchObject({ name: 'AbortError' });

    expect(capturedSignal?.aborted).toBe(true);
  });

  it('parses a real (synthetic, minimal) GLB buffer end-to-end with the default parser', async () => {
    const buffer = buildMinimalGlb();
    const fetchPackageBytes = vi.fn(async () => buffer);
    const loader = new AtlasAssetLoader(fetchPackageBytes, parseGlbWithThree);

    const object = await loader.loadPackage('empty-scene', new AbortController().signal);

    expect(object).toBeDefined();
    expect(object.type).toBe('Group');
  });

  it('parses a real Meshopt-compressed GLB produced by the atlas pipeline (the default compression every real asset uses)', async () => {
    // Regression test: GLTFLoader throws ("setMeshoptDecoder must be called before loading
    // compressed files") on a real Meshopt-compressed GLB unless the loader is configured with a
    // MeshoptDecoder first — the earlier synthetic/uncompressed fixture above can't catch this
    // because it has no EXT_meshopt_compression extension at all. Confirmed against a real
    // browser render before this fixture/test existed.
    // Copy into a fresh Uint8Array/ArrayBuffer constructed in this test's own realm: Vitest's
    // jsdom environment runs in a separate VM context, so a Node Buffer's own .buffer is an
    // ArrayBuffer from a *different* realm than the one GLTFLoader's `instanceof` checks run
    // in here — reusing it directly made GLTFLoader silently misparse the binary container
    // (confirmed: valid magic/version bytes, still failed, only in this jsdom-realm test).
    const nodeBuffer = readFileSync(join(here, '../../fixtures/synthetic-meshopt-triangle.glb'));
    const buffer = new Uint8Array(nodeBuffer).buffer;
    const fetchPackageBytes = vi.fn(async () => buffer);
    const loader = new AtlasAssetLoader(fetchPackageBytes, parseGlbWithThree);

    const object = await loader.loadPackage('meshopt-triangle', new AbortController().signal);

    expect(object).toBeDefined();
    let meshCount = 0;
    object.traverse((child) => {
      if (child.type === 'Mesh') meshCount += 1;
    });
    expect(meshCount).toBe(1);
  });
});

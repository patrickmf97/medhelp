import type { Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type FetchPackageBytes = (id: string, signal: AbortSignal) => Promise<ArrayBuffer>;
export type ParseGlb = (buffer: ArrayBuffer, signal: AbortSignal) => Promise<Object3D>;

/** Builds an Error (DOMException where available) matching the Fetch spec's AbortError shape:
 * `{ name: 'AbortError' }`. */
export function makeAbortError(): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException('The operation was aborted.', 'AbortError') as unknown as Error;
  }
  const error = new Error('The operation was aborted.');
  error.name = 'AbortError';
  return error;
}

/**
 * Default GLB parser: parses an already-fetched ArrayBuffer into a Three.js scene graph via
 * three's own GLTFLoader. Pure parsing — no DOM/WebGL requirement — so this also runs fine under
 * jsdom or on the server; only *rendering* the result needs a real GPU context.
 */
export const parseGlbWithThree: ParseGlb = (buffer, signal) =>
  new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(makeAbortError());
      return;
    }
    const loader = new GLTFLoader();
    loader.parse(
      buffer,
      '',
      (gltf) => {
        if (signal.aborted) {
          reject(makeAbortError());
          return;
        }
        resolve(gltf.scene);
      },
      (error: unknown) => {
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });

/** Wraps `work` so the returned promise rejects with an AbortError as soon as `signal` aborts,
 * regardless of whether/when `work` itself settles, and never resolves/rejects with `work`'s own
 * outcome once aborted (a late `.then()` on an aborted load must not run). */
function withAbort<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(makeAbortError());
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(makeAbortError());
    };
    signal.addEventListener('abort', onAbort, { once: true });
    work.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        if (!signal.aborted) resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        if (!signal.aborted) reject(error);
      },
    );
  });
}

type InFlightEntry = {
  controller: AbortController;
  promise: Promise<Object3D>;
  refCount: number;
};

/**
 * Loads atlas packages (GLB assets) by id, with:
 *
 * - Dedup: concurrent `loadPackage()` calls for the same id share one fetch+parse rather than
 *   starting one each.
 * - Cancellation: aborting a caller's own signal rejects only *that* caller's promise with
 *   `{ name: 'AbortError' }`. Other callers still waiting on the same id are unaffected, unless
 *   every caller for that id has now aborted — only then is the underlying fetch/parse itself
 *   aborted (so a lone caller's cancel doesn't waste work other callers still want, but nothing
 *   keeps loading once nobody wants it).
 * - No stale mutation: once a caller's signal is aborted, its promise is guaranteed to reject —
 *   it is never resolved with a value that arrives after the fact.
 */
export class AtlasAssetLoader {
  private readonly inFlight = new Map<string, InFlightEntry>();

  constructor(
    private readonly fetchPackageBytes: FetchPackageBytes,
    private readonly parseGlb: ParseGlb = parseGlbWithThree,
  ) {}

  loadPackage(id: string, signal: AbortSignal): Promise<Object3D> {
    if (signal.aborted) {
      return Promise.reject(makeAbortError());
    }

    let entry = this.inFlight.get(id);
    if (!entry) {
      const controller = new AbortController();
      const newEntry: InFlightEntry = {
        controller,
        refCount: 0,
        promise: this.startLoad(id, controller.signal),
      };
      newEntry.promise = newEntry.promise.finally(() => {
        if (this.inFlight.get(id) === newEntry) {
          this.inFlight.delete(id);
        }
      });
      this.inFlight.set(id, newEntry);
      entry = newEntry;
    }

    const sharedEntry = entry;
    sharedEntry.refCount += 1;

    return withAbort(sharedEntry.promise, signal).finally(() => {
      sharedEntry.refCount -= 1;
      if (sharedEntry.refCount <= 0) {
        sharedEntry.controller.abort();
      }
    });
  }

  private async startLoad(id: string, signal: AbortSignal): Promise<Object3D> {
    const bytes = await this.fetchPackageBytes(id, signal);
    if (signal.aborted) {
      throw makeAbortError();
    }
    return this.parseGlb(bytes, signal);
  }
}

import type { LoadedAtlasPackage } from '../types';
import { disposeObject3D } from './dispose';

/**
 * In-memory cache of packages whose GLB has already been fetched and parsed, keyed by package id.
 * Owns GPU disposal: evicting a package, replacing it with a different object, or clearing the
 * whole cache always calls disposeObject3D on the removed entry — so a long progressive-loading
 * session does not leak GPU memory as packages are swapped in and out of the scene.
 */
export class AtlasPackageCache {
  private readonly entries = new Map<string, LoadedAtlasPackage>();

  get(id: string): LoadedAtlasPackage | undefined {
    return this.entries.get(id);
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  /** Stores a loaded package. If a *different* object was already cached under this id, the old
   * one is disposed first. */
  set(pkg: LoadedAtlasPackage): void {
    const existing = this.entries.get(pkg.id);
    if (existing && existing.object !== pkg.object) {
      disposeObject3D(existing.object);
    }
    this.entries.set(pkg.id, pkg);
  }

  /** Removes one package from the cache and releases its GPU resources. No-op if not cached. */
  evict(id: string): void {
    const existing = this.entries.get(id);
    if (!existing) return;
    this.entries.delete(id);
    disposeObject3D(existing.object);
  }

  values(): LoadedAtlasPackage[] {
    return [...this.entries.values()];
  }

  /** Evicts every cached package, releasing all GPU resources (e.g. on viewer unmount). */
  clear(): void {
    for (const id of [...this.entries.keys()]) {
      this.evict(id);
    }
  }
}

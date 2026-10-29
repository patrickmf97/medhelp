import { BoxGeometry, Mesh, MeshStandardMaterial } from 'three';
import { describe, expect, it, vi } from 'vitest';

import { AtlasPackageCache } from './cache';

function makeMesh() {
  return new Mesh(new BoxGeometry(), new MeshStandardMaterial());
}

describe('AtlasPackageCache', () => {
  it('stores and retrieves a package by id', () => {
    const cache = new AtlasPackageCache();
    const object = makeMesh();

    cache.set({ id: 'skeletal-head', object });

    expect(cache.has('skeletal-head')).toBe(true);
    expect(cache.get('skeletal-head')).toEqual({ id: 'skeletal-head', object });
  });

  it('disposes the evicted package on evict()', () => {
    const cache = new AtlasPackageCache();
    const object = makeMesh();
    const disposeGeometry = vi.spyOn(object.geometry, 'dispose');

    cache.set({ id: 'skeletal-head', object });
    cache.evict('skeletal-head');

    expect(cache.has('skeletal-head')).toBe(false);
    expect(disposeGeometry).toHaveBeenCalledTimes(1);
  });

  it('evict() is a no-op when the id is not cached', () => {
    const cache = new AtlasPackageCache();
    expect(() => cache.evict('does-not-exist')).not.toThrow();
  });

  it('disposes the previous object when a different object replaces it under the same id', () => {
    const cache = new AtlasPackageCache();
    const first = makeMesh();
    const second = makeMesh();
    const disposeFirst = vi.spyOn(first.geometry, 'dispose');
    const disposeSecond = vi.spyOn(second.geometry, 'dispose');

    cache.set({ id: 'skeletal-head', object: first });
    cache.set({ id: 'skeletal-head', object: second });

    expect(disposeFirst).toHaveBeenCalledTimes(1);
    expect(disposeSecond).not.toHaveBeenCalled();
    expect(cache.get('skeletal-head')?.object).toBe(second);
  });

  it('disposes every cached package on clear()', () => {
    const cache = new AtlasPackageCache();
    const a = makeMesh();
    const b = makeMesh();
    const disposeA = vi.spyOn(a.geometry, 'dispose');
    const disposeB = vi.spyOn(b.geometry, 'dispose');

    cache.set({ id: 'a', object: a });
    cache.set({ id: 'b', object: b });

    cache.clear();

    expect(disposeA).toHaveBeenCalledTimes(1);
    expect(disposeB).toHaveBeenCalledTimes(1);
    expect(cache.values()).toHaveLength(0);
  });
});

import { Group, Mesh, MeshBasicMaterial, Object3D, SphereGeometry } from 'three';
import { describe, expect, it, vi } from 'vitest';

import { createSceneClickHandler, resolvePackageId } from './selection';

/** Builds a package-root group (tagged, like atlas-viewer.tsx tags it) with a nested mesh several
 * levels deep, matching a real GLB's scene graph (loader root -> export groups -> leaf mesh). */
function buildTaggedPackage(packageId: string): { root: Group; leafMesh: Mesh } {
  const root = new Group();
  root.userData['packageId'] = packageId;

  const intermediate = new Group();
  root.add(intermediate);

  const leafMesh = new Mesh(new SphereGeometry(1, 4, 4), new MeshBasicMaterial());
  intermediate.add(leafMesh);

  return { root, leafMesh };
}

describe('resolvePackageId', () => {
  it('returns the package id tagged directly on the clicked object', () => {
    const object = new Object3D();
    object.userData['packageId'] = 'femur-l';

    expect(resolvePackageId(object)).toBe('femur-l');
  });

  it('walks up multiple levels of ancestors to find the tagged package root (a real GLB is several levels deep)', () => {
    const { leafMesh } = buildTaggedPackage('femur-l');

    expect(resolvePackageId(leafMesh)).toBe('femur-l');
  });

  it('returns null when no ancestor up to the scene root carries a packageId', () => {
    const root = new Group(); // untagged
    const child = new Group();
    root.add(child);
    const leaf = new Mesh(new SphereGeometry(1, 4, 4), new MeshBasicMaterial());
    child.add(leaf);

    expect(resolvePackageId(leaf)).toBeNull();
  });

  it('returns null for a null/undefined object', () => {
    expect(resolvePackageId(null)).toBeNull();
    expect(resolvePackageId(undefined)).toBeNull();
  });

  it('resolves the nearest tagged ancestor, not a more distant one, when two packages happen to be nested (defensive — real packages are siblings, never nested)', () => {
    const outer = new Group();
    outer.userData['packageId'] = 'outer-package';
    const inner = new Group();
    inner.userData['packageId'] = 'inner-package';
    outer.add(inner);
    const leaf = new Mesh(new SphereGeometry(1, 4, 4), new MeshBasicMaterial());
    inner.add(leaf);

    expect(resolvePackageId(leaf)).toBe('inner-package');
  });
});

describe('createSceneClickHandler', () => {
  it('reports the resolved package id to onStructureSelected and stops propagation', () => {
    const { leafMesh } = buildTaggedPackage('tibia-r');
    const onStructureSelected = vi.fn();
    const stopPropagation = vi.fn();

    const handler = createSceneClickHandler(onStructureSelected);
    handler({ object: leafMesh, stopPropagation });

    expect(onStructureSelected).toHaveBeenCalledExactlyOnceWith('tibia-r');
    expect(stopPropagation).toHaveBeenCalledOnce();
  });

  it('still stops propagation but never calls onStructureSelected when the click misses every tagged package', () => {
    const untaggedLeaf = new Mesh(new SphereGeometry(1, 4, 4), new MeshBasicMaterial());
    const onStructureSelected = vi.fn();
    const stopPropagation = vi.fn();

    const handler = createSceneClickHandler(onStructureSelected);
    handler({ object: untaggedLeaf, stopPropagation });

    expect(onStructureSelected).not.toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalledOnce();
  });

  it('does nothing but stop propagation when the host passed no onStructureSelected at all', () => {
    const { leafMesh } = buildTaggedPackage('tibia-r');
    const stopPropagation = vi.fn();

    const handler = createSceneClickHandler(undefined);

    expect(() => handler({ object: leafMesh, stopPropagation })).not.toThrow();
    expect(stopPropagation).toHaveBeenCalledOnce();
  });
});

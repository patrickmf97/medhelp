import { Box3, Group, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { computeCombinedBoundingBox, computeFitCamera } from './camera';

function boxFromMinMax(min: [number, number, number], max: [number, number, number]): Box3 {
  return new Box3(new Vector3(...min), new Vector3(...max));
}

describe('computeFitCamera', () => {
  it('looks at the center of the bounding box', () => {
    const box = boxFromMinMax([-1, -1, -1], [3, 5, 7]);
    const fit = computeFitCamera(box);

    expect(fit.target.x).toBeCloseTo(1);
    expect(fit.target.y).toBeCloseTo(2);
    expect(fit.target.z).toBeCloseTo(3);
  });

  it('places the camera outside the bounding sphere at a finite, positive distance', () => {
    const box = boxFromMinMax([-1, -1, -1], [1, 1, 1]);
    const fit = computeFitCamera(box);

    const distance = fit.position.distanceTo(fit.target);
    expect(distance).toBeGreaterThan(0);
    expect(Number.isFinite(distance)).toBe(true);
    // The box's bounding sphere radius is sqrt(3) ~= 1.732; the camera must stand well outside it,
    // not inside/on the subject.
    expect(distance).toBeGreaterThan(Math.sqrt(3));
  });

  it('moves the camera farther back as the box grows, proportionally', () => {
    const small = computeFitCamera(boxFromMinMax([-1, -1, -1], [1, 1, 1]));
    const large = computeFitCamera(boxFromMinMax([-10, -10, -10], [10, 10, 10]));

    const smallDistance = small.position.distanceTo(small.target);
    const largeDistance = large.position.distanceTo(large.target);

    expect(largeDistance).toBeGreaterThan(smallDistance);
    // The large box is exactly 10x the small one in every dimension; distance should scale
    // roughly linearly with it (allow generous tolerance for the padding/offset math).
    expect(largeDistance / smallDistance).toBeGreaterThan(5);
    expect(largeDistance / smallDistance).toBeLessThan(15);
  });

  it('requires more distance for a narrower (portrait) aspect ratio than a wider (landscape) one', () => {
    const box = boxFromMinMax([-2, -2, -2], [2, 2, 2]);
    const portrait = computeFitCamera(box, { aspect: 0.5 });
    const landscape = computeFitCamera(box, { aspect: 2 });

    const portraitDistance = portrait.position.distanceTo(portrait.target);
    const landscapeDistance = landscape.position.distanceTo(landscape.target);

    expect(portraitDistance).toBeGreaterThan(landscapeDistance);
  });

  it('keeps near < far, both positive, and near below the fitted distance', () => {
    const box = boxFromMinMax([-5, -2, -3], [5, 8, 3]);
    const fit = computeFitCamera(box);
    const distance = fit.position.distanceTo(fit.target);

    expect(fit.near).toBeGreaterThan(0);
    expect(fit.far).toBeGreaterThan(fit.near);
    expect(fit.near).toBeLessThan(distance);
    expect(fit.far).toBeGreaterThan(distance);
  });

  it('never produces NaN/Infinity for a degenerate zero-size box (a single point)', () => {
    const point = boxFromMinMax([4, 4, 4], [4, 4, 4]);
    const fit = computeFitCamera(point);

    expect(Number.isFinite(fit.position.x)).toBe(true);
    expect(Number.isFinite(fit.position.y)).toBe(true);
    expect(Number.isFinite(fit.position.z)).toBe(true);
    expect(Number.isFinite(fit.near)).toBe(true);
    expect(Number.isFinite(fit.far)).toBe(true);
    expect(fit.far).toBeGreaterThan(fit.near);
    expect(fit.target).toEqual(new Vector3(4, 4, 4));
  });

  it('never produces NaN/Infinity for an empty box (no content loaded yet)', () => {
    const empty = new Box3().makeEmpty();
    const fit = computeFitCamera(empty);

    expect(Number.isFinite(fit.position.x)).toBe(true);
    expect(Number.isFinite(fit.position.y)).toBe(true);
    expect(Number.isFinite(fit.position.z)).toBe(true);
    expect(Number.isFinite(fit.near)).toBe(true);
    expect(Number.isFinite(fit.far)).toBe(true);
    expect(fit.far).toBeGreaterThan(fit.near);
  });

  it('offsets the camera along a direction with visible depth on every axis, not a flat axis-aligned view', () => {
    const box = boxFromMinMax([-1, -1, -1], [1, 1, 1]);
    const fit = computeFitCamera(box);
    const offset = fit.position.clone().sub(fit.target);

    expect(Math.abs(offset.x)).toBeGreaterThan(0.01);
    expect(Math.abs(offset.y)).toBeGreaterThan(0.01);
    expect(Math.abs(offset.z)).toBeGreaterThan(0.01);
  });

  it('applies extra padding so a larger padding option increases distance without changing the target', () => {
    const box = boxFromMinMax([-1, -1, -1], [1, 1, 1]);
    const tight = computeFitCamera(box, { padding: 1 });
    const padded = computeFitCamera(box, { padding: 2 });

    const tightDistance = tight.position.distanceTo(tight.target);
    const paddedDistance = padded.position.distanceTo(padded.target);

    expect(paddedDistance).toBeCloseTo(tightDistance * 2, 5);
    expect(padded.target).toEqual(tight.target);
  });
});

describe('computeCombinedBoundingBox', () => {
  function sphereAt(x: number, y: number, z: number, radius = 1): Mesh {
    const mesh = new Mesh(new SphereGeometry(radius, 8, 8), new MeshBasicMaterial());
    mesh.position.set(x, y, z);
    return mesh;
  }

  it('returns an empty box for no objects', () => {
    const box = computeCombinedBoundingBox([]);
    expect(box.isEmpty()).toBe(true);
  });

  it('computes a single box for one object', () => {
    const box = computeCombinedBoundingBox([sphereAt(0, 0, 0, 1)]);
    expect(box.isEmpty()).toBe(false);
    expect(box.min.x).toBeCloseTo(-1, 1);
    expect(box.max.x).toBeCloseTo(1, 1);
  });

  it('unions multiple far-apart objects into one combined box spanning all of them', () => {
    const box = computeCombinedBoundingBox([sphereAt(-10, 0, 0, 1), sphereAt(10, 0, 0, 1)]);

    expect(box.min.x).toBeLessThan(-8);
    expect(box.max.x).toBeGreaterThan(8);
  });

  it('handles a group containing nested meshes, not just top-level objects', () => {
    const group = new Group();
    group.add(sphereAt(0, 5, 0, 1));
    group.add(sphereAt(0, -5, 0, 1));

    const box = computeCombinedBoundingBox([group]);

    expect(box.min.y).toBeLessThan(-4);
    expect(box.max.y).toBeGreaterThan(4);
  });
});

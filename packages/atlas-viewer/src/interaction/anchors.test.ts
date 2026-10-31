import { BoxGeometry, Mesh, MeshBasicMaterial, Object3D } from 'three';
import { describe, expect, it } from 'vitest';

import { computeStructureAnchor } from './anchors';

describe('computeStructureAnchor', () => {
  it('anchors on the real world-space bounding-box center of the object', () => {
    const mesh = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial());
    mesh.position.set(10, 20, 30);
    mesh.updateMatrixWorld(true);

    const anchor = computeStructureAnchor(mesh);

    expect(anchor.point.x).toBeCloseTo(10);
    expect(anchor.point.y).toBeCloseTo(20);
    expect(anchor.point.z).toBeCloseTo(30);
  });

  it('lifts the label point straight up from the structure point', () => {
    const mesh = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial());
    mesh.position.set(0, 0, 0);
    mesh.updateMatrixWorld(true);

    const anchor = computeStructureAnchor(mesh);

    expect(anchor.labelPoint.x).toBeCloseTo(anchor.point.x);
    expect(anchor.labelPoint.z).toBeCloseTo(anchor.point.z);
    expect(anchor.labelPoint.y).toBeGreaterThan(anchor.point.y);
  });

  it('lifts a bigger structure\'s label further than a smaller one\'s, proportional to size', () => {
    const small = new Mesh(new BoxGeometry(0.1, 0.1, 0.1), new MeshBasicMaterial());
    small.updateMatrixWorld(true);
    const big = new Mesh(new BoxGeometry(50, 50, 50), new MeshBasicMaterial());
    big.updateMatrixWorld(true);

    const smallLift = computeStructureAnchor(small).labelPoint.y - computeStructureAnchor(small).point.y;
    const bigLift = computeStructureAnchor(big).labelPoint.y - computeStructureAnchor(big).point.y;

    expect(bigLift).toBeGreaterThan(smallLift);
  });

  it('still applies a minimum, visible lift for a vanishingly small/degenerate object (e.g. an empty group with no mesh)', () => {
    const emptyGroup = new Object3D();
    emptyGroup.position.set(5, 5, 5);
    emptyGroup.updateMatrixWorld(true);

    const anchor = computeStructureAnchor(emptyGroup);

    expect(anchor.labelPoint.y).toBeGreaterThan(anchor.point.y);
    expect(Number.isFinite(anchor.labelPoint.y)).toBe(true);
  });

  it('accounts for the object\'s own world transform, not just its local geometry', () => {
    const parent = new Object3D();
    parent.position.set(100, 0, 0);
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
    parent.add(mesh);
    parent.updateMatrixWorld(true);

    const anchor = computeStructureAnchor(mesh);

    expect(anchor.point.x).toBeCloseTo(100);
  });
});

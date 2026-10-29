import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three';
import { describe, expect, it, vi } from 'vitest';

import { disposeObject3D } from './dispose';

describe('disposeObject3D', () => {
  it('disposes geometry and material on every mesh in the hierarchy', () => {
    const geometryA = new BoxGeometry();
    const materialA = new MeshStandardMaterial();
    const meshA = new Mesh(geometryA, materialA);

    const geometryB = new BoxGeometry();
    const materialB = new MeshStandardMaterial();
    const meshB = new Mesh(geometryB, materialB);

    const group = new Group();
    group.add(meshA);
    group.add(meshB);

    const disposeGeometryA = vi.spyOn(geometryA, 'dispose');
    const disposeMaterialA = vi.spyOn(materialA, 'dispose');
    const disposeGeometryB = vi.spyOn(geometryB, 'dispose');
    const disposeMaterialB = vi.spyOn(materialB, 'dispose');

    disposeObject3D(group);

    expect(disposeGeometryA).toHaveBeenCalledTimes(1);
    expect(disposeMaterialA).toHaveBeenCalledTimes(1);
    expect(disposeGeometryB).toHaveBeenCalledTimes(1);
    expect(disposeMaterialB).toHaveBeenCalledTimes(1);
  });

  it('disposes an array of materials on a multi-material mesh', () => {
    const geometry = new BoxGeometry();
    const materials = [new MeshStandardMaterial(), new MeshStandardMaterial()];
    const mesh = new Mesh(geometry, materials);

    const disposeSpies = materials.map((m) => vi.spyOn(m, 'dispose'));

    disposeObject3D(mesh);

    for (const spy of disposeSpies) {
      expect(spy).toHaveBeenCalledTimes(1);
    }
  });

  it('disposes textures referenced by a material', () => {
    const geometry = new BoxGeometry();
    const material = new MeshStandardMaterial();
    const texture = new Texture();
    material.map = texture;
    const mesh = new Mesh(geometry, material);

    const disposeTexture = vi.spyOn(texture, 'dispose');
    const disposeMaterial = vi.spyOn(material, 'dispose');

    disposeObject3D(mesh);

    expect(disposeTexture).toHaveBeenCalledTimes(1);
    expect(disposeMaterial).toHaveBeenCalledTimes(1);
  });

  it('is a no-op for nodes without geometry or material (e.g. an empty Group)', () => {
    const group = new Group();
    expect(() => disposeObject3D(group)).not.toThrow();
  });
});

import type { Object3D } from 'three';

type DisposableLike = { dispose?: unknown };

function isDisposable(value: unknown): value is { dispose: () => void } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as DisposableLike).dispose === 'function'
  );
}

function isTextureLike(value: unknown): value is { isTexture: true; dispose: () => void } {
  return (
    isDisposable(value) &&
    (value as { isTexture?: unknown }).isTexture === true
  );
}

function disposeMaterial(material: unknown): void {
  if (!isDisposable(material)) return;

  // Materials hold their textures on arbitrary own-properties (map, normalMap, aoMap, ...), not
  // behind a single known field, so walk every own-enumerable property rather than hardcoding a
  // list that would silently miss new map types.
  const record = material as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (isTextureLike(value)) {
      value.dispose();
    }
  }

  material.dispose();
}

/**
 * Releases GPU resources (geometry buffers, material programs/uniforms, textures) owned by a
 * loaded package's scene graph. Three.js does not do this automatically — removing an object from
 * a scene only drops the JS reference, it does not free the underlying GPU buffers — so this must
 * be called explicitly whenever a package is evicted from the cache (see cache.ts) or the viewer
 * unmounts.
 */
export function disposeObject3D(root: Object3D): void {
  root.traverse((node) => {
    const geometry = (node as unknown as { geometry?: unknown }).geometry;
    if (isDisposable(geometry)) {
      geometry.dispose();
    }

    const material = (node as unknown as { material?: unknown }).material;
    if (Array.isArray(material)) {
      for (const m of material) {
        disposeMaterial(m);
      }
    } else if (material) {
      disposeMaterial(material);
    }
  });
}

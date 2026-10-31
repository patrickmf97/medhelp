import type { Object3D } from 'three';

/**
 * Walks up from a raycast-hit object to the nearest ancestor (inclusive) carrying a
 * `userData.packageId` string — the id atlas-viewer.tsx tags onto each loaded package's root
 * `Object3D` as it's added to the scene (see its `cache.set` call site). A real GLB's scene graph
 * can be several levels deep (the GLTFLoader-parsed root, intermediate Blender-export groups,
 * individual mesh primitives), and R3F's raycaster reports whichever leaf mesh the ray actually
 * hit, not the package root — so this always has to search upward, never assume `object` itself
 * is the tagged root.
 *
 * Returns `null` for a null/undefined object, or when no ancestor (up to the scene root) carries
 * a `packageId` — e.g. a click that hit something outside any loaded package's subtree.
 *
 * Deliberately a plain, pure, non-R3F function: real raycasting needs a real GPU/canvas (see this
 * package's own scene.test.tsx comment on that jsdom limitation), but *this* ancestor-walk only
 * needs a real `Object3D` tree, which jsdom/vitest can construct and test directly.
 */
export function resolvePackageId(object: Object3D | null | undefined): string | null {
  let current: Object3D | null | undefined = object;
  while (current) {
    const packageId = current.userData['packageId'];
    if (typeof packageId === 'string') {
      return packageId;
    }
    current = current.parent;
  }
  return null;
}

/** Minimal shape this module needs from an R3F click event — just enough to resolve a package id
 * and stop the click from bubbling further (e.g. to `<OrbitControls>` or a parent scene), without
 * this module depending on `@react-three/fiber`'s own `ThreeEvent` type. */
export type SceneClickEvent = {
  object: Object3D | null | undefined;
  stopPropagation: () => void;
};

/**
 * Builds the click handler `AtlasScene` attaches to the scene's root group: resolves the clicked
 * object's package id (see `resolvePackageId`) and reports it to `onStructureSelected`, if
 * supplied. Stops the event from propagating either way, since nothing above the scene root
 * should also react to a structure click (e.g. drei's `<OrbitControls>` reads pointer events for
 * its own drag handling).
 *
 * A factory (not an inline arrow in the component) so the resulting handler is a single, directly
 * testable function — `scene.test.tsx` calls it with a constructed fake event rather than relying
 * on jsdom to perform a real WebGL raycast, which it cannot do.
 */
export function createSceneClickHandler(
  onStructureSelected: ((packageId: string) => void) | undefined,
): (event: SceneClickEvent) => void {
  return (event: SceneClickEvent) => {
    event.stopPropagation();
    if (!onStructureSelected) return;
    const packageId = resolvePackageId(event.object);
    if (packageId !== null) {
      onStructureSelected(packageId);
    }
  };
}

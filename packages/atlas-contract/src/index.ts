import type { AtlasManifestV1 } from '@medhelp/atlas-pipeline';

export type AtlasRegionSelection = { regionId: string; label: string };

/**
 * Where an `AtlasViewer` gets the manifest describing which packages/structures it can render.
 * - `url`: the viewer fetches and parses the manifest itself.
 * - `manifest`: the host already has an `AtlasManifestV1` (e.g. fetched server-side, or shared
 *   across multiple viewer instances) and hands it straight to the viewer.
 */
export type AtlasManifestSource =
  | { kind: 'url'; url: string }
  | { kind: 'manifest'; manifest: AtlasManifestV1 };

/**
 * Public props for the `AtlasViewer` component (`@medhelp/atlas-viewer`). Kept intentionally
 * minimal to the viewer-core task's own scope — selection, camera, search and educational-panel
 * props belong to later, separate tasks and must not be added here speculatively.
 */
export type AtlasViewerProps = {
  manifestSource: AtlasManifestSource;
  /**
   * Explicit allowlist of structure ids the viewer is permitted to display. `undefined` means no
   * additional restriction. The viewer core does not enforce this allowlist itself — this field
   * only reserves the slot so a later task can wire up the plan's "public demo uses an explicit
   * structure allowlist" global constraint without a breaking change to this type.
   */
  allowedStructureIds?: string[];
  /**
   * Which manifest packages the viewer actually fetches/renders, scoped by the real manifest
   * `groupKey` each package carries (the real anatomical system/region name — see
   * `@medhelp/atlas-pipeline`'s `groupKeyForPath`). `undefined` means no restriction (every
   * package loads, the pre-navigation-panel default). An explicit `Set`/array — including an
   * empty one — restricts the viewer to only packages whose `groupKey` is a member: this is the
   * primary lever for "don't eagerly load the whole atlas" (a real public manifest can list
   * thousands of packages) — a host renders a system-picker UI on top and drives this prop as
   * the user toggles systems on/off. The viewer itself decides what to do when a groupKey leaves
   * this set (dispose that system's already-loaded packages), not just hide them.
   */
  visibleGroupKeys?: Set<string> | string[];
};

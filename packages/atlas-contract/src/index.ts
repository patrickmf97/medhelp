import type { AtlasManifestV1 } from '@medhelp/atlas-pipeline';
import type { ReactNode } from 'react';

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
  /**
   * Called whenever the viewer resolves a click on a loaded package's geometry to that package's
   * manifest id (see `@medhelp/atlas-viewer`'s `resolvePackageId`, which walks up from the
   * raycast-hit object to the nearest ancestor tagged with that package's id — every loaded
   * package's root `Object3D` is tagged this way as it's added to the scene). `undefined` means
   * the host doesn't care about clicks (the pre-selection-task default: nothing happens on
   * click). The viewer itself holds no selection state — a host that wants a "pinned labels"
   * UI (click to add, click again or close to remove) owns that set itself and decides what a
   * repeated click on the same id means; this callback only ever reports "this package was
   * clicked," once per click.
   */
  onStructureSelected?: (packageId: string) => void;
  /**
   * Package ids to render a leader-line label callout for right now — the host's own "pinned
   * structures" set (add on click, remove on a repeated click or a close control; the viewer
   * holds none of that state itself, see `onStructureSelected`). An id whose package is not
   * currently loaded (e.g. its system was toggled off via `visibleGroupKeys`) simply renders no
   * callout for that id, so a host does not need to prune this list in lockstep with every
   * loading change — though it is still free to, e.g. to avoid silently resurrecting a stale pin
   * if the same system is toggled back on later.
   */
  pinnedStructureIds?: string[];
  /**
   * Supplies the actual callout content (typically a label box with a close control) for one
   * pinned package id; the viewer only anchors/positions whatever this returns in 3D next to the
   * real structure (see `@medhelp/atlas-viewer`'s `computeStructureAnchor`) — it never decides
   * what a structure is called. Required for `pinnedStructureIds` to render anything.
   */
  renderStructureCallout?: (packageId: string) => ReactNode;
};

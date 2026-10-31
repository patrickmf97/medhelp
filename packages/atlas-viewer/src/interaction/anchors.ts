import { Box3, Vector3 } from 'three';
import type { Object3D } from 'three';

/** Minimum world-space lift applied even to a vanishingly small/degenerate structure, so its
 * label never renders directly on top of (indistinguishable from) the structure itself. */
const MIN_LABEL_LIFT = 0.4;

/** How far above the structure's own center the label is lifted, as a multiple of its bounding
 * sphere radius — bigger structures get a proportionally bigger lift so the label clears them. */
const LABEL_LIFT_MULTIPLE = 2.5;

export type StructureAnchor = {
  /** World-space point on the structure itself — where a leader line should start. */
  point: Vector3;
  /** World-space point the label box renders at — where a leader line should end. A simple,
   * deterministic "flagpole" offset straight up from `point` (no anti-overlap layout between
   * several simultaneous pins — not asked for here, see this task's report). */
  labelPoint: Vector3;
};

/**
 * Computes a pinned structure's real-world anchor from its loaded package's `Object3D`: `point`
 * is that subtree's real world-space bounding-box center, and `labelPoint` lifts straight up
 * from it by {@link LABEL_LIFT_MULTIPLE}x its bounding-sphere radius (clamped to
 * {@link MIN_LABEL_LIFT} so a razor-thin structure still gets a visibly offset label).
 *
 * `Box3.setFromObject` reads real vertex/transform data on the CPU (it does not need a GPU/WebGL
 * context), so this is safe — and exercised directly — in a plain unit test with a real `Mesh`,
 * unlike the actual on-screen leader-line rendering this feeds (see this task's report for why
 * that still needs a real-browser check).
 */
export function computeStructureAnchor(object: Object3D): StructureAnchor {
  const box = new Box3().setFromObject(object);

  if (box.isEmpty()) {
    // Defensive only: every real loaded package has real geometry. Falls back to the object's
    // own world position with the minimum lift rather than an offset from an undefined center.
    const point = object.getWorldPosition(new Vector3());
    return { point, labelPoint: point.clone().add(new Vector3(0, MIN_LABEL_LIFT, 0)) };
  }

  const point = box.getCenter(new Vector3());
  // Radius of the sphere exactly circumscribing the box: half its diagonal. three's own `Sphere`
  // has no `setFromBox` in this version, and a box's circumscribing sphere is this one-liner
  // anyway, so there's no need to round-trip through a `Sphere` instance at all.
  const radius = box.getSize(new Vector3()).length() / 2;
  const lift = Math.max(radius * LABEL_LIFT_MULTIPLE, MIN_LABEL_LIFT);
  const labelPoint = point.clone().add(new Vector3(0, lift, 0));
  return { point, labelPoint };
}

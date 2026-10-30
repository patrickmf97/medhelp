import { Box3, Sphere, Vector3 } from 'three';
import type { Object3D } from 'three';

/** Fallback radius used when the real scene content has no usable extent (an empty box, or a box
 * that collapses to a single point) — keeps the camera math finite instead of producing a zero or
 * infinite distance. */
const MIN_RADIUS = 1;

/** Default vertical field of view (degrees) assumed when the caller does not know the real
 * camera's fov (matches react-three-fiber's own `<Canvas>` default fov). */
const DEFAULT_FOV_DEGREES = 75;

/** Default viewport aspect ratio (width / height) assumed when the caller does not know it yet
 * (e.g. before the canvas has measured its container). */
const DEFAULT_ASPECT = 1;

/** Extra breathing room beyond the tight "exactly fits" distance, so the subject doesn't touch the
 * frustum edges immediately on load. */
const DEFAULT_PADDING = 1.35;

/** How far beyond the fitted distance the near/far planes extend, as a multiple of the bounding
 * sphere's radius. Generous enough that orbiting around the subject (which moves the camera closer
 * on zoom-in) doesn't immediately clip, without making the planes so wide that z-fighting becomes
 * likely. */
const CLIP_PLANE_RADIUS_MULTIPLE = 3;

export type ComputeFitCameraOptions = {
  /** Vertical field of view in degrees. Defaults to {@link DEFAULT_FOV_DEGREES}. */
  fov?: number;
  /** Viewport aspect ratio (width / height). Defaults to {@link DEFAULT_ASPECT}. */
  aspect?: number;
  /** Multiplier applied to the tightest fitting distance for breathing room around the subject.
   * Defaults to {@link DEFAULT_PADDING}. */
  padding?: number;
};

export type FitCamera = {
  /** Where to place the camera so the given bounding box is framed inside the viewport. */
  position: Vector3;
  /** Where the camera should look — the bounding box's center. */
  target: Vector3;
  /** Near clipping plane distance. Always `> 0` and `< far`. */
  near: number;
  /** Far clipping plane distance. Always `> near`. */
  far: number;
};

/**
 * Given a scene's (or a set of loaded packages') combined bounding box, computes a camera
 * position + look-at target that frames it reasonably, plus near/far planes sized to the box.
 *
 * Pure three.js math with no R3F/WebGL dependency, so it is fully unit-testable without a GPU
 * (unlike the actual `<Canvas>` rendering in scene.tsx, which needs a real browser).
 *
 * Approach: fit a bounding *sphere* around the box (simpler and more robust than fitting the box's
 * corners directly — it is viewpoint-independent, so a single distance works no matter which
 * direction the camera approaches from) using the standard "distance so a sphere of radius r fits
 * within a field of view" formula, then offset the camera from the box center along a fixed,
 * slightly-elevated 3/4 direction rather than straight down one axis — a static front/top/side view
 * is a worse starting point for an *orbital* camera than a view that already shows some depth.
 */
export function computeFitCamera(boundingBox: Box3, options: ComputeFitCameraOptions = {}): FitCamera {
  const fov = options.fov ?? DEFAULT_FOV_DEGREES;
  const aspect = options.aspect ?? DEFAULT_ASPECT;
  const padding = options.padding ?? DEFAULT_PADDING;

  const sphere = new Sphere();
  if (boundingBox.isEmpty()) {
    sphere.center.set(0, 0, 0);
    sphere.radius = MIN_RADIUS;
  } else {
    boundingBox.getBoundingSphere(sphere);
    if (!Number.isFinite(sphere.radius) || sphere.radius <= 0) {
      sphere.radius = MIN_RADIUS;
    }
  }
  const radius = Math.max(sphere.radius, MIN_RADIUS);
  const center = sphere.center.clone();

  const verticalFovRad = (fov * Math.PI) / 180;
  const horizontalFovRad = 2 * Math.atan(Math.tan(verticalFovRad / 2) * aspect);

  // Distance required to fit the sphere within each axis of the frustum; the binding constraint is
  // whichever axis is narrower (smaller fov), so the larger of the two distances is the one that
  // actually fits both.
  const verticalDistance = radius / Math.sin(verticalFovRad / 2);
  const horizontalDistance = radius / Math.sin(horizontalFovRad / 2);
  const distance = padding * Math.max(verticalDistance, horizontalDistance);

  // A fixed elevated 3/4 direction (slightly above, mostly to one side+back) rather than a
  // straight-on axis view — gives the user something with visible depth to orbit around
  // immediately, rather than a flat silhouette.
  const direction = new Vector3(1, 0.5, 1).normalize();
  const position = center.clone().addScaledVector(direction, distance);

  const near = Math.max(distance - radius * CLIP_PLANE_RADIUS_MULTIPLE, radius * 0.01, 0.01);
  const far = distance + radius * CLIP_PLANE_RADIUS_MULTIPLE;

  return { position, target: center, near, far };
}

/**
 * Combines the world-space bounding boxes of every given object into one box. Used to fit the
 * camera to everything currently loaded into the scene (see scene.tsx), not just one package.
 *
 * `Box3.setFromObject` updates each object's own world matrix as needed internally, so this is
 * safe to call on objects that have not yet been attached to a mounted R3F scene graph.
 */
export function computeCombinedBoundingBox(objects: readonly Object3D[]): Box3 {
  const combined = new Box3();
  for (const object of objects) {
    const box = new Box3().setFromObject(object);
    if (!box.isEmpty()) {
      combined.union(box);
    }
  }
  return combined;
}

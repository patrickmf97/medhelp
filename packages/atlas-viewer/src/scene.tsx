import { OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useRef } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

import { computeCombinedBoundingBox, computeFitCamera } from './interaction/camera';
import type { LoadedAtlasPackage } from './types';

export type AtlasSceneProps = {
  loaded: LoadedAtlasPackage[];
};

/** Reasonable, non-physically-accurate intensities for a single ambient + single directional
 * light: enough to read anatomical surface shape without authoring a full lighting rig, which is
 * out of scope for the orbital-camera task. */
const AMBIENT_LIGHT_INTENSITY = 0.7;
const DIRECTIONAL_LIGHT_INTENSITY = 1.1;
const DIRECTIONAL_LIGHT_POSITION: [number, number, number] = [5, 10, 7];

/**
 * Fits the camera to whatever is currently loaded, exactly once, the first time `loaded` goes
 * from empty to non-empty — then lets `<OrbitControls>` take over completely.
 *
 * Why only once: packages stream in progressively (see atlas-viewer.tsx), and re-fitting on every
 * incremental package would recenter/rescale the view out from under a user who has already
 * started orbiting — jarring, and arguably worse than a camera that doesn't perfectly frame every
 * last package. The first non-empty load already contains real geometry (not a placeholder), so it
 * is a reasonable one-time fit target; this intentionally does not wait for "the full set" to
 * arrive, since there is no stable definition of "enough" packages short of all of them, which can
 * take a while on a slow connection.
 */
function CameraRig({ loaded }: { loaded: LoadedAtlasPackage[] }) {
  const { camera, size } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const hasFitRef = useRef(false);

  useEffect(() => {
    if (hasFitRef.current || loaded.length === 0) return;

    const box = computeCombinedBoundingBox(loaded.map((pkg) => pkg.object));
    const aspect = size.height > 0 ? size.width / size.height : 1;
    const fit = computeFitCamera(box, { aspect });

    camera.position.copy(fit.position);
    camera.near = fit.near;
    camera.far = fit.far;
    camera.lookAt(fit.target);
    if ('updateProjectionMatrix' in camera) {
      (camera as { updateProjectionMatrix: () => void }).updateProjectionMatrix();
    }

    const controls = controlsRef.current;
    if (controls) {
      controls.target.copy(fit.target);
      controls.update();
    }

    hasFitRef.current = true;
  }, [loaded, camera, size]);

  return <OrbitControls enableDamping makeDefault ref={controlsRef} />;
}

/**
 * The React Three Fiber canvas shell. Renders whatever packages are currently loaded; the
 * loading/error state machine lives in atlas-viewer.tsx, not here, so this stays a thin,
 * easily-swappable rendering layer with no state of its own (beyond the one-time camera fit in
 * `CameraRig`, which is itself reset whenever `loaded` identity resets to empty — see
 * atlas-viewer.tsx's effect, which clears `loaded` on every new manifest).
 *
 * Wrapped in a Suspense boundary per the plan's "Suspense boundary for async loads". Nothing here
 * currently suspends — package loading is driven imperatively by AtlasAssetLoader so it can be
 * cancelled, which a thrown-promise/Suspense load cannot be — but the boundary is in place for any
 * future Suspense-based three.js helper added inside this scene.
 */
export function AtlasScene({ loaded }: AtlasSceneProps) {
  return (
    <Canvas>
      <ambientLight intensity={AMBIENT_LIGHT_INTENSITY} />
      <directionalLight intensity={DIRECTIONAL_LIGHT_INTENSITY} position={DIRECTIONAL_LIGHT_POSITION} />
      <CameraRig loaded={loaded} />
      <Suspense fallback={null}>
        {loaded.map((pkg) => (
          <primitive key={pkg.id} object={pkg.object} />
        ))}
      </Suspense>
    </Canvas>
  );
}

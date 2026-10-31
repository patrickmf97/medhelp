import { OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useRef } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

import { computeCombinedBoundingBox, computeFitCamera } from './interaction/camera';
import type { LoadedAtlasPackage } from './types';

export type AtlasSceneProps = {
  loaded: LoadedAtlasPackage[];
};

/**
 * Cheap three-point-ish lighting rig: a key light (the dominant, brighter directional light,
 * slightly warm), a fill light (dimmer, from the opposite side, slightly cool, so the side away
 * from the key light isn't pure black) and a soft ambient light (so no surface ever goes fully
 * unlit). All three are scene-wide lights — three.js computes them per-pixel in the fragment
 * shader, not per-mesh — so, unlike shadow maps, this costs the same whether the scene holds one
 * package or the real ~2,960-package atlas; it's a strict improvement over the single
 * ambient+directional rig this replaces, for free.
 *
 * Deliberately NOT physically accurate (no energy conservation, no exposure/tone-mapping
 * tuning) — just intensities picked to read anatomical surface shape clearly with the new
 * per-system base colors (see @medhelp/atlas-pipeline's system-palette.ts).
 */
const AMBIENT_LIGHT_INTENSITY = 0.45;
const KEY_LIGHT_INTENSITY = 1.3;
const KEY_LIGHT_COLOR = '#fff4e6'; // slightly warm, reads as the "sun"
const KEY_LIGHT_POSITION: [number, number, number] = [5, 10, 7];
const FILL_LIGHT_INTENSITY = 0.5;
const FILL_LIGHT_COLOR = '#cfe0ff'; // slightly cool, opposite side from the key light
const FILL_LIGHT_POSITION: [number, number, number] = [-6, 2, -5];

/**
 * Shadow choice, kept cheap on purpose (the "mais leve" / "tem que ser mais leve" constraint
 * applies here too): real per-mesh shadow mapping (`renderer.shadowMap` + `castShadow` on every
 * loaded primitive) is one more render pass over every shadow-casting triangle, which gets
 * expensive specifically at this app's real scale (thousands of individual package meshes, not a
 * handful of models) — turning it on was measured to visibly cost frame rate in this task's
 * browser verification. A single blurred ground-contact shadow (`<ContactShadows>`) would have
 * been the cheap middle ground the task description suggests, but it still renders its own
 * extra off-screen pass over the whole scene every frame; given the three-point rig above plus
 * the new per-system base colors already give a legible sense of form/depth without it, the
 * simplest and lightest choice is to skip dedicated shadow rendering entirely for now rather than
 * pay either cost.
 */

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
      <directionalLight intensity={KEY_LIGHT_INTENSITY} color={KEY_LIGHT_COLOR} position={KEY_LIGHT_POSITION} />
      <directionalLight intensity={FILL_LIGHT_INTENSITY} color={FILL_LIGHT_COLOR} position={FILL_LIGHT_POSITION} />
      <CameraRig loaded={loaded} />
      <Suspense fallback={null}>
        {loaded.map((pkg) => (
          <primitive key={pkg.id} object={pkg.object} />
        ))}
      </Suspense>
    </Canvas>
  );
}

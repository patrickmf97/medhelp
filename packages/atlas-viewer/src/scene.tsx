import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';

import type { LoadedAtlasPackage } from './types';

export type AtlasSceneProps = {
  loaded: LoadedAtlasPackage[];
};

/**
 * The React Three Fiber canvas shell. Renders whatever packages are currently loaded; the
 * loading/error state machine lives in atlas-viewer.tsx, not here, so this stays a thin,
 * easily-swappable rendering layer with no state of its own.
 *
 * Wrapped in a Suspense boundary per the plan's "Suspense boundary for async loads". Nothing here
 * currently suspends — package loading is driven imperatively by AtlasAssetLoader so it can be
 * cancelled, which a thrown-promise/Suspense load cannot be — but the boundary is in place for any
 * future Suspense-based three.js helper (e.g. camera/controls work in a later task) added inside
 * this scene.
 */
export function AtlasScene({ loaded }: AtlasSceneProps) {
  return (
    <Canvas>
      <Suspense fallback={null}>
        {loaded.map((pkg) => (
          <primitive key={pkg.id} object={pkg.object} />
        ))}
      </Suspense>
    </Canvas>
  );
}

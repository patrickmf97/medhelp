import type { AtlasManifestV1 } from '@medhelp/atlas-pipeline';
import type { Object3D } from 'three';

// Re-exported for convenience so consumers of this package don't also need to depend directly on
// @medhelp/atlas-contract just to type an <AtlasViewer> prop.
export type { AtlasManifestSource, AtlasViewerProps } from '@medhelp/atlas-contract';

/** One manifest package once its GLB has been fetched and parsed into a renderable scene graph. */
export type LoadedAtlasPackage = {
  id: string;
  object: Object3D;
};

/**
 * Lifecycle of the viewer's manifest resolution + progressive package loading, surfaced to the
 * host application as component state instead of thrown. See Global Constraint "Viewer failure
 * must not crash the surrounding MEDHELP application" in
 * docs/superpowers/plans/2026-09-22-medhelp-atlas.md.
 */
export type AtlasViewerState =
  | { status: 'loading-manifest' }
  | { status: 'loading-packages'; manifest: AtlasManifestV1; loaded: LoadedAtlasPackage[] }
  | { status: 'ready'; manifest: AtlasManifestV1; loaded: LoadedAtlasPackage[] }
  | { status: 'error'; error: Error };

// Public entry point for `@medhelp/atlas-pipeline` (see package.json's "exports" field, which
// already pointed here before this file existed). Re-exports only the manifest types that other
// packages need to consume a published release — the pipeline's CLIs and internal build steps are
// run directly via tsx and are not part of this public surface.
export type { AtlasManifestV1, ManifestPackage, ManifestStructure } from './package/manifest';

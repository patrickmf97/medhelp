'use client';

import { AtlasViewer } from '@medhelp/atlas-viewer';

/**
 * Provisional asset location: a flat manifest + one GLB per individual anatomical structure,
 * published as a plain Next.js public asset under `apps/web/public/atlas/`. There is no CDN/R2
 * publish step yet (pipeline Task 6, not built) — see this route's PR description for why this is
 * a deliberate, temporary tradeoff, not the final production asset architecture.
 */
const ATLAS_MANIFEST_URL = '/atlas/manifest.json';

/**
 * Client wrapper around the real `@medhelp/atlas-viewer` package (camera, lighting, progressive
 * loading all live there — see packages/atlas-viewer/src). Kept as its own small client component,
 * matching this app's existing convention of a 'use client' leaf component imported from a server
 * page (see components/public/content-explorer.tsx), so the route's page.tsx itself can stay a
 * server component for metadata/layout.
 */
export function AtlasRealViewer() {
  return (
    <div aria-label="Visualizador 3D do Atlas MEDHELP" className="atlas-viewer-shell">
      <AtlasViewer manifestSource={{ kind: 'url', url: ATLAS_MANIFEST_URL }} />
    </div>
  );
}

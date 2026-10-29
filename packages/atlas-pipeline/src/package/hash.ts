import { createHash } from 'node:crypto';

/** Deterministic sha256 hex digest of one buffer. Used as the atomic building block for every
 * other content hash in this module, and directly for per-asset/per-file integrity checks. */
export function sha256Hex(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Deterministic content hash for an ordered list of assets (a package's contents, or a whole
 * release's packages) — used both for the manifest's integrity hashes and to detect unchanged
 * content across rebuilds (group-assets.ts / manifest.ts callers can skip re-publishing a
 * package whose hash hasn't moved since the last build).
 *
 * Hashes each asset's own byte hash *and* its name, in whatever order the caller supplies, so the
 * result changes if: any asset's bytes change, any asset's name changes (a rename is a real
 * content change even with identical bytes, e.g. a corrected objectName), an asset is added or
 * removed, or the order changes (order encodes identity when object names could collide across
 * unrelated groups). Callers that want a hash independent of input order must sort their list
 * before calling this (see group-assets.ts, which already sorts for deterministic packing).
 */
export function hashAssets(assets: ReadonlyArray<{ objectName: string; buffer: Uint8Array }>): string {
  const hash = createHash('sha256');
  for (const asset of assets) {
    hash.update(asset.objectName);
    hash.update('\u0000');
    hash.update(sha256Hex(asset.buffer));
    hash.update('\u0000');
  }
  return hash.digest('hex');
}

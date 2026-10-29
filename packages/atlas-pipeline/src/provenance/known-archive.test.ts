import { existsSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { Z_ANATOMY_DESCRIPTOR } from './known-archive';
import { validateSource } from './validate-source';

describe('Z_ANATOMY_DESCRIPTOR against the real local archive', () => {
  const archivePath = Z_ANATOMY_DESCRIPTOR.archivePath;
  const archivePresent = typeof archivePath === 'string' && existsSync(archivePath);

  it.skipIf(!archivePresent)(
    'validates ok against whatever archive actually sits at the configured local path',
    () => {
      const result = validateSource(Z_ANATOMY_DESCRIPTOR);

      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.computedSha256).toBe(Z_ANATOMY_DESCRIPTOR.sha256);
    },
  );

  it('rejects a tampered copy of the descriptor (wrong hash) regardless of machine', () => {
    if (!archivePresent) return;

    const result = validateSource({ ...Z_ANATOMY_DESCRIPTOR, sha256: 'f'.repeat(64) });

    expect(result.ok).toBe(false);
  });
});

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import type { ArchiveDescriptor, SourceValidation } from './types';

/**
 * Strictly validates a configured archive against its recorded provenance:
 *  - the archive path must be configured and readable
 *  - the expected sha256 must be configured
 *  - the sha256 actually computed from the file on disk must match the recorded one
 *
 * This never reads or trusts anything about the archive other than its bytes; a renamed or
 * re-exported file with the same path but different contents is rejected, not silently accepted.
 */
export function validateSource(descriptor: ArchiveDescriptor): SourceValidation {
  const errors: string[] = [];

  const path = descriptor.archivePath;
  if (!path || path.trim() === '') {
    errors.push('Archive path is not configured.');
  }

  const expectedSha256 = descriptor.sha256?.trim() ?? '';
  if (expectedSha256 === '') {
    errors.push('Expected sha256 is not configured.');
  }

  if (!path || path.trim() === '') {
    return { ok: false, errors, computedSha256: null };
  }

  let computedSha256: string | null = null;
  try {
    const bytes = readFileSync(path);
    computedSha256 = createHash('sha256').update(bytes).digest('hex');
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    errors.push(`Archive at "${path}" could not be read: ${reason}`);
    return { ok: false, errors, computedSha256: null };
  }

  if (expectedSha256 !== '' && computedSha256 !== expectedSha256) {
    errors.push('Archive sha256 mismatch: expected recorded hash but computed a different digest.');
  }

  return { ok: errors.length === 0, errors, computedSha256 };
}

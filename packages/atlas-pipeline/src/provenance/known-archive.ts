import { homedir } from 'node:os';
import { join } from 'node:path';

import type { ArchiveDescriptor } from './types';

/**
 * The real Z-Anatomy archive lives outside the repository (see docs/atlas/provenance.md) and is
 * never committed. This descriptor records the provenance we trust and is kept in lockstep with
 * that document: if the archive is ever re-downloaded, both this hash and the doc must be
 * updated together, deliberately, not silently.
 */
export const Z_ANATOMY_DESCRIPTOR: ArchiveDescriptor = {
  name: 'Z-Anatomy',
  version: 'Models-of-human-anatomy (downloaded 2026-10-28)',
  license: 'CC BY-SA 4.0',
  sourceUrl: 'https://github.com/Z-Anatomy/Models-of-human-anatomy',
  sha256: 'e029688545627bd0214b269e1063143abb580aad72b2c2445d6d8a9a0d9da736',
  archivePath: process.env.ATLAS_SOURCE_ARCHIVE ?? join(homedir(), 'medhelp-atlas-source', 'Z-Anatomy.zip'),
};

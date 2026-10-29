import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { ArchiveDescriptor } from './types';
import { validateSource } from './validate-source';

describe('validateSource', () => {
  let dir: string;
  let archivePath: string;
  let correctSha256: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'atlas-source-'));
    archivePath = join(dir, 'archive.zip');
    writeFileSync(archivePath, 'fixture archive bytes for hashing\n');
    correctSha256 = createHash('sha256').update(readFileSync(archivePath)).digest('hex');
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const baseDescriptor = (): ArchiveDescriptor => ({
    name: 'Z-Anatomy',
    version: 'Models-of-human-anatomy',
    license: 'CC BY-SA 4.0',
    sourceUrl: 'https://github.com/Z-Anatomy/Models-of-human-anatomy',
    sha256: '',
    archivePath: '',
  });

  it('accepts a descriptor whose archive hash matches', () => {
    const descriptor: ArchiveDescriptor = { ...baseDescriptor(), archivePath, sha256: correctSha256 };

    const result = validateSource(descriptor);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.computedSha256).toBe(correctSha256);
  });

  it('rejects a descriptor whose configured hash does not match the archive', () => {
    const descriptor: ArchiveDescriptor = {
      ...baseDescriptor(),
      archivePath,
      sha256: '0000000000000000000000000000000000000000000000000000000000bad',
    };

    const result = validateSource(descriptor);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      'Archive sha256 mismatch: expected recorded hash but computed a different digest.',
    );
  });

  it('rejects when archivePath is missing (null)', () => {
    const descriptor: ArchiveDescriptor = { ...baseDescriptor(), archivePath: null, sha256: correctSha256 };

    const result = validateSource(descriptor);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Archive path is not configured.');
    expect(result.computedSha256).toBeNull();
  });

  it('rejects when archivePath is unset (empty string)', () => {
    const descriptor: ArchiveDescriptor = { ...baseDescriptor(), archivePath: '', sha256: correctSha256 };

    const result = validateSource(descriptor);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Archive path is not configured.');
  });

  it('rejects when the archive file does not exist on disk', () => {
    const descriptor: ArchiveDescriptor = {
      ...baseDescriptor(),
      archivePath: join(dir, 'does-not-exist.zip'),
      sha256: correctSha256,
    };

    const result = validateSource(descriptor);

    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes('could not be read'))).toBe(true);
  });

  it('rejects when sha256 is unset', () => {
    const descriptor: ArchiveDescriptor = { ...baseDescriptor(), archivePath, sha256: '' };

    const result = validateSource(descriptor);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Expected sha256 is not configured.');
  });

  it('reports every validation problem at once when both path and hash are unset', () => {
    const descriptor: ArchiveDescriptor = { ...baseDescriptor(), archivePath: null, sha256: '' };

    const result = validateSource(descriptor);

    expect(result.errors).toHaveLength(2);
  });
});

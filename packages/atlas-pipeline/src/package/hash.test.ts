import { describe, expect, it } from 'vitest';

import { hashAssets, sha256Hex } from './hash';

describe('sha256Hex', () => {
  it('is deterministic for the same bytes', () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    expect(sha256Hex(bytes)).toBe(sha256Hex(new Uint8Array([1, 2, 3, 4])));
  });

  it('changes when a single byte changes', () => {
    const a = sha256Hex(new Uint8Array([1, 2, 3, 4]));
    const b = sha256Hex(new Uint8Array([1, 2, 3, 5]));
    expect(a).not.toBe(b);
  });

  it('returns a 64-character lowercase hex digest', () => {
    const digest = sha256Hex(new Uint8Array([9, 9, 9]));
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('hashAssets', () => {
  const asset = (objectName: string, bytes: number[]) => ({ objectName, buffer: new Uint8Array(bytes) });

  it('is deterministic for the same ordered input', () => {
    const assets = [asset('a', [1, 2, 3]), asset('b', [4, 5, 6])];
    expect(hashAssets(assets)).toBe(hashAssets(assets));
  });

  it('changes when a buffer changes but the name does not', () => {
    const before = hashAssets([asset('a', [1, 2, 3])]);
    const after = hashAssets([asset('a', [1, 2, 9])]);
    expect(before).not.toBe(after);
  });

  it('changes when the asset order changes', () => {
    const forward = hashAssets([asset('a', [1]), asset('b', [2])]);
    const backward = hashAssets([asset('b', [2]), asset('a', [1])]);
    expect(forward).not.toBe(backward);
  });

  it('changes when an object name changes but bytes do not', () => {
    const before = hashAssets([asset('a', [1, 2, 3])]);
    const after = hashAssets([asset('a-renamed', [1, 2, 3])]);
    expect(before).not.toBe(after);
  });

  it('is empty-input safe', () => {
    expect(hashAssets([])).toMatch(/^[0-9a-f]{64}$/);
  });
});

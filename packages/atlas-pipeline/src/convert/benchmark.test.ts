import { describe, expect, it } from 'vitest';

import { boundsClose, pickRepresentativeMeshes } from './benchmark';
import type { MeshCandidate } from './benchmark';

describe('boundsClose', () => {
  it('is true for identical bounds', () => {
    expect(boundsClose({ min: [0, 0, 0], max: [1, 1, 1] }, { min: [0, 0, 0], max: [1, 1, 1] }, 1e-3)).toBe(true);
  });

  it('is true for bounds within tolerance', () => {
    expect(boundsClose({ min: [0, 0, 0], max: [1, 1, 1] }, { min: [0.0001, 0, 0], max: [1, 1, 1.0005] }, 1e-3)).toBe(
      true,
    );
  });

  it('is false for bounds outside tolerance', () => {
    expect(boundsClose({ min: [0, 0, 0], max: [1, 1, 1] }, { min: [0, 0, 0], max: [1, 1, 1.1] }, 1e-3)).toBe(false);
  });

  it('is true only when both are null', () => {
    expect(boundsClose(null, null, 1e-3)).toBe(true);
    expect(boundsClose(null, { min: [0, 0, 0], max: [1, 1, 1] }, 1e-3)).toBe(false);
    expect(boundsClose({ min: [0, 0, 0], max: [1, 1, 1] }, null, 1e-3)).toBe(false);
  });
});

describe('pickRepresentativeMeshes', () => {
  const candidate = (objectName: string, vertexCount: number): MeshCandidate => ({
    objectName,
    objFilePath: `/fake/${objectName}.obj`,
    vertexCount,
  });

  it('picks the smallest, a middle, and the largest usable (>=10 vertex) candidate', () => {
    const picks = pickRepresentativeMeshes([
      candidate('tiny', 1),
      candidate('small', 40),
      candidate('medium', 300),
      candidate('large', 4096),
      candidate('also-tiny', 2),
    ]);

    expect(picks).not.toBeNull();
    expect(picks!.small.objectName).toBe('small');
    expect(picks!.medium.objectName).toBe('medium');
    expect(picks!.large.objectName).toBe('large');
  });

  it('returns null when fewer than 3 candidates have at least 10 vertices', () => {
    const picks = pickRepresentativeMeshes([candidate('tiny', 1), candidate('small', 40)]);
    expect(picks).toBeNull();
  });
});

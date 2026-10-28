import { describe, expect, it } from 'vitest';

import { buildExportReport } from './report';
import type { MeshInput } from './types';

function input(objectName: string, vertices: MeshInput['vertices'], structureId: string | null = 'za:x'): MeshInput {
  return { objectName, structureId, vertices };
}

describe('buildExportReport', () => {
  it('accepts a mesh with finite vertices and computes its bounds', () => {
    const report = buildExportReport(
      [
        input('Triangle', [
          [0, 0, 0],
          [1, 0, 0],
          [0, 1, 0],
        ]),
      ],
      { excludedObjectNames: new Set(), unmappedStructureIds: new Set() },
    );

    expect(report.accepted).toHaveLength(1);
    expect(report.accepted[0]).toEqual({
      objectName: 'Triangle',
      structureId: 'za:x',
      status: 'accepted',
      vertexCount: 3,
      bounds: { min: [0, 0, 0], max: [1, 1, 0] },
      rejectReason: null,
    });
    expect(report.totals).toEqual({ processed: 1, accepted: 1, rejected: 0, excludedForLicense: 0, unmapped: 0 });
  });

  it('rejects an empty mesh', () => {
    const report = buildExportReport([input('EmptyMesh', [])], {
      excludedObjectNames: new Set(),
      unmappedStructureIds: new Set(),
    });

    expect(report.rejected).toHaveLength(1);
    expect(report.rejected[0]!.rejectReason).toBe('empty_mesh');
    expect(report.rejected[0]!.bounds).toBeNull();
  });

  it('rejects a mesh containing a non-finite vertex', () => {
    const report = buildExportReport(
      [
        input('Degenerate', [
          [0, 0, 0],
          [1, Number.NaN, 0],
        ]),
      ],
      { excludedObjectNames: new Set(), unmappedStructureIds: new Set() },
    );

    expect(report.rejected).toHaveLength(1);
    expect(report.rejected[0]!.rejectReason).toBe('non_finite_vertex');
  });

  it('excludes a mesh whose object name is in the license exclusion set, without computing bounds', () => {
    const report = buildExportReport(
      [input('Kidney.l', [[0, 0, 0]], 'za:kidney')],
      { excludedObjectNames: new Set(['Kidney.l']), unmappedStructureIds: new Set() },
    );

    expect(report.excluded).toHaveLength(1);
    expect(report.excluded[0]!.status).toBe('excluded');
    expect(report.accepted).toHaveLength(0);
  });

  it('tracks objects whose structure had no TA2 match as unmapped, without blocking export', () => {
    const report = buildExportReport([input('Mystery.mesh', [[0, 0, 0]], 'za:mystery')], {
      excludedObjectNames: new Set(),
      unmappedStructureIds: new Set(['za:mystery']),
    });

    expect(report.unmapped).toEqual(['Mystery.mesh']);
    expect(report.accepted).toHaveLength(1);
    expect(report.totals.unmapped).toBe(1);
  });

  it('orders every bucket deterministically by object name regardless of input order', () => {
    const inputs: MeshInput[] = [
      input('Zebra', [[0, 0, 0]]),
      input('Apple', [[0, 0, 0]]),
      input('Mango', [[0, 0, 0]]),
    ];

    const a = buildExportReport(inputs, { excludedObjectNames: new Set(), unmappedStructureIds: new Set() });
    const b = buildExportReport([...inputs].reverse(), {
      excludedObjectNames: new Set(),
      unmappedStructureIds: new Set(),
    });

    expect(a.accepted.map((r) => r.objectName)).toEqual(['Apple', 'Mango', 'Zebra']);
    expect(a).toEqual(b);
  });

  it('reports consistent totals across a mixed batch', () => {
    const report = buildExportReport(
      [
        input('Good', [[0, 0, 0]]),
        input('Empty', []),
        input('Bad', [[Number.NaN, 0, 0]]),
        input('Excluded.l', [[0, 0, 0]]),
      ],
      { excludedObjectNames: new Set(['Excluded.l']), unmappedStructureIds: new Set() },
    );

    expect(report.totals).toEqual({ processed: 4, accepted: 1, rejected: 2, excludedForLicense: 1, unmapped: 0 });
  });
});

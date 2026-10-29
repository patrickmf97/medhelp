import { computeBounds } from './bounds';
import type { ExportReport, MeshInput, MeshRecord, Vec3 } from './types';

export type BuildExportReportOptions = {
  /** Object names belonging to an NC-licensed (excluded) structure — skipped, never exported. */
  excludedObjectNames: Set<string>;
  /** Structure ids that had no TA2.csv match, used to flag (not block) their member objects. */
  unmappedStructureIds: Set<string>;
};

function isFiniteVec3(v: Vec3): boolean {
  return Number.isFinite(v[0]) && Number.isFinite(v[1]) && Number.isFinite(v[2]);
}

function classify(input: MeshInput, options: BuildExportReportOptions): MeshRecord {
  if (options.excludedObjectNames.has(input.objectName)) {
    return {
      objectName: input.objectName,
      structureId: input.structureId,
      status: 'excluded',
      vertexCount: input.vertices.length,
      bounds: null,
      rejectReason: null,
    };
  }

  if (input.vertices.length === 0) {
    return {
      objectName: input.objectName,
      structureId: input.structureId,
      status: 'rejected',
      vertexCount: 0,
      bounds: null,
      rejectReason: 'empty_mesh',
    };
  }

  if (!input.vertices.every(isFiniteVec3)) {
    return {
      objectName: input.objectName,
      structureId: input.structureId,
      status: 'rejected',
      vertexCount: input.vertices.length,
      bounds: null,
      rejectReason: 'non_finite_vertex',
    };
  }

  return {
    objectName: input.objectName,
    structureId: input.structureId,
    status: 'accepted',
    vertexCount: input.vertices.length,
    bounds: computeBounds(input.vertices),
    rejectReason: null,
  };
}

/**
 * Builds a deterministic export report: every bucket is sorted by object name, independent of
 * the order meshes were discovered in (Blender's bpy.data.objects order is not guaranteed
 * stable across reruns). License-excluded objects are never exported and never given bounds, to
 * avoid any temptation to ship their geometry. "unmapped" is informational, not blocking: it
 * flags objects whose containing structure had no TA2.csv match, independent of whether the
 * geometry itself was accepted or rejected.
 */
export function buildExportReport(inputs: MeshInput[], options: BuildExportReportOptions): ExportReport {
  const sorted = [...inputs].sort((a, b) => a.objectName.localeCompare(b.objectName));

  const accepted: MeshRecord[] = [];
  const rejected: MeshRecord[] = [];
  const excluded: MeshRecord[] = [];
  const unmapped: string[] = [];

  for (const input of sorted) {
    const record = classify(input, options);
    if (record.status === 'accepted') accepted.push(record);
    else if (record.status === 'rejected') rejected.push(record);
    else excluded.push(record);

    if (input.structureId !== null && options.unmappedStructureIds.has(input.structureId)) {
      unmapped.push(input.objectName);
    }
  }

  return {
    schemaVersion: 1,
    totals: {
      processed: sorted.length,
      accepted: accepted.length,
      rejected: rejected.length,
      excludedForLicense: excluded.length,
      unmapped: unmapped.length,
    },
    accepted,
    rejected,
    excluded,
    unmapped,
  };
}

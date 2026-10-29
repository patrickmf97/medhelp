export type Vec3 = [number, number, number];

export type Bounds = { min: Vec3; max: Vec3 };

/** A triangle: three 0-based indices into a vertex (and, for ParsedMesh, normal) list. */
export type Face = [number, number, number];

/**
 * A full renderable mesh parsed from a v2 OBJ export: vertex positions, per-vertex normals (same
 * order/count as vertices — "vn" lines reference the same index as their "v" counterpart via the
 * OBJ file's "a//a" face syntax), and triangulated faces. Unlike the vertex-only MeshInput used
 * by Tasks 1-3, this carries everything convertMesh() needs to build a renderable GLB rather than
 * a point cloud.
 */
export type ParsedMesh = {
  vertices: Vec3[];
  normals: Vec3[];
  faces: Face[];
};

export type MeshInput = {
  objectName: string;
  structureId: string | null;
  vertices: Vec3[];
};

export type MeshRecordStatus = 'accepted' | 'rejected' | 'excluded';

export type MeshRecord = {
  objectName: string;
  structureId: string | null;
  status: MeshRecordStatus;
  vertexCount: number;
  bounds: Bounds | null;
  rejectReason: string | null;
};

export type ExportReport = {
  schemaVersion: 1;
  totals: {
    processed: number;
    accepted: number;
    rejected: number;
    excludedForLicense: number;
    unmapped: number;
  };
  accepted: MeshRecord[];
  rejected: MeshRecord[];
  excluded: MeshRecord[];
  unmapped: string[];
};

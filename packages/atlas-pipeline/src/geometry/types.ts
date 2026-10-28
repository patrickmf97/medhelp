export type Vec3 = [number, number, number];

export type Bounds = { min: Vec3; max: Vec3 };

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

export type Ta2Row = {
  ta2Id: string;
  english: string;
  latin: string;
  portuguese: string;
};

export type SceneCollection = {
  name: string;
  children: string[];
  objectNames: string[];
};

export type SceneDump = {
  sceneRootChildren: string[];
  collections: Record<string, SceneCollection>;
};

export const LICENSE_TAGS = ['cc-by-sa-4.0', 'cc-by-nc-sa-4.0', 'cc-by-nc-4.0', 'cc-by-4.0'] as const;
export type LicenseTag = (typeof LICENSE_TAGS)[number];

export const DEFAULT_LICENSE: LicenseTag = 'cc-by-sa-4.0';

export type LicenseClassification = {
  license: LicenseTag;
  excluded: boolean;
  reason: string | null;
};

export type AnatomyStructureRecord = {
  id: string;
  name: string;
  path: string[];
  parentId: string | null;
  depth: number;
  ta2Id: string | null;
  englishName: string | null;
  latinName: string | null;
  portugueseName: string | null;
  license: LicenseTag;
  excluded: boolean;
  excludedReason: string | null;
  objectNames: string[];
};

export type CatalogBuildResult = {
  structures: AnatomyStructureRecord[];
  unmappedToTa2: string[];
  duplicateEnglishNamesInTa2: string[];
  cycles: string[][];
};

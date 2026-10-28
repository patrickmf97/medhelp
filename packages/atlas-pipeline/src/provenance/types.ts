export type ArchiveDescriptor = {
  name: string;
  version: string;
  license: string;
  sourceUrl: string;
  sha256: string;
  archivePath: string | null | undefined;
};

export type SourceValidation = {
  ok: boolean;
  errors: string[];
  computedSha256: string | null;
};

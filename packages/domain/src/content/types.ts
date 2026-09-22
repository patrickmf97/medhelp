export const CONTENT_STATUSES = [
  'draft',
  'review',
  'published',
  'archived',
] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const ACCESS_LEVELS = ['free', 'premium'] as const;

export type AccessLevel = (typeof ACCESS_LEVELS)[number];

export interface CatalogEntity {
  id: string;
  title: string;
  slug: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Cycle extends CatalogEntity {
  description: string | null;
}

export interface Discipline extends CatalogEntity {
  cycleId: string;
  description: string | null;
}

export interface Module extends CatalogEntity {
  disciplineId: string;
  description: string | null;
}

export interface Lesson extends CatalogEntity {
  moduleId: string;
  summary: string | null;
  status: ContentStatus;
  accessLevel: AccessLevel;
  scheduledFor: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdBy: string;
  updatedBy: string;
}

export interface HierarchyIntegrityInput {
  cycleId: string;
  disciplineCycleId: string;
  disciplineId: string;
  moduleDisciplineId: string;
  moduleId: string;
  lessonModuleId: string;
}

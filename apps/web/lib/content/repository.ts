import {
  transitionContent,
  type AccessLevel,
  type ContentStatus,
  type Lesson,
} from '@medhelp/domain';
import { requireRole } from '@/lib/auth/require-role';

interface LessonRecord {
  id: string;
  module_id: string;
  title: string;
  slug: string;
  summary: string | null;
  status: ContentStatus;
  access_level: AccessLevel;
  position: number;
  scheduled_for: string | null;
  published_at: string | null;
  archived_at: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EditorialLesson extends LessonRecord {
  modules: {
    title: string;
    disciplines: { title: string; cycles: { title: string } | null } | null;
  } | null;
}

export interface CatalogOption {
  id: string;
  title: string;
  disciplines: { title: string; cycles: { title: string } | null } | null;
}

export interface LessonInput {
  moduleId: string;
  title: string;
  slug: string;
  summary: string | null;
  accessLevel: AccessLevel;
  position: number;
  scheduledFor: string | null;
}

function mapLesson(record: LessonRecord): Lesson {
  return {
    id: record.id,
    moduleId: record.module_id,
    title: record.title,
    slug: record.slug,
    summary: record.summary,
    status: record.status,
    accessLevel: record.access_level,
    position: record.position,
    scheduledFor: record.scheduled_for,
    publishedAt: record.published_at,
    archivedAt: record.archived_at,
    createdBy: record.created_by,
    updatedBy: record.updated_by,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    deletedAt: record.deleted_at,
  };
}

export function assertAuthorizedActor(sessionActorId: string, suppliedActorId: string): void {
  if (sessionActorId !== suppliedActorId) {
    throw new Error('Unauthorized content mutation');
  }
}

export function publicationTimestamp(scheduledFor: string | null, now = new Date()): string {
  if (scheduledFor) {
    const scheduledDate = new Date(scheduledFor);
    if (!Number.isNaN(scheduledDate.getTime()) && scheduledDate > now) return scheduledDate.toISOString();
  }
  return now.toISOString();
}

export async function listEditorialLessons(): Promise<EditorialLesson[]> {
  const { supabase } = await requireRole(['editor', 'admin'], '/editor/conteudos');
  const { data, error } = await supabase
    .from('lessons')
    .select('*, modules(title, disciplines(title, cycles(title)))')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) throw new Error('Não foi possível carregar o catálogo editorial.');
  return (data ?? []) as unknown as EditorialLesson[];
}

export async function listCatalogOptions(): Promise<CatalogOption[]> {
  const { supabase } = await requireRole(['editor', 'admin'], '/editor/conteudos');
  const { data, error } = await supabase
    .from('modules')
    .select('id, title, disciplines(title, cycles(title))')
    .is('deleted_at', null)
    .order('position');

  if (error) throw new Error('Não foi possível carregar os módulos.');
  return (data ?? []) as unknown as CatalogOption[];
}

export async function getEditorialLesson(id: string): Promise<EditorialLesson | null> {
  const { supabase } = await requireRole(['editor', 'admin'], `/editor/conteudos/${id}`);
  const { data, error } = await supabase
    .from('lessons')
    .select('*, modules(title, disciplines(title, cycles(title)))')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error('Não foi possível carregar a aula.');
  return data as unknown as EditorialLesson | null;
}

export async function createLesson(input: LessonInput): Promise<Lesson> {
  const { supabase, user } = await requireRole(['editor', 'admin'], '/editor/conteudos/novo');
  const { data, error } = await supabase
    .from('lessons')
    .insert({
      module_id: input.moduleId,
      title: input.title,
      slug: input.slug,
      summary: input.summary,
      access_level: input.accessLevel,
      position: input.position,
      scheduled_for: input.scheduledFor,
      created_by: user.id,
      updated_by: user.id,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error('Não foi possível criar a aula.');
  return mapLesson(data as unknown as LessonRecord);
}

export async function updateLesson(id: string, input: LessonInput): Promise<Lesson> {
  const { supabase, user } = await requireRole(['editor', 'admin'], `/editor/conteudos/${id}`);
  const { data, error } = await supabase
    .from('lessons')
    .update({
      module_id: input.moduleId,
      title: input.title,
      slug: input.slug,
      summary: input.summary,
      access_level: input.accessLevel,
      position: input.position,
      scheduled_for: input.scheduledFor,
      updated_by: user.id,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) throw new Error('Não foi possível atualizar a aula.');
  return mapLesson(data as unknown as LessonRecord);
}

export async function transitionLesson(id: string, target: ContentStatus): Promise<Lesson> {
  const { supabase, user } = await requireRole(['editor', 'admin'], `/editor/conteudos/${id}`);
  const { data: current, error: readError } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (readError || !current) throw new Error('Aula não encontrada.');
  transitionContent((current as unknown as LessonRecord).status, target);

  const patch: Record<string, string | null> = { status: target, updated_by: user.id };
  if (target === 'published') {
    patch.published_at = publicationTimestamp((current as unknown as LessonRecord).scheduled_for);
  }

  const { data, error } = await supabase
    .from('lessons')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) throw new Error('Não foi possível alterar o status da aula.');
  return mapLesson(data as unknown as LessonRecord);
}

export async function publishLesson(id: string, actorId: string): Promise<Lesson> {
  const { user } = await requireRole(['editor', 'admin'], `/editor/conteudos/${id}`);
  assertAuthorizedActor(user.id, actorId);
  return transitionLesson(id, 'published');
}

export async function archiveLesson(id: string): Promise<void> {
  const { supabase, user } = await requireRole(['editor', 'admin'], `/editor/conteudos/${id}`);
  const { error } = await supabase
    .from('lessons')
    .update({ deleted_at: new Date().toISOString(), updated_by: user.id })
    .eq('id', id);

  if (error) throw new Error('Não foi possível arquivar a aula.');
}

import type { PublicCatalogItem } from '@/lib/content/public-catalog';
import { listPublicCatalog, mapPublicCatalogRows } from '@/lib/content/public-catalog';
import { requireUser } from '@/lib/auth/require-role';
import {
  buildStudentDashboard, canStudyLesson, hasPremiumEntitlement,
  type AccessGrant, type LessonProgressInput, type StoredProgress,
} from './progress-service';

type StudentClient = Awaited<ReturnType<typeof requireUser>>['supabase'];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertLessonId(id: string) {
  if (!uuidPattern.test(id)) throw new Error('Aula inválida.');
}

async function getAccess(supabase: StudentClient, userId: string) {
  const [{ data: subscription, error: subscriptionError }, { data: grants, error: grantsError }] = await Promise.all([
    supabase.from('subscriptions').select('state,access_until').eq('user_id', userId).maybeSingle(),
    supabase.from('access_grants').select('starts_at,ends_at,revoked_at').eq('user_id', userId),
  ]);
  if (subscriptionError || grantsError) throw new Error('Não foi possível verificar seu acesso.');
  const state = subscription?.state ?? 'pending';
  const accessUntil = subscription?.access_until ?? null;
  return {
    premiumAccess: hasPremiumEntitlement({ state, accessUntil }, (grants ?? []) as AccessGrant[]),
    subscriptionState: state,
    accessUntil,
  };
}

export async function saveLessonProgress(input: LessonProgressInput): Promise<void> {
  if (!uuidPattern.test(input.lessonId) || !Number.isSafeInteger(input.seconds) || input.seconds < 0 || input.seconds > 86_400 || typeof input.complete !== 'boolean') {
    throw new Error('Progresso inválido.');
  }
  const { supabase, user } = await requireUser(`/aluno/disciplinas/${input.lessonId}`);
  const { data: lesson, error: lessonError } = await supabase.from('lessons')
    .select('id,access_level').eq('id', input.lessonId).eq('status', 'published')
    .lte('published_at', new Date().toISOString()).is('deleted_at', null).maybeSingle();
  if (lessonError || !lesson) throw new Error('Aula indisponível.');
  if (lesson.access_level === 'premium') {
    const access = await getAccess(supabase, user.id);
    if (!access.premiumAccess) throw new Error('Assinatura necessária para esta aula.');
  }
  const { error } = await supabase.from('lesson_progress').upsert({
    user_id: user.id,
    lesson_id: input.lessonId,
    seconds: input.seconds,
    completed_at: input.complete ? new Date().toISOString() : null,
  }, { onConflict: 'user_id,lesson_id' });
  if (error) throw new Error('Não foi possível salvar o progresso.');
}

export async function getStudentDashboard(userId: string) {
  const { supabase, user } = await requireUser('/aluno');
  if (user.id !== userId) throw new Error('Acesso negado.');
  const [profileResult, progressResult, favoritesResult, streakResult, catalog, access] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
    supabase.from('lesson_progress').select('lesson_id,seconds,completed_at,last_studied_at').eq('user_id', userId).order('last_studied_at', { ascending: false }),
    supabase.from('favorites').select('lesson_id').eq('user_id', userId),
    supabase.from('study_streaks').select('current_count').eq('user_id', userId).maybeSingle(),
    listPublicCatalog(),
    getAccess(supabase, userId),
  ]);
  if (profileResult.error || progressResult.error || favoritesResult.error || streakResult.error) {
    throw new Error('Não foi possível carregar sua jornada.');
  }
  return buildStudentDashboard({
    name: profileResult.data?.full_name ?? 'Estudante',
    premiumAccess: access.premiumAccess,
    subscriptionState: access.subscriptionState,
    accessUntil: access.accessUntil,
    lessons: catalog.map(({ id, title, cycle, discipline, accessLevel }) => ({ id, title, cycle, discipline, accessLevel })),
    progress: (progressResult.data ?? []) as StoredProgress[],
    favoriteIds: (favoritesResult.data ?? []).map((item) => item.lesson_id),
    streak: streakResult.data?.current_count ?? 0,
  });
}

export type LessonBlock = { id: string; type: 'heading' | 'rich_text' | 'callout' | 'image' | 'video'; text: string; src: string | null };

function mapLessonBlocks(rows: unknown[]): LessonBlock[] {
  return rows.flatMap((value) => {
    if (!value || typeof value !== 'object') return [];
    const row = value as Record<string, unknown>;
    const content = row.content && typeof row.content === 'object' ? row.content as Record<string, unknown> : {};
    const type = row.block_type;
    const id = row.id;
    if (typeof id !== 'string' || (type !== 'heading' && type !== 'rich_text' && type !== 'callout' && type !== 'image' && type !== 'video')) return [];
    const text = typeof content.text === 'string' ? content.text : '';
    const url = typeof content.url === 'string' ? content.url : '';
    const src = /^https:\/\//i.test(url) ? url : null;
    if (!text && !src) return [];
    return [{ id, type, text, src }];
  });
}

export async function getStudentLesson(id: string): Promise<{
  lesson: PublicCatalogItem; blocks: LessonBlock[]; locked: boolean;
  progress: StoredProgress | null; favorite: boolean;
} | null> {
  assertLessonId(id);
  const { supabase, user } = await requireUser(`/aluno/disciplinas/${id}`);
  const { data, error } = await supabase.from('lessons')
    .select('id,title,slug,summary,access_level,modules!inner(title,disciplines!inner(title,cycles!inner(title,slug)))')
    .eq('id', id).eq('status', 'published').lte('published_at', new Date().toISOString())
    .is('deleted_at', null).maybeSingle();
  if (error) throw new Error('Não foi possível carregar a aula.');
  const lesson = mapPublicCatalogRows(data ? [data] : [])[0];
  if (!lesson) return null;
  const access = await getAccess(supabase, user.id);
  const locked = !canStudyLesson(lesson.accessLevel, access.premiumAccess);
  const [progressResult, favoriteResult, blocksResult] = await Promise.all([
    supabase.from('lesson_progress').select('lesson_id,seconds,completed_at,last_studied_at').eq('user_id', user.id).eq('lesson_id', id).maybeSingle(),
    supabase.from('favorites').select('lesson_id').eq('user_id', user.id).eq('lesson_id', id).maybeSingle(),
    locked ? Promise.resolve({ data: [], error: null }) : supabase.from('lesson_blocks').select('id,block_type,content,position')
      .eq('lesson_id', id).is('deleted_at', null).order('position'),
  ]);
  if (progressResult.error || favoriteResult.error || blocksResult.error) throw new Error('Não foi possível carregar seus dados de estudo.');
  return {
    lesson, locked, blocks: locked ? [] : mapLessonBlocks((blocksResult.data ?? []) as unknown[]),
    progress: progressResult.data as StoredProgress | null, favorite: Boolean(favoriteResult.data),
  };
}

export async function setFavorite(lessonId: string, favorite: boolean): Promise<void> {
  assertLessonId(lessonId);
  const { supabase, user } = await requireUser(`/aluno/disciplinas/${lessonId}`);
  const result = favorite
    ? await supabase.from('favorites').upsert({ user_id: user.id, lesson_id: lessonId }, { onConflict: 'user_id,lesson_id', ignoreDuplicates: true })
    : await supabase.from('favorites').delete().eq('user_id', user.id).eq('lesson_id', lessonId);
  if (result.error) throw new Error('Não foi possível atualizar seus favoritos.');
}

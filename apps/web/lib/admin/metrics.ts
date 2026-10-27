import { requireRole } from '@/lib/auth/require-role';

/**
 * Admin dashboard metrics (Task 13 / spec section 11 "Indicadores").
 *
 * Every number here comes from a real aggregate query against the Supabase schema
 * (see supabase/migrations/20261026120000_admin_metrics.sql) — nothing is mocked.
 *
 * Indicators from the spec that are intentionally NOT exposed here, because the schema
 * has no data to compute them from, are listed in `PENDING_METRICS` below. They must stay
 * out of this module until the underlying tables exist; do not fake a number for them.
 */

export type MetricsRangeDays = 7 | 30 | 90;

export const DEFAULT_METRICS_RANGE_DAYS: MetricsRangeDays = 30;

const VALID_RANGE_DAYS: readonly MetricsRangeDays[] = [7, 30, 90];

export interface PendingMetric {
  key: string;
  label: string;
  reason: string;
}

/**
 * Indicators listed in docs/superpowers/specs/2026-09-22-medhelp-design.md section 11 that
 * have no supporting schema yet:
 * - "Receita mensal confirmada": subscriptions has no amount/currency column and there is no
 *   payment/transaction ledger (Mercado Pago integration from Task 12 is not implemented).
 * - "Desempenho agregado em questões": there is no questions/quizzes schema — lesson_block_type
 *   has a 'quiz' block type, but it stores free-form jsonb content, not gradable
 *   question/answer/attempt rows. Flashcard performance IS implemented (see overview.flashcardRetentionRate).
 * - "Uso do Atlas 3D": no Atlas usage/events table exists (Task 14, Atlas contract, is not implemented).
 */
export const PENDING_METRICS: readonly PendingMetric[] = [
  {
    key: 'confirmed_revenue',
    label: 'Receita mensal confirmada',
    reason: 'A tabela subscriptions não armazena valor/moeda e não existe um livro de transações de pagamento ainda.',
  },
  {
    key: 'question_performance',
    label: 'Desempenho agregado em questões',
    reason: 'Não existe schema de questões/simulados com tentativas e gabarito; o bloco "quiz" de aula guarda apenas conteúdo livre.',
  },
  {
    key: 'atlas_usage',
    label: 'Uso do Atlas 3D',
    reason: 'Não existe tabela de eventos de uso do Atlas (contrato do Atlas ainda não foi implementado).',
  },
];

export function isValidRangeDays(value: number): value is MetricsRangeDays {
  return VALID_RANGE_DAYS.includes(value as MetricsRangeDays);
}

export function resolveRangeDays(value: string | string[] | undefined): MetricsRangeDays {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return isValidRangeDays(parsed) ? parsed : DEFAULT_METRICS_RANGE_DAYS;
}

export function sinceDate(rangeDays: MetricsRangeDays, now = new Date()): Date {
  return new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
}

export interface AdminMetricsOverview {
  activeSubscribers: number;
  newSubscriptions: number;
  cancellations: number;
  lessonsStarted: number;
  lessonsCompleted: number;
  completionRate: number;
  flashcardReviews: number;
  flashcardRetentionRate: number;
}

export interface AdminTopLesson {
  lessonId: string;
  title: string;
  slug: string;
  learners: number;
  completions: number;
}

export interface AdminMetricsSnapshot {
  rangeDays: MetricsRangeDays;
  since: string;
  overview: AdminMetricsOverview;
  topLessons: AdminTopLesson[];
}

interface OverviewRow {
  active_subscribers: number | string;
  new_subscriptions: number | string;
  cancellations: number | string;
  lessons_started: number | string;
  lessons_completed: number | string;
  completion_rate: number | string;
  flashcard_reviews: number | string;
  flashcard_retention_rate: number | string;
}

interface TopLessonRow {
  lesson_id: string;
  title: string;
  slug: string;
  learners: number | string;
  completions: number | string;
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapOverviewRow(row: OverviewRow): AdminMetricsOverview {
  return {
    activeSubscribers: toNumber(row.active_subscribers),
    newSubscriptions: toNumber(row.new_subscriptions),
    cancellations: toNumber(row.cancellations),
    lessonsStarted: toNumber(row.lessons_started),
    lessonsCompleted: toNumber(row.lessons_completed),
    completionRate: toNumber(row.completion_rate),
    flashcardReviews: toNumber(row.flashcard_reviews),
    flashcardRetentionRate: toNumber(row.flashcard_retention_rate),
  };
}

export function mapTopLessonRow(row: TopLessonRow): AdminTopLesson {
  return {
    lessonId: row.lesson_id,
    title: row.title,
    slug: row.slug,
    learners: toNumber(row.learners),
    completions: toNumber(row.completions),
  };
}

export async function getAdminMetrics(
  rangeDays: MetricsRangeDays = DEFAULT_METRICS_RANGE_DAYS,
): Promise<AdminMetricsSnapshot> {
  const { supabase } = await requireRole(['admin'], '/admin');
  const sinceIso = sinceDate(rangeDays).toISOString();

  const [overviewResult, topLessonsResult] = await Promise.all([
    supabase.rpc('get_admin_metrics_overview', { p_since: sinceIso }),
    supabase.rpc('get_admin_top_lessons', { p_since: sinceIso, p_limit: 5 }),
  ]);

  if (overviewResult.error) throw new Error('Não foi possível carregar os indicadores administrativos.');
  if (topLessonsResult.error) throw new Error('Não foi possível carregar os conteúdos mais acessados.');

  const overviewRow = (overviewResult.data as unknown as OverviewRow[] | null)?.[0];
  if (!overviewRow) throw new Error('Não foi possível carregar os indicadores administrativos.');

  const topLessonRows = (topLessonsResult.data as unknown as TopLessonRow[] | null) ?? [];

  return {
    rangeDays,
    since: sinceIso,
    overview: mapOverviewRow(overviewRow),
    topLessons: topLessonRows.map(mapTopLessonRow),
  };
}

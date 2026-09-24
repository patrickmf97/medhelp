import { evaluateAccess, type AccessInput } from '@medhelp/domain';

export interface LessonProgressInput {
  lessonId: string;
  seconds: number;
  complete: boolean;
}

export interface ProgressState {
  seconds: number;
  complete: boolean;
}

export interface ProgressHistory extends ProgressState {
  lessonId: string;
  cycle: string;
}

export function mergeProgress(existing: ProgressState, incoming: ProgressState): ProgressState {
  return {
    seconds: Math.max(existing.seconds, incoming.seconds),
    complete: existing.complete || incoming.complete,
  };
}

export function canStudyLesson(accessLevel: 'free' | 'premium', hasPremiumAccess: boolean): boolean {
  return accessLevel === 'free' || hasPremiumAccess;
}

export interface AccessGrant {
  starts_at: string;
  ends_at: string;
  revoked_at: string | null;
}

export function hasPremiumEntitlement(subscription: AccessInput, grants: AccessGrant[], now = new Date()): boolean {
  if (evaluateAccess(subscription, now).canAccessPremium) return true;
  return grants.some((grant) => !grant.revoked_at && Date.parse(grant.starts_at) <= now.getTime() && Date.parse(grant.ends_at) > now.getTime());
}

export function summarizeProgress(history: ProgressHistory[]) {
  const cycles = new Map<string, { cycle: string; started: number; completed: number }>();
  for (const item of history) {
    const cycle = cycles.get(item.cycle) ?? { cycle: item.cycle, started: 0, completed: 0 };
    cycle.started += 1;
    if (item.complete) cycle.completed += 1;
    cycles.set(item.cycle, cycle);
  }
  return {
    started: history.length,
    completed: history.filter((item) => item.complete).length,
    byCycle: Array.from(cycles.values()),
  };
}

export interface StudentLesson {
  id: string;
  title: string;
  cycle: string;
  discipline: string;
  accessLevel: 'free' | 'premium';
}

export interface StoredProgress {
  lesson_id: string;
  seconds: number;
  completed_at: string | null;
  last_studied_at: string;
}

export interface StudentDashboardInput {
  name: string;
  premiumAccess: boolean;
  lessons: StudentLesson[];
  progress: StoredProgress[];
  favoriteIds: string[];
  streak: number;
  subscriptionState: string;
  accessUntil: string | null;
}

export function buildStudentDashboard(input: StudentDashboardInput) {
  const lessonById = new Map(input.lessons.map((lesson) => [lesson.id, lesson]));
  const sorted = [...input.progress].sort((a, b) => Date.parse(b.last_studied_at) - Date.parse(a.last_studied_at));
  const history = sorted.map((item) => ({
    lessonId: item.lesson_id,
    seconds: item.seconds,
    complete: Boolean(item.completed_at),
    cycle: lessonById.get(item.lesson_id)?.cycle ?? 'Conteúdo anterior',
  }));
  const continueLesson = sorted
    .filter((item) => !item.completed_at)
    .map((item) => lessonById.get(item.lesson_id))
    .find((lesson) => lesson && canStudyLesson(lesson.accessLevel, input.premiumAccess))
    ?? input.lessons.find((lesson) => canStudyLesson(lesson.accessLevel, input.premiumAccess));
  return { ...input, summary: summarizeProgress(history), continueLesson, recentProgress: sorted.slice(0, 4) };
}

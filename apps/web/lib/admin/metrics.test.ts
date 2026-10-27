import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc, requireRole } = vi.hoisted(() => ({ rpc: vi.fn(), requireRole: vi.fn() }));
vi.mock('@/lib/auth/require-role', () => ({ requireRole }));

import {
  DEFAULT_METRICS_RANGE_DAYS,
  PENDING_METRICS,
  getAdminMetrics,
  isValidRangeDays,
  mapOverviewRow,
  mapTopLessonRow,
  resolveRangeDays,
  sinceDate,
} from './metrics';

beforeEach(() => {
  vi.resetAllMocks();
  requireRole.mockResolvedValue({ supabase: { rpc } });
});

describe('resolveRangeDays', () => {
  it('accepts the three allowed windows', () => {
    expect(resolveRangeDays('7')).toBe(7);
    expect(resolveRangeDays('30')).toBe(30);
    expect(resolveRangeDays('90')).toBe(90);
  });

  it('falls back to the default for anything else', () => {
    expect(resolveRangeDays(undefined)).toBe(DEFAULT_METRICS_RANGE_DAYS);
    expect(resolveRangeDays('365')).toBe(DEFAULT_METRICS_RANGE_DAYS);
    expect(resolveRangeDays('not-a-number')).toBe(DEFAULT_METRICS_RANGE_DAYS);
    expect(resolveRangeDays(['30', '7'])).toBe(30);
  });

  it('rejects values outside the allowed set', () => {
    expect(isValidRangeDays(14)).toBe(false);
    expect(isValidRangeDays(30)).toBe(true);
  });
});

describe('sinceDate', () => {
  it('subtracts the exact number of days from now', () => {
    const now = new Date('2026-10-26T12:00:00.000Z');
    expect(sinceDate(7, now).toISOString()).toBe('2026-10-19T12:00:00.000Z');
    expect(sinceDate(30, now).toISOString()).toBe('2026-09-26T12:00:00.000Z');
  });
});

describe('mapOverviewRow', () => {
  it('coerces numeric-as-string bigint/numeric columns from postgrest', () => {
    const mapped = mapOverviewRow({
      active_subscribers: '12',
      new_subscriptions: '3',
      cancellations: '1',
      lessons_started: '40',
      lessons_completed: '18',
      completion_rate: '0.4500',
      flashcard_reviews: '210',
      flashcard_retention_rate: '0.81',
    });
    expect(mapped).toEqual({
      activeSubscribers: 12,
      newSubscriptions: 3,
      cancellations: 1,
      lessonsStarted: 40,
      lessonsCompleted: 18,
      completionRate: 0.45,
      flashcardReviews: 210,
      flashcardRetentionRate: 0.81,
    });
  });

  it('never throws on missing/non-numeric values, defaulting to zero', () => {
    const mapped = mapOverviewRow({
      active_subscribers: null as unknown as string,
      new_subscriptions: undefined as unknown as string,
      cancellations: 'not-a-number',
      lessons_started: 0,
      lessons_completed: 0,
      completion_rate: 0,
      flashcard_reviews: 0,
      flashcard_retention_rate: 0,
    });
    expect(mapped.activeSubscribers).toBe(0);
    expect(mapped.newSubscriptions).toBe(0);
    expect(mapped.cancellations).toBe(0);
  });
});

describe('mapTopLessonRow', () => {
  it('maps snake_case postgrest rows to camelCase', () => {
    expect(
      mapTopLessonRow({ lesson_id: 'lesson-1', title: 'Aula 1', slug: 'aula-1', learners: '5', completions: '2' }),
    ).toEqual({ lessonId: 'lesson-1', title: 'Aula 1', slug: 'aula-1', learners: 5, completions: 2 });
  });
});

describe('PENDING_METRICS', () => {
  it('documents the indicators the spec asks for but the schema cannot back yet', () => {
    const keys = PENDING_METRICS.map((metric) => metric.key);
    expect(keys).toEqual(['confirmed_revenue', 'question_performance', 'atlas_usage']);
    for (const metric of PENDING_METRICS) {
      expect(metric.reason.length).toBeGreaterThan(10);
    }
  });
});

describe('getAdminMetrics', () => {
  it('requires the admin role before querying anything', async () => {
    requireRole.mockRejectedValue(new Error('acesso negado'));
    await expect(getAdminMetrics()).rejects.toThrow('acesso negado');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('calls both aggregate RPCs with the resolved window and maps the rows', async () => {
    rpc.mockImplementation((fn: string) => {
      if (fn === 'get_admin_metrics_overview') {
        return Promise.resolve({
          data: [
            {
              active_subscribers: 12,
              new_subscriptions: 3,
              cancellations: 1,
              lessons_started: 40,
              lessons_completed: 18,
              completion_rate: 0.45,
              flashcard_reviews: 210,
              flashcard_retention_rate: 0.81,
            },
          ],
          error: null,
        });
      }
      return Promise.resolve({
        data: [{ lesson_id: 'lesson-1', title: 'Aula 1', slug: 'aula-1', learners: 9, completions: 4 }],
        error: null,
      });
    });

    const snapshot = await getAdminMetrics(7);

    expect(rpc).toHaveBeenCalledWith('get_admin_metrics_overview', { p_since: expect.any(String) });
    expect(rpc).toHaveBeenCalledWith('get_admin_top_lessons', { p_since: expect.any(String), p_limit: 5 });
    expect(snapshot.rangeDays).toBe(7);
    expect(snapshot.overview.activeSubscribers).toBe(12);
    expect(snapshot.overview.completionRate).toBe(0.45);
    expect(snapshot.topLessons).toEqual([{ lessonId: 'lesson-1', title: 'Aula 1', slug: 'aula-1', learners: 9, completions: 4 }]);
  });

  it('surfaces a user-safe error and never leaks the raw postgrest error when the overview RPC fails', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied for table lesson_progress' } });
    await expect(getAdminMetrics()).rejects.toThrow('Não foi possível carregar os indicadores administrativos.');
  });

  it('surfaces a user-safe error when the top-lessons RPC fails', async () => {
    rpc.mockImplementation((fn: string) => {
      if (fn === 'get_admin_metrics_overview') {
        return Promise.resolve({
          data: [
            {
              active_subscribers: 0,
              new_subscriptions: 0,
              cancellations: 0,
              lessons_started: 0,
              lessons_completed: 0,
              completion_rate: 0,
              flashcard_reviews: 0,
              flashcard_retention_rate: 0,
            },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: { code: '42501', message: 'nope' } });
    });
    await expect(getAdminMetrics()).rejects.toThrow('Não foi possível carregar os conteúdos mais acessados.');
  });
});

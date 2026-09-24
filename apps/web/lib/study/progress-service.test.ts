import { describe, expect, it } from 'vitest';

import { buildStudentDashboard, canStudyLesson, hasPremiumEntitlement, mergeProgress, summarizeProgress } from './progress-service';

describe('student progress', () => {
  it('never moves a resume position backwards or reopens a completed lesson', () => {
    expect(mergeProgress({ seconds: 120, complete: false }, { seconds: 30, complete: false }))
      .toEqual({ seconds: 120, complete: false });
    expect(mergeProgress({ seconds: 120, complete: true }, { seconds: 180, complete: false }))
      .toEqual({ seconds: 180, complete: true });
  });

  it('keeps recorded completions visible after premium access expires', () => {
    const history = [{ lessonId: 'a', seconds: 90, complete: true, cycle: 'Ciclo básico' }];
    expect(summarizeProgress(history)).toEqual({ started: 1, completed: 1, byCycle: [{ cycle: 'Ciclo básico', started: 1, completed: 1 }] });
    expect(canStudyLesson('premium', false)).toBe(false);
    expect(canStudyLesson('free', false)).toBe(true);
  });

  it('accepts a live grant and rejects expired or revoked grants', () => {
    const now = new Date('2026-09-24T12:00:00Z');
    const expired = { state: 'expired' as const, accessUntil: null };
    expect(hasPremiumEntitlement(expired, [{ starts_at: '2026-09-24T11:00:00Z', ends_at: '2026-09-24T13:00:00Z', revoked_at: null }], now)).toBe(true);
    expect(hasPremiumEntitlement(expired, [{ starts_at: '2026-09-24T11:00:00Z', ends_at: '2026-09-24T13:00:00Z', revoked_at: '2026-09-24T11:30:00Z' }], now)).toBe(false);
    expect(hasPremiumEntitlement(expired, [{ starts_at: '2026-09-23T11:00:00Z', ends_at: '2026-09-24T11:00:00Z', revoked_at: null }], now)).toBe(false);
  });

  it('recommends an accessible unfinished lesson and retains all historical counts', () => {
    const dashboard = buildStudentDashboard({
      name: 'Patrick', premiumAccess: false,
      lessons: [
        { id: 'a', title: 'Aula gratuita', cycle: 'Ciclo Básico', discipline: 'Anatomia', accessLevel: 'free' },
        { id: 'b', title: 'Aula premium', cycle: 'Ciclo Clínico', discipline: 'Clínica', accessLevel: 'premium' },
      ],
      progress: [
        { lesson_id: 'b', seconds: 600, completed_at: '2026-09-23T11:00:00Z', last_studied_at: '2026-09-23T11:00:00Z' },
        { lesson_id: 'a', seconds: 45, completed_at: null, last_studied_at: '2026-09-22T11:00:00Z' },
      ],
      favoriteIds: ['b'], streak: 2, subscriptionState: 'expired', accessUntil: null,
    });
    expect(dashboard.summary).toEqual({ started: 2, completed: 1, byCycle: [
      { cycle: 'Ciclo Clínico', started: 1, completed: 1 },
      { cycle: 'Ciclo Básico', started: 1, completed: 0 },
    ] });
    expect(dashboard.continueLesson?.id).toBe('a');
    expect(dashboard.favoriteIds).toEqual(['b']);
  });
});

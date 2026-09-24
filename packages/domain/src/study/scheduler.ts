export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy';

export interface ReviewState {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  dueAt: string;
}

const day = 86_400_000;

export function scheduleReview(previous: ReviewState | null, grade: ReviewGrade, reviewedAt: Date): ReviewState {
  if (!Number.isFinite(reviewedAt.getTime())) throw new Error('Data de revisão inválida.');
  const easeFactor = Math.max(1.3, Math.min(3, Math.round(((previous?.easeFactor ?? 2.5) + ({ again: -.2, hard: -.15, good: 0, easy: .2 }[grade])) * 100) / 100));
  if (grade === 'again') return { repetitions: 0, intervalDays: 0, easeFactor, dueAt: new Date(reviewedAt.getTime() + 10 * 60_000).toISOString() };
  const repetitions = (previous?.repetitions ?? 0) + 1;
  const intervalDays = previous?.intervalDays
    ? grade === 'hard' ? Math.max(1, Math.round(previous.intervalDays * 1.2))
      : grade === 'good' ? Math.max(2, Math.round(previous.intervalDays * previous.easeFactor))
        : Math.max(4, Math.round(previous.intervalDays * (previous.easeFactor + .8)))
    : ({ hard: 1, good: 2, easy: 4 }[grade]);
  return { repetitions, intervalDays, easeFactor, dueAt: new Date(reviewedAt.getTime() + intervalDays * day).toISOString() };
}

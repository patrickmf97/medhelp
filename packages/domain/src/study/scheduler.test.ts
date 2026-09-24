import { describe, expect, it } from 'vitest';
import { scheduleReview } from './scheduler';

const now = new Date('2026-09-24T12:00:00.000Z');

describe('scheduleReview', () => {
  it('schedules a missed new card in ten minutes', () => {
    expect(scheduleReview(null, 'again', now)).toEqual({ repetitions: 0, intervalDays: 0, easeFactor: 2.3, dueAt: '2026-09-24T12:10:00.000Z' });
  });

  it('starts an easy new card with a four-day interval', () => {
    expect(scheduleReview(null, 'easy', now)).toEqual({ repetitions: 1, intervalDays: 4, easeFactor: 2.7, dueAt: '2026-09-28T12:00:00.000Z' });
  });

  it('advances reviewed cards predictably for hard and good answers', () => {
    const previous = { repetitions: 2, intervalDays: 4, easeFactor: 2.5, dueAt: '2026-09-24T12:00:00.000Z' };
    expect(scheduleReview(previous, 'hard', now)).toEqual({ repetitions: 3, intervalDays: 5, easeFactor: 2.35, dueAt: '2026-09-29T12:00:00.000Z' });
    expect(scheduleReview(previous, 'good', now)).toEqual({ repetitions: 3, intervalDays: 10, easeFactor: 2.5, dueAt: '2026-10-04T12:00:00.000Z' });
  });

  it('resets a missed card while keeping the ease bounded', () => {
    expect(scheduleReview({ repetitions: 5, intervalDays: 30, easeFactor: 1.3, dueAt: now.toISOString() }, 'again', now))
      .toEqual({ repetitions: 0, intervalDays: 0, easeFactor: 1.3, dueAt: '2026-09-24T12:10:00.000Z' });
  });
});

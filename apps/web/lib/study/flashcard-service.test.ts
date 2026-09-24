import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireUser } from '@/lib/auth/require-role';
import { buildFlashcardQueue, getStudentFlashcards, submitFlashcardReview } from './flashcard-service';

vi.mock('@/lib/auth/require-role', () => ({ requireUser: vi.fn() }));

const card = { id: '11111111-1111-4111-8111-111111111111', deck_id: 'deck-1', front: 'O que é a homeostase?', back: 'Equilíbrio interno.', explanation: null, position: 0 };

describe('flashcard queue', () => {
  it('includes due and unseen cards, excluding future reviews and locked decks', () => {
    const result = buildFlashcardQueue({
      decks: [{ id: 'deck-1', title: 'Fisiologia', description: null, access_level: 'free', discipline_id: 'd1' }, { id: 'locked', title: 'Premium', description: null, access_level: 'premium', discipline_id: 'd1' }],
      cards: [card, { ...card, id: 'future' }, { ...card, id: 'locked-card', deck_id: 'locked' }],
      schedules: [{ card_id: 'future', due_at: '2026-09-25T12:00:00Z' }],
      premiumAccess: false,
    }, new Date('2026-09-24T12:00:00Z'));
    expect(result.queue.map((item) => item.id)).toEqual([card.id]);
    expect(result.lockedDecks).toEqual(['locked']);
    expect(result.nextDue).toBe('2026-09-25T12:00:00Z');
  });
});

describe('submitting a review', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects invalid grades without connecting to Supabase', async () => {
    await expect(submitFlashcardReview(card.id, 'great' as never, '22222222-2222-4222-8222-222222222222')).rejects.toThrow('Revisão inválida');
    expect(requireUser).not.toHaveBeenCalled();
  });

  it('sends the stable event identifier to the atomic database operation', async () => {
    const rpc = vi.fn(async () => ({ data: [{ due_at: '2026-09-28T12:00:00Z', repetitions: 1, interval_days: 4, ease_factor: 2.7, replayed: false }], error: null }));
    vi.mocked(requireUser).mockResolvedValue({ user: { id: 'student' }, supabase: { rpc } } as never);
    const eventId = '22222222-2222-4222-8222-222222222222';
    const result = await submitFlashcardReview(card.id, 'easy', eventId);
    expect(rpc).toHaveBeenCalledWith('review_flashcard', { p_card_id: card.id, p_grade: 'easy', p_event_id: eventId });
    expect(result.intervalDays).toBe(4);
  });
});

describe('loading a large review queue', () => {
  it('paginates cards and schedules so old reviews are not treated as new', async () => {
    const cards = Array.from({ length: 1001 }, (_, index) => ({ ...card, id: `card-${index}` }));
    const schedules = cards.slice(0, 1000).map((item) => ({ card_id: item.id, due_at: '2026-09-25T12:00:00Z' }));
    const tables: Record<string, unknown[]> = {
      flashcard_decks: [{ id: 'deck-1', title: 'Fisiologia', description: null, access_level: 'free', discipline_id: 'd1' }],
      flashcards: cards, flashcard_schedules: schedules, access_grants: [],
    };
    const from = vi.fn((table: string) => {
      const query = {
        select: () => query, eq: () => query, lte: () => query, is: () => query, order: () => query,
        range: async (start: number, end: number) => ({ data: tables[table]?.slice(start, end + 1) ?? [], error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
      };
      return query;
    });
    vi.mocked(requireUser).mockResolvedValue({ user: { id: 'student' }, supabase: { from } } as never);
    const result = await getStudentFlashcards('student');
    expect(result.totalCards).toBe(1001);
    expect(result.queue.map((item) => item.id)).toEqual(['card-1000']);
  });
});

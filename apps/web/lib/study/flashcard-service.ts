import type { ReviewGrade } from '@medhelp/domain';
import { requireUser } from '@/lib/auth/require-role';
import { hasPremiumEntitlement, type AccessGrant } from './progress-service';

export interface FlashcardDeck {
  id: string;
  title: string;
  description: string | null;
  access_level: 'free' | 'premium';
  discipline_id: string;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  explanation: string | null;
  position: number;
}

export interface FlashcardSchedule {
  card_id: string;
  due_at: string;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const grades: ReviewGrade[] = ['again', 'hard', 'good', 'easy'];
const pageSize = 1000;

async function allPages<T>(fetchPage: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const items: T[] = [];
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await fetchPage(start, start + pageSize - 1);
    if (error) throw new Error('Não foi possível carregar seus flashcards.');
    items.push(...(data ?? []));
    if (!data || data.length < pageSize) return items;
  }
}

export function buildFlashcardQueue(input: {
  decks: FlashcardDeck[];
  cards: Flashcard[];
  schedules: FlashcardSchedule[];
  premiumAccess: boolean;
}, now = new Date()) {
  const accessible = new Map(input.decks.filter((deck) => deck.access_level === 'free' || input.premiumAccess).map((deck) => [deck.id, deck]));
  const scheduleByCard = new Map(input.schedules.map((schedule) => [schedule.card_id, schedule]));
  const eligible = input.cards.filter((card) => accessible.has(card.deck_id));
  const queue = eligible.filter((card) => {
    const schedule = scheduleByCard.get(card.id);
    return !schedule || Date.parse(schedule.due_at) <= now.getTime();
  }).sort((a, b) => {
    const aDue = scheduleByCard.get(a.id)?.due_at;
    const bDue = scheduleByCard.get(b.id)?.due_at;
    return (aDue ? Date.parse(aDue) : now.getTime()) - (bDue ? Date.parse(bDue) : now.getTime()) || a.position - b.position;
  }).map((card) => ({ ...card, deckTitle: accessible.get(card.deck_id)!.title, isNew: !scheduleByCard.has(card.id) }));
  const nextDue = input.schedules.filter((schedule) => Date.parse(schedule.due_at) > now.getTime() && eligible.some((card) => card.id === schedule.card_id))
    .map((schedule) => schedule.due_at).sort()[0] ?? null;
  return { queue, decks: input.decks, lockedDecks: input.decks.filter((deck) => !accessible.has(deck.id)).map((deck) => deck.id), nextDue, totalCards: eligible.length };
}

export async function getStudentFlashcards(userId: string) {
  const { supabase, user } = await requireUser('/aluno/flashcards');
  if (user.id !== userId) throw new Error('Acesso negado.');
  const [decks, cards, schedules, subscription, grants] = await Promise.all([
    allPages<FlashcardDeck>((start, end) => supabase.from('flashcard_decks').select('id,title,description,access_level,discipline_id').eq('status', 'published').lte('published_at', new Date().toISOString()).is('deleted_at', null).order('title').order('id').range(start, end)),
    allPages<Flashcard>((start, end) => supabase.from('flashcards').select('id,deck_id,front,back,explanation,position').is('deleted_at', null).order('position').order('id').range(start, end)),
    allPages<FlashcardSchedule>((start, end) => supabase.from('flashcard_schedules').select('card_id,due_at').eq('user_id', userId).order('card_id').range(start, end)),
    supabase.from('subscriptions').select('state,access_until').eq('user_id', userId).maybeSingle(),
    allPages<AccessGrant>((start, end) => supabase.from('access_grants').select('starts_at,ends_at,revoked_at').eq('user_id', userId).order('starts_at').range(start, end)),
  ]);
  if (subscription.error) throw new Error('Não foi possível carregar seus flashcards.');
  const premiumAccess = hasPremiumEntitlement({ state: subscription.data?.state ?? 'pending', accessUntil: subscription.data?.access_until ?? null }, grants);
  return { ...buildFlashcardQueue({ decks, cards, schedules, premiumAccess }), premiumAccess };
}

export async function submitFlashcardReview(cardId: string, grade: ReviewGrade, eventId: string) {
  if (!uuidPattern.test(cardId) || !uuidPattern.test(eventId) || !grades.includes(grade)) throw new Error('Revisão inválida.');
  const { supabase } = await requireUser('/aluno/flashcards');
  const { data, error } = await supabase.rpc('review_flashcard', { p_card_id: cardId, p_grade: grade, p_event_id: eventId });
  if (error || !data?.[0]) throw new Error('Não foi possível salvar esta revisão.');
  const review = data[0];
  return { dueAt: review.due_at as string, repetitions: review.repetitions as number, intervalDays: review.interval_days as number, easeFactor: review.ease_factor as number, replayed: review.replayed as boolean };
}

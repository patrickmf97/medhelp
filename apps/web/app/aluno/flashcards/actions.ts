'use server';

import { revalidatePath } from 'next/cache';
import type { ReviewGrade } from '@medhelp/domain';
import { submitFlashcardReview } from '@/lib/study/flashcard-service';

export async function reviewAction(cardId: string, grade: ReviewGrade, eventId: string) {
  const result = await submitFlashcardReview(cardId, grade, eventId);
  revalidatePath('/aluno/flashcards');
  return result;
}

'use server';

import { revalidatePath } from 'next/cache';
import { saveLessonProgress, setFavorite } from '@/lib/study/student-service';

export async function saveProgressAction(lessonId: string, seconds: number, complete: boolean) {
  await saveLessonProgress({ lessonId, seconds, complete });
  if (complete) {
    revalidatePath('/aluno');
    revalidatePath('/aluno/progresso');
  }
}

export async function toggleFavoriteAction(lessonId: string, favorite: boolean) {
  await setFavorite(lessonId, favorite);
  revalidatePath('/aluno');
}

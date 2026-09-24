import { expect, test } from '@playwright/test';

test('flashcard study keeps the intended destination through sign in', async ({ page }) => {
  await page.goto('/aluno/flashcards');
  await expect(page).toHaveURL(/\/entrar\?next=%2Faluno%2Fflashcards$/);
});

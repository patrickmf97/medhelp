import { expect, test } from '@playwright/test';

test('student study routes preserve the intended destination through sign in', async ({ page }) => {
  await page.goto('/aluno/disciplinas');
  await expect(page).toHaveURL(/\/entrar\?next=%2Faluno%2Fdisciplinas$/);
  await page.goto('/aluno/progresso');
  await expect(page).toHaveURL(/\/entrar\?next=%2Faluno%2Fprogresso$/);
});

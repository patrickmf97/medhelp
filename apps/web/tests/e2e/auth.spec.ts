import { expect, test } from '@playwright/test';

test('authentication pages expose complete journeys without account enumeration', async ({ page }) => {
  await page.goto('/entrar');
  await expect(page.getByRole('heading', { name: 'Entre na sua conta' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Esqueci minha senha' })).toHaveAttribute('href', '/recuperar-senha');

  await page.goto('/cadastro');
  await expect(page.getByLabel('Nome completo')).toBeVisible();
  await expect(page.getByLabel(/Aceito os Termos de uso/)).toBeVisible();

  await page.goto('/recuperar-senha');
  await expect(page.getByText(/Se existir uma conta/)).toBeVisible();
});

test('protected student route preserves a safe destination', async ({ page }) => {
  await page.goto('/aluno');
  await expect(page).toHaveURL(/\/entrar\?next=%2Faluno$/);
});

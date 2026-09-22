import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('public home presents the complete acquisition path', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Medicina é difícil. Estudar não precisa ser.' })).toBeVisible();
  await expect(page.getByText('R$ 30/mês').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Começar agora' }).first()).toHaveAttribute('href', '/cadastro');
  await expect(page.getByRole('link', { name: 'Explorar gratuitamente' })).toHaveAttribute('href', '/explorar');
  await expect(page.getByRole('heading', { name: 'Perguntas frequentes' })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('mobile navigation opens, closes and supports keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const toggle = page.getByRole('button', { name: 'Abrir menu' });
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation', { name: 'Navegação móvel' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fechar menu' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Navegação móvel' })).toBeHidden();
});

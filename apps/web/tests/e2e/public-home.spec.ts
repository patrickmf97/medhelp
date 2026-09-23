import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('public home presents the complete acquisition path', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Medicina é difícil. Estudar não precisa ser.' })).toBeVisible();
  await expect(page.getByText('R$ 30/mês').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Começar agora' }).first()).toHaveAttribute('href', '/cadastro');
  await expect(page.getByRole('link', { name: 'Explorar gratuitamente' })).toHaveAttribute('href', '/explorar');
  await expect(page.getByRole('heading', { name: 'Um sistema de estudo. Não mais uma pilha de abas.' })).toBeVisible();
  await page.getByRole('tab', { name: 'Ciclo clínico' }).click();
  await expect(page.getByRole('heading', { name: 'Conecte achados antes de memorizar condutas' })).toBeVisible();
  await page.getByRole('button', { name: 'Explorar sistema nervoso' }).click();
  await expect(page.getByRole('heading', { name: 'Sistema nervoso' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Uma assinatura. Toda a jornada.' })).toBeVisible();
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

test('study stage tabs work with keyboard and the public catalog renders a clear state', async ({ page }) => {
  await page.goto('/');
  const basic = page.getByRole('tab', { name: 'Ciclo básico' });
  await basic.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Ciclo clínico' })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Conecte achados antes de memorizar condutas' })).toBeVisible();

  await page.goto('/explorar');
  await expect(page.getByRole('heading', { name: 'Conteúdos publicados' })).toBeVisible();
  await expect(page.locator('.catalog-state, .content-explorer')).toBeVisible();
});

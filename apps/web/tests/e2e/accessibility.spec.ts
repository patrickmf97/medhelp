import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// tests/e2e/public-home.spec.ts already runs an axe scan on '/' and a keyboard check on the
// mobile menu. This file covers the public pages that were still unscanned (the catalog and the
// two auth forms a visitor must use before ever creating content) plus the keyboard paths that
// public-home.spec.ts does not exercise: the skip link and the full desktop primary navigation.
// None of these tests need a database, so they do not depend on MEDHELP_E2E_LOCAL.

test.describe('automated accessibility scan on key public pages', () => {
  // These pages use scroll-triggered reveal animations (components/public/motion-shell.tsx):
  // content starts at opacity:0 until it intersects the viewport. Scanning mid-transition
  // produces a false-positive contrast finding (fading text against a fading background both
  // read as near-white). Emulating the reduced-motion preference makes MotionShell mark every
  // section visible immediately, which both reflects the real a11y requirement in
  // docs/superpowers/specs/2026-09-22-medhelp-design.md ("Respeito à preferência de redução de
  // movimento") and lets the scan see the settled page.
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('public catalog has no automated accessibility violations', async ({ page }) => {
    await page.goto('/explorar');
    await expect(page.getByRole('heading', { name: 'Conteúdos publicados' })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('sign-in page has no automated accessibility violations', async ({ page }) => {
    await page.goto('/entrar');
    await expect(page.getByRole('heading', { name: 'Entre na sua conta' })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('sign-up page has no automated accessibility violations', async ({ page }) => {
    await page.goto('/cadastro');
    await expect(page.getByRole('heading', { name: 'Crie sua conta' })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('password recovery page has no automated accessibility violations', async ({ page }) => {
    await page.goto('/recuperar-senha');
    await expect(page.getByRole('heading', { name: 'Recupere sua senha' })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('keyboard navigation on the public shell', () => {
  test('the skip link is the first stop and jumps past the header into the main content', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'Pular para o conteúdo' });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toHaveAttribute('href', '#conteudo');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#conteudo$/);
  });

  test('every primary navigation link is reachable, in order, by keyboard alone', async ({ page, isMobile }) => {
    // Below the responsive breakpoint the desktop nav and header actions are not rendered in the
    // tab order at all (components/public/header.tsx hides them via CSS; the mobile menu is a
    // separate, closed-by-default nav). public-home.spec.ts already covers keyboard access to
    // that mobile menu once it is opened.
    test.skip(isMobile, 'Desktop-only primary navigation; the mobile menu is covered by public-home.spec.ts');
    await page.goto('/');
    const expectedOrder = ['Recursos', 'Atlas 3D', 'Disciplinas', 'Biblioteca', 'Preço', 'FAQ', 'Entrar', 'Começar agora'];
    const focusedNames: string[] = [];
    for (let i = 0; i < 14; i += 1) {
      await page.keyboard.press('Tab');
      const name = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.getAttribute('aria-label') ?? el?.textContent?.trim() ?? '';
      });
      focusedNames.push(name);
    }
    const positions = expectedOrder.map((name) => focusedNames.indexOf(name));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});

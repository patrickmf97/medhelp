import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

// tests/e2e/auth.spec.ts and tests/e2e/student-study.spec.ts already cover the anonymous case
// (no session at all is redirected to /entrar). What is still missing is the role matrix for a
// user who IS signed in but lacks the role a route requires — requireRole() in
// apps/web/lib/auth/require-role.ts must send them to /acesso-negado instead, and an editor must
// not implicitly gain admin access. This requires a disposable local Supabase, same as
// tests/e2e/basic-cycle.spec.ts.
//
// The admin client is created lazily inside each test (after test.skip runs) rather than at
// describe-body evaluation time: constructing it eagerly throws "supabaseUrl is required" as
// soon as this file is collected when MEDHELP_E2E_LOCAL/the Supabase env vars are unset.
function getAdmin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.MEDHELP_E2E_LOCAL_SERVICE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function createUserWithRole(admin: SupabaseClient, role: 'student' | 'editor' | 'admin') {
  const email = `role-${role}-${randomUUID()}@medhelp.test`;
  const password = `Role-${randomUUID()}!`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(created.error).toBeNull();
  const userId = created.data.user!.id;
  // handle_new_user() (supabase/migrations/20260922194821_identity_access.sql) already grants
  // the base 'student' role on signup; editor/admin need the elevated role added explicitly.
  if (role !== 'student') {
    const grant = await admin.from('user_roles').insert({ user_id: userId, role, assigned_by: userId });
    expect(grant.error).toBeNull();
  }
  return { email, password };
}

async function login(page: Page, email: string, password: string, next: string) {
  await page.goto(`/entrar?next=${encodeURIComponent(next)}`);
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel(/^Senha/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

test.describe('role-based authorization matrix', () => {
  test.setTimeout(90_000);

  test('a plain student is denied both /admin and /editor', async ({ page }) => {
    test.skip(process.env.MEDHELP_E2E_LOCAL !== '1', 'Requires disposable local Supabase');
    const admin = getAdmin();
    const { email, password } = await createUserWithRole(admin, 'student');

    await login(page, email, password, '/admin');
    await expect(page).toHaveURL(/\/acesso-negado$/);
    await expect(page.getByRole('heading', { name: 'Você não tem permissão para esta área' })).toBeVisible();

    await page.goto('/editor');
    await expect(page).toHaveURL(/\/acesso-negado$/);
  });

  test('an editor is denied /admin but allowed /editor', async ({ page }) => {
    test.skip(process.env.MEDHELP_E2E_LOCAL !== '1', 'Requires disposable local Supabase');
    const admin = getAdmin();
    const { email, password } = await createUserWithRole(admin, 'editor');

    await login(page, email, password, '/admin');
    await expect(page).toHaveURL(/\/acesso-negado$/);

    await page.goto('/editor');
    await expect(page).toHaveURL(/\/editor\/conteudos$/);
    await expect(page.getByRole('heading', { name: 'Conteúdos' })).toBeVisible();
  });

  test('an admin is allowed both /admin and /editor', async ({ page }) => {
    test.skip(process.env.MEDHELP_E2E_LOCAL !== '1', 'Requires disposable local Supabase');
    const admin = getAdmin();
    const { email, password } = await createUserWithRole(admin, 'admin');

    await login(page, email, password, '/admin');
    await expect(page).toHaveURL(/\/admin$/);
    // The admin page now renders the real metrics dashboard (apps/web/app/admin/page.tsx,
    // apps/web/lib/admin/metrics.ts) instead of the placeholder it had when this test was
    // first written; assert against the real heading so this keeps verifying the admin role
    // actually reaches a working /admin page instead of asserting stale copy.
    await expect(page.getByRole('heading', { name: 'Indicadores', exact: true })).toBeVisible();

    await page.goto('/editor');
    await expect(page).toHaveURL(/\/editor\/conteudos$/);
  });
  // No cleanup against remote services: the entire local container is discarded by CI.
});

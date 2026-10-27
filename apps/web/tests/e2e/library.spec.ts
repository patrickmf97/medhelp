import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';

test('ebook library: RLS-driven visibility for anonymous, free and subscribed readers', async ({ page, context }) => {
  test.skip(process.env.MEDHELP_E2E_LOCAL !== '1', 'Requires disposable local Supabase');
  test.setTimeout(60_000);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  expect(url).toBe('http://127.0.0.1:54321');
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const admin = createClient(url, process.env.MEDHELP_E2E_LOCAL_SERVICE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

  const editorEmail = `library-editor-${randomUUID()}@medhelp.test`;
  const editor = await admin.auth.admin.createUser({ email: editorEmail, password: `Editor-${randomUUID()}!`, email_confirm: true });
  expect(editor.error).toBeNull();
  const editorId = editor.data.user!.id;
  const role = await admin.from('user_roles').insert({ user_id: editorId, role: 'editor', assigned_by: editorId });
  expect(role.error).toBeNull();

  const suffix = randomUUID().slice(0, 8);
  const freeInsert = await admin.from('ebooks').insert({
    title: `Atlas livre ${suffix}`, slug: `atlas-livre-${suffix}`, author: 'Henry Gray',
    source: 'Domínio público', license_type: 'dominio_publico', license_url: 'https://creativecommons.org/publicdomain/mark/1.0/',
    file_object_key: `content/${editorId}/atlas-livre-${suffix}.pdf`, mime_type: 'application/pdf', size_bytes: 1_000_000,
    access_level: 'free', status: 'published', published_at: new Date().toISOString(), created_by: editorId, updated_by: editorId,
  }).select('id').single();
  expect(freeInsert.error).toBeNull();

  const premiumInsert = await admin.from('ebooks').insert({
    title: `Manual premium ${suffix}`, slug: `manual-premium-${suffix}`, author: 'Autores MEDHELP',
    source: 'Convênio editorial', license_type: 'licenca_institucional', license_url: 'https://medhelp.example.com/licenca',
    file_object_key: `content/${editorId}/manual-premium-${suffix}.pdf`, mime_type: 'application/pdf', size_bytes: 1_000_000,
    access_level: 'premium', status: 'published', published_at: new Date().toISOString(), created_by: editorId, updated_by: editorId,
  }).select('id').single();
  expect(premiumInsert.error).toBeNull();

  await page.goto('/biblioteca');
  await expect(page.getByRole('heading', { name: `Atlas livre ${suffix}` })).toBeVisible();
  await expect(page.getByRole('heading', { name: `Manual premium ${suffix}` })).toHaveCount(0);

  // The download flow itself cannot be fully exercised in this sandbox: the
  // RLS row lookup succeeds, but no real R2 credentials exist locally, so
  // the server action is expected to fail at the "storage not configured"
  // boundary rather than silently succeed with a fabricated URL.
  await page.getByRole('button', { name: `Baixar Atlas livre ${suffix}` }).click();
  await expect(page.getByText(/Não foi possível gerar o link de download/)).toBeVisible();

  const studentEmail = `library-student-${randomUUID()}@medhelp.test`;
  const studentPassword = `Student-${randomUUID()}!`;
  const student = await admin.auth.admin.createUser({ email: studentEmail, password: studentPassword, email_confirm: true });
  expect(student.error).toBeNull();
  const studentId = student.data.user!.id;
  const anonClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  expect((await anonClient.auth.signInWithPassword({ email: studentEmail, password: studentPassword })).error).toBeNull();

  await page.goto(`/entrar?next=${encodeURIComponent('/biblioteca')}`);
  await page.getByLabel('E-mail', { exact: true }).fill(studentEmail);
  await page.getByLabel(/^Senha/).fill(studentPassword);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/biblioteca$/);
  await expect(page.getByRole('heading', { name: `Manual premium ${suffix}` })).toHaveCount(0);

  const grant = await admin.from('subscriptions').insert({ user_id: studentId, state: 'active', access_until: new Date(Date.now() + 86_400_000).toISOString() });
  expect(grant.error).toBeNull();
  await page.reload();
  await expect(page.getByRole('heading', { name: `Manual premium ${suffix}` })).toBeVisible();

  await context.clearCookies();
});

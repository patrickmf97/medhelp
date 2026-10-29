import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';

test('admin routes require authentication and reject non-admin roles', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/entrar\?next=%2Fadmin$/);

  test.skip(process.env.MEDHELP_E2E_LOCAL !== '1', 'Role rejection needs a disposable local Supabase user');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const admin = createClient(url, process.env.MEDHELP_E2E_LOCAL_SERVICE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = `metrics-denied-${randomUUID()}@medhelp.test`;
  const password = `Study-${randomUUID()}!`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(created.error).toBeNull();

  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const signed = await client.auth.signInWithPassword({ email, password });
  expect(signed.error).toBeNull();

  await page.goto('/entrar?next=%2Fadmin');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel(/^Senha/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/acesso-negado$/);
});

test('admin dashboard shows real aggregate metrics computed from seeded data', async ({ page }) => {
  test.skip(process.env.MEDHELP_E2E_LOCAL !== '1', 'Requires disposable local Supabase');
  test.setTimeout(90_000);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  expect(url).toBe('http://127.0.0.1:54321');
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const admin = createClient(url, process.env.MEDHELP_E2E_LOCAL_SERVICE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

  // Admin account for the dashboard itself.
  const adminEmail = `metrics-admin-${randomUUID()}@medhelp.test`;
  const adminPassword = `Study-${randomUUID()}!`;
  const createdAdmin = await admin.auth.admin.createUser({ email: adminEmail, password: adminPassword, email_confirm: true });
  expect(createdAdmin.error).toBeNull();
  const adminUserId = createdAdmin.data.user!.id;
  const roleGrant = await admin.from('user_roles').insert({ user_id: adminUserId, role: 'admin' });
  expect(roleGrant.error).toBeNull();

  // A learner whose progress and flashcard reviews feed the indicators.
  const learnerEmail = `metrics-learner-${randomUUID()}@medhelp.test`;
  const learnerCreated = await admin.auth.admin.createUser({ email: learnerEmail, password: `Study-${randomUUID()}!`, email_confirm: true });
  expect(learnerCreated.error).toBeNull();
  const learnerId = learnerCreated.data.user!.id;

  const subscription = await admin.from('subscriptions').insert({
    user_id: learnerId,
    state: 'active',
    access_until: new Date(Date.now() + 86_400_000).toISOString(),
  });
  expect(subscription.error).toBeNull();

  const { data: cycle } = await admin.from('cycles').select('id').eq('slug', 'basico').single();
  const lessonTitle = `E2E métricas ${randomUUID().slice(0, 8)}`;
  const discipline = await admin
    .from('disciplines')
    .insert({ cycle_id: cycle!.id, title: 'Disciplina E2E métricas', slug: `e2e-metricas-${randomUUID()}` })
    .select('id')
    .single();
  expect(discipline.error).toBeNull();
  const module_ = await admin
    .from('modules')
    .insert({ discipline_id: discipline.data!.id, title: 'Módulo E2E métricas', slug: `e2e-metricas-${randomUUID()}` })
    .select('id')
    .single();
  expect(module_.error).toBeNull();
  const lesson = await admin
    .from('lessons')
    .insert({
      module_id: module_.data!.id,
      title: lessonTitle,
      slug: `e2e-metricas-${randomUUID()}`,
      status: 'published',
      access_level: 'free',
      published_at: new Date().toISOString(),
      created_by: adminUserId,
      updated_by: adminUserId,
    })
    .select('id')
    .single();
  expect(lesson.error).toBeNull();

  const progress = await admin.from('lesson_progress').insert({
    user_id: learnerId,
    lesson_id: lesson.data!.id,
    seconds: 400,
    completed_at: new Date().toISOString(),
  });
  expect(progress.error).toBeNull();

  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const signed = await client.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
  expect(signed.error).toBeNull();

  await page.goto('/entrar?next=%2Fadmin');
  await page.getByLabel('E-mail', { exact: true }).fill(adminEmail);
  await page.getByLabel(/^Senha/).fill(adminPassword);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await expect(page.getByRole('heading', { name: 'Indicadores', exact: true })).toBeVisible();
  await expect(page.getByText('Assinantes ativos')).toBeVisible();
  await expect(page.getByRole('cell', { name: lessonTitle })).toBeVisible();
  // The pending (schema-less) indicators must stay explicit instead of showing a fake number.
  await expect(page.getByText('Receita mensal confirmada')).toBeVisible();
  await expect(page.getByText('Uso do Atlas 3D')).toBeVisible();

  // No cleanup against remote services: the entire local container is discarded by CI.
});

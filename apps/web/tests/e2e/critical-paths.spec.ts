import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';

// The real imported catalog (83 lessons, see docs/operations/basic-cycle-import.md) is entirely
// premium today, so the free-content discovery path has no fixture to exercise against it yet.
// This test seeds one disposable free, published lesson directly through the service-role client
// and removes nothing afterwards: the whole local container is discarded by CI, matching the
// convention already used by tests/e2e/basic-cycle.spec.ts.
test('visitor discovers a free lesson, creates an account and reaches the full lesson', async ({ page }) => {
  test.skip(process.env.MEDHELP_E2E_LOCAL !== '1', 'Requires disposable local Supabase');
  test.setTimeout(90_000);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  expect(url).toBe('http://127.0.0.1:54321');
  const admin = createClient(url, process.env.MEDHELP_E2E_LOCAL_SERVICE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const suffix = randomUUID();
  const fixtureAuthor = await admin.auth.admin.createUser({
    email: `fixture-${suffix}@medhelp.test`,
    password: `Fixture-${randomUUID()}!`,
    email_confirm: true,
  });
  expect(fixtureAuthor.error).toBeNull();
  const authorId = fixtureAuthor.data.user!.id;

  const cycle = await admin.from('cycles').insert({ title: 'Ciclo de demonstração', slug: `ciclo-${suffix}` }).select('id').single();
  expect(cycle.error).toBeNull();
  const discipline = await admin
    .from('disciplines')
    .insert({ cycle_id: cycle.data!.id, title: 'Disciplina de demonstração', slug: `disciplina-${suffix}` })
    .select('id')
    .single();
  expect(discipline.error).toBeNull();
  const module_ = await admin
    .from('modules')
    .insert({ discipline_id: discipline.data!.id, title: 'Módulo de demonstração', slug: `modulo-${suffix}` })
    .select('id')
    .single();
  expect(module_.error).toBeNull();

  const lessonTitle = `Aula gratuita de demonstração ${suffix}`;
  const lesson = await admin
    .from('lessons')
    .insert({
      module_id: module_.data!.id,
      title: lessonTitle,
      slug: `aula-${suffix}`,
      summary: 'Uma amostra gratuita para visitantes conhecerem a MEDHELP.',
      status: 'published',
      access_level: 'free',
      published_at: new Date(Date.now() - 60_000).toISOString(),
      created_by: authorId,
      updated_by: authorId,
    })
    .select('id')
    .single();
  expect(lesson.error).toBeNull();
  const lessonId = lesson.data!.id as string;

  const block = await admin.from('lesson_blocks').insert({
    lesson_id: lessonId,
    block_type: 'rich_text',
    content: { text: 'Conteúdo introdutório gratuito usado apenas neste teste automatizado.' },
    position: 0,
  });
  expect(block.error).toBeNull();

  // 1. Visitor discovers the free content from the public catalog without any account.
  await page.goto('/explorar');
  await expect(page.getByRole('heading', { name: 'Conteúdos publicados' })).toBeVisible();
  await page.getByLabel('Buscar conteúdos').fill(suffix);
  const card = page.locator('.catalog-card', { hasText: lessonTitle });
  await expect(card).toBeVisible();
  await card.getByRole('link', { name: 'Ler amostra gratuita' }).click();
  // Next dev serves this nested dynamic route on demand; the first hit in a run can take longer
  // than the default 5s assertion timeout to compile.
  await expect(page).toHaveURL(new RegExp(`/explorar/aula/${lessonId}$`), { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: lessonTitle })).toBeVisible();
  await expect(page.getByText('Amostra gratuita publicada')).toBeVisible();
  await expect(page.getByText('Conteúdo introdutório gratuito usado apenas neste teste automatizado.')).toBeVisible();

  // 2. Visitor creates an account from the sample page's own call to action.
  await page.getByRole('link', { name: 'Criar conta para acompanhar' }).click();
  await expect(page).toHaveURL(/\/cadastro$/);

  const fullName = `Visitante de teste ${suffix}`;
  const email = `journey-${suffix}@medhelp.test`;
  const password = `Journey-${randomUUID()}!`;
  await page.getByLabel('Nome completo').fill(fullName);
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  // The shared Field wraps its hint in the label; match the label prefix.
  await page.getByLabel(/^Senha/).fill(password);
  await page.getByLabel(/Aceito os Termos de uso/).check();
  await page.getByRole('button', { name: 'Criar minha conta' }).click();
  await expect(page.getByText('Cadastro recebido. Confira seu e-mail para confirmar a conta.')).toBeVisible();

  // Local confirmation requires clicking the emailed link; this disposable environment has no
  // mailbox, so the confirmation itself is done through the admin API exactly like a user
  // clicking their own confirmation e-mail would, then the browser flow continues normally.
  const profile = await admin.from('profiles').select('id').eq('full_name', fullName).single();
  expect(profile.error).toBeNull();
  const confirmed = await admin.auth.admin.updateUserById(profile.data!.id, { email_confirm: true });
  expect(confirmed.error).toBeNull();

  // 3. With the account confirmed, the visitor logs in and reaches the full lesson they found earlier.
  await page.goto(`/entrar?next=${encodeURIComponent(`/aluno/disciplinas/${lessonId}`)}`);
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel(/^Senha/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  // Also a cold dynamic-route compile the first time this test run hits it.
  await expect(page).toHaveURL(new RegExp(`/aluno/disciplinas/${lessonId}$`), { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: lessonTitle })).toBeVisible();
  await expect(page.getByText('Aula gratuita', { exact: true })).toBeVisible();
  const content = page.getByRole('region', { name: 'Conteúdo da aula' });
  await expect(content).toBeVisible();
  await expect(content).toContainText('Conteúdo introdutório gratuito usado apenas neste teste automatizado.');
  // No cleanup against remote services: the entire local container is discarded by CI.
});

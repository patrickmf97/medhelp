begin;
select plan(18);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
values
  ('52000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ebooks-editor@medhelp.test', '', now(), now(), now(), '{"full_name":"Editor Biblioteca"}'),
  ('52000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ebooks-student@medhelp.test', '', now(), now(), now(), '{"full_name":"Aluno Biblioteca"}');

insert into public.user_roles (user_id, role, assigned_by)
values ('52000000-0000-0000-0000-000000000001', 'editor', '52000000-0000-0000-0000-000000000001');

-- A: free, published, complete rights metadata.
insert into public.ebooks (id, title, slug, author, source, license_type, license_url, file_object_key, mime_type, size_bytes, access_level, status, published_at, created_by, updated_by)
values ('53000000-0000-0000-0000-000000000001', 'Atlas de anatomia de domínio público', 'atlas-anatomia-dominio-publico', 'Henry Gray', 'Gray''s Anatomy, 20th edition (1918)', 'dominio_publico', 'https://creativecommons.org/publicdomain/mark/1.0/', 'content/52000000-0000-0000-0000-000000000001/atlas-anatomia.pdf', 'application/pdf', 5_000_000, 'free', 'published', now(), '52000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001');

-- B: premium, published, complete rights metadata.
insert into public.ebooks (id, title, slug, author, source, license_type, license_url, file_object_key, mime_type, size_bytes, access_level, status, published_at, created_by, updated_by)
values ('53000000-0000-0000-0000-000000000002', 'Manual clínico licenciado', 'manual-clinico-licenciado', 'Autores MEDHELP', 'Convênio editorial MEDHELP 2026', 'licenca_institucional', 'https://medhelp.example.com/licencas/manual-clinico', 'content/52000000-0000-0000-0000-000000000001/manual-clinico.pdf', 'application/pdf', 8_000_000, 'premium', 'published', now(), '52000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001');

-- C: draft, missing rights metadata (used to prove publish is blocked without it).
insert into public.ebooks (id, title, slug, author, source, file_object_key, mime_type, size_bytes, access_level, status, created_by, updated_by)
values ('53000000-0000-0000-0000-000000000003', 'Rascunho sem metadados de direitos', 'rascunho-sem-direitos', 'Autor desconhecido', 'Fonte não verificada', 'content/52000000-0000-0000-0000-000000000001/rascunho.pdf', 'application/pdf', 1_000_000, 'premium', 'draft', '52000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001');

-- D: draft, complete rights metadata (used for the happy publication path).
insert into public.ebooks (id, title, slug, author, source, license_type, license_url, file_object_key, mime_type, size_bytes, access_level, status, created_by, updated_by)
values ('53000000-0000-0000-0000-000000000004', 'Rascunho pronto para revisão', 'rascunho-pronto-revisao', 'Autores MEDHELP', 'Convênio editorial MEDHELP 2026', 'licenca_institucional', 'https://medhelp.example.com/licencas/rascunho-pronto', 'content/52000000-0000-0000-0000-000000000001/rascunho-pronto.pdf', 'application/pdf', 2_000_000, 'premium', 'draft', '52000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001');

set local role anon;
select is((select count(*) from public.ebooks), 1::bigint, 'anonymous visitors see only free published ebooks');
select is((select count(*) from public.ebooks where access_level = 'premium'), 0::bigint, 'anonymous visitors never see premium ebooks');
select throws_ok(
  $$ insert into public.ebooks (title, slug, author, source, file_object_key, mime_type, size_bytes, created_by, updated_by) values ('Invasão', 'invasao', 'x', 'y', 'content/x/invasao.pdf', 'application/pdf', 1, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000') $$,
  '42501', null, 'anonymous visitors cannot create ebooks'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '52000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.ebooks), 1::bigint, 'students without an active subscription see only free published ebooks');
select is((select count(*) from public.ebooks where access_level = 'premium'), 0::bigint, 'students without an active subscription cannot read premium ebook rows');
select throws_ok(
  $$ insert into public.ebooks (title, slug, author, source, file_object_key, mime_type, size_bytes, created_by, updated_by) values ('Fraude', 'fraude', 'x', 'y', 'content/x/fraude.pdf', 'application/pdf', 1, '52000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002') $$,
  '42501', null, 'students cannot create ebooks'
);
reset role;

insert into public.subscriptions (user_id, state, access_until)
values ('52000000-0000-0000-0000-000000000002', 'active', now() + interval '30 days');

set local role authenticated;
select set_config('request.jwt.claim.sub', '52000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.ebooks), 2::bigint, 'subscribed students also read premium published ebooks');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '52000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.ebooks), 4::bigint, 'editors read draft, review and published ebooks');
select throws_ok(
  $$ insert into public.ebooks (title, slug, author, source, file_object_key, mime_type, size_bytes, created_by, updated_by, status, published_at)
     values ('Atalho', 'atalho', 'Autor', 'Fonte', 'content/52000000-0000-0000-0000-000000000001/atalho.pdf', 'application/pdf', 1, auth.uid(), auth.uid(), 'published', now()) $$,
  '42501', null, 'editors cannot bypass the initial draft state on insert'
);
select lives_ok(
  $$ insert into public.ebooks (title, slug, author, source, file_object_key, mime_type, size_bytes, created_by, updated_by)
     values ('Nova aula de bolso', 'nova-aula-de-bolso', 'Autor', 'Fonte', 'content/52000000-0000-0000-0000-000000000001/nova.pdf', 'application/pdf', 1, auth.uid(), auth.uid()) $$,
  'editors create ebooks as drafts'
);
select throws_ok(
  $$ insert into public.ebooks (title, slug, author, source, license_type, license_url, file_object_key, mime_type, size_bytes, created_by, updated_by)
     values ('Licença insegura', 'licenca-insegura', 'Autor', 'Fonte', 'dominio_publico', 'http://sem-https.example.com', 'content/52000000-0000-0000-0000-000000000001/insegura.pdf', 'application/pdf', 1, auth.uid(), auth.uid()) $$,
  '23514', null, 'license URLs must be https'
);
select lives_ok(
  $$ update public.ebooks set status = 'review', updated_by = auth.uid() where id = '53000000-0000-0000-0000-000000000003' $$,
  'editors submit an ebook draft for review'
);
select throws_ok(
  $$ update public.ebooks set status = 'published', updated_by = auth.uid() where id = '53000000-0000-0000-0000-000000000003' $$,
  '23514', null, 'publishing is blocked without complete rights metadata'
);
select lives_ok(
  $$ update public.ebooks set status = 'review', updated_by = auth.uid() where id = '53000000-0000-0000-0000-000000000004' $$,
  'editors submit a rights-complete draft for review'
);
select lives_ok(
  $$ update public.ebooks set status = 'published', updated_by = auth.uid() where id = '53000000-0000-0000-0000-000000000004' $$,
  'publishing succeeds once rights metadata is complete'
);
select throws_ok(
  $$ update public.ebooks set created_by = '52000000-0000-0000-0000-000000000002' where id = '53000000-0000-0000-0000-000000000001' $$,
  '23514', null, 'ebook creator attribution cannot be changed'
);
select lives_ok(
  $$ update public.ebooks set status = 'archived', updated_by = auth.uid() where id = '53000000-0000-0000-0000-000000000001' $$,
  'editors archive a published ebook'
);
select throws_ok(
  $$ update public.ebooks set status = 'review', updated_by = auth.uid() where id = '53000000-0000-0000-0000-000000000001' $$,
  '23514', null, 'archived ebooks can only return to draft'
);
reset role;

select * from finish();
rollback;

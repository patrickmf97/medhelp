begin;
select plan(18);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'content-student@medhelp.test', '', now(), now(), now(), '{"full_name":"Aluno Conteúdo"}'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'content-editor@medhelp.test', '', now(), now(), now(), '{"full_name":"Editor Conteúdo"}');

insert into public.user_roles (user_id, role, assigned_by)
values ('20000000-0000-0000-0000-000000000002', 'editor', '20000000-0000-0000-0000-000000000002');

insert into public.disciplines (id, cycle_id, title, slug)
select '21000000-0000-0000-0000-000000000001', id, 'Cardiologia', 'cardiologia'
from public.cycles where slug = 'clinico';
insert into public.modules (id, discipline_id, title, slug)
values ('22000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'Insuficiência Cardíaca', 'insuficiencia-cardiaca');
insert into public.lessons (id, module_id, title, slug, status, access_level, published_at, created_by, updated_by)
values
  ('23000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'Aula publicada', 'aula-publicada', 'published', 'free', now(), '20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002'),
  ('23000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000001', 'Rascunho', 'rascunho', 'draft', 'premium', null, '20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002'),
  ('23000000-0000-0000-0000-000000000003', '22000000-0000-0000-0000-000000000001', 'Aula agendada', 'aula-agendada', 'published', 'free', now() + interval '1 day', '20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002'),
  ('23000000-0000-0000-0000-000000000004', '22000000-0000-0000-0000-000000000001', 'Aula premium', 'aula-premium', 'published', 'premium', now(), '20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002');

insert into public.lesson_blocks (lesson_id, block_type, content)
values
  ('23000000-0000-0000-0000-000000000001', 'rich_text', '{"text":"Conteúdo gratuito"}'),
  ('23000000-0000-0000-0000-000000000004', 'rich_text', '{"text":"Conteúdo premium"}');

set local role anon;
select is((select count(*) from public.lessons), 2::bigint, 'anonymous users see released lesson metadata');
select is((select count(*) from public.lesson_blocks), 1::bigint, 'anonymous users read only free lesson content');
select throws_ok(
  $$ insert into public.cycles (title, slug) values ('Invasão', 'invasao') $$,
  '42501', null, 'anonymous users cannot mutate the catalog'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.lessons), 2::bigint, 'students see released lesson metadata');
select is((select count(*) from public.lesson_blocks), 1::bigint, 'students without access read only free content');
select is(
  (with affected as (
    update public.lessons set title = 'Alterada'
    where id = '23000000-0000-0000-0000-000000000001'
    returning 1
  ) select count(*) from affected),
  0::bigint,
  'students cannot mutate lessons'
);
select throws_ok(
  $$ insert into public.modules (discipline_id, title, slug) values ('21000000-0000-0000-0000-000000000001', 'Fraude', 'fraude') $$,
  '42501', null, 'students cannot create modules'
);
reset role;

insert into public.subscriptions (user_id, state, access_until)
values ('20000000-0000-0000-0000-000000000001', 'active', now() + interval '30 days');

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.lesson_blocks), 2::bigint, 'active members read premium content');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.lessons), 4::bigint, 'editors see drafts and scheduled lessons');
select lives_ok(
  $$ insert into public.lessons (module_id, title, slug, created_by, updated_by) values ('22000000-0000-0000-0000-000000000001', 'Nova aula', 'nova-aula', auth.uid(), auth.uid()) $$,
  'editors create lessons'
);
select throws_ok(
  $$ insert into public.lessons (module_id, title, slug, status, published_at, created_by, updated_by) values ('22000000-0000-0000-0000-000000000001', 'Atalho', 'atalho', 'published', now(), auth.uid(), auth.uid()) $$,
  '42501', null, 'editors cannot bypass the initial draft state'
);
select lives_ok(
  $$ update public.lessons set status = 'review', updated_by = auth.uid() where id = '23000000-0000-0000-0000-000000000002' $$,
  'editors submit drafts for review'
);
select lives_ok(
  $$ update public.lessons set status = 'published', updated_by = auth.uid() where id = '23000000-0000-0000-0000-000000000002' $$,
  'editors publish reviewed lessons'
);
select lives_ok(
  $$ update public.lessons set scheduled_for = now() + interval '2 days', updated_by = auth.uid() where id = '23000000-0000-0000-0000-000000000002' $$,
  'editors reschedule published lessons'
);
select ok(
  (select published_at > now() + interval '47 hours' from public.lessons where id = '23000000-0000-0000-0000-000000000002'),
  'rescheduling synchronizes the release timestamp'
);
select throws_ok(
  $$ update public.lessons set status = 'published', updated_by = auth.uid() where id = (select id from public.lessons where slug = 'nova-aula') $$,
  '23514', null, 'drafts cannot be published directly'
);
select ok(
  (select count(*) >= 3 from public.audit_logs where entity_type = 'lessons'),
  'content mutations produce audit events'
);
select is(
  (with affected as (
    update public.subscriptions set state = 'expired'
    returning 1
  ) select count(*) from affected),
  0::bigint,
  'editors cannot mutate billing'
);
reset role;

select * from finish();
rollback;

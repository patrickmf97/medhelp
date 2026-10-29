begin;
select plan(14);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'metrics-student-a@medhelp.test', '', now(), now(), now(), '{"full_name":"Aluno Métricas A"}'),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'metrics-student-b@medhelp.test', '', now(), now(), now(), '{"full_name":"Aluno Métricas B"}'),
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'metrics-student-c@medhelp.test', '', now(), now(), now(), '{"full_name":"Aluno Métricas C"}'),
  ('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'metrics-admin@medhelp.test', '', now(), now(), now(), '{"full_name":"Admin Métricas"}');

insert into public.user_roles (user_id, role, assigned_by)
values ('40000000-0000-0000-0000-000000000004', 'admin', '40000000-0000-0000-0000-000000000004');

-- Subscriptions: one currently active (new in-window), one canceled a while ago but
-- updated (canceled) in-window, one pending (must never count as "new").
insert into public.subscriptions (user_id, state, access_until, created_at, updated_at)
values
  ('40000000-0000-0000-0000-000000000001', 'active', now() + interval '10 days', now(), now()),
  ('40000000-0000-0000-0000-000000000002', 'canceled', now() - interval '1 day', now() - interval '10 days', now()),
  ('40000000-0000-0000-0000-000000000003', 'pending', null, now(), now());

insert into public.disciplines (id, cycle_id, title, slug)
select '41000000-0000-0000-0000-000000000001', id, 'Métricas administrativas', 'metricas-administrativas'
from public.cycles where slug = 'basico';
insert into public.modules (id, discipline_id, title, slug)
values ('42000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', 'Indicadores', 'indicadores');
insert into public.lessons (id, module_id, title, slug, status, access_level, published_at, created_by, updated_by)
values
  ('43000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', 'Aula mais acessada', 'aula-mais-acessada', 'published', 'free', now(), '40000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004'),
  ('43000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000001', 'Aula menos acessada', 'aula-menos-acessada', 'published', 'free', now(), '40000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004');

-- Lesson progress: lesson 1 studied by both students (one completion), lesson 2 studied
-- by one student (completed) -> lessons_started = 3, lessons_completed = 2.
insert into public.lesson_progress (user_id, lesson_id, seconds, completed_at)
values
  ('40000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001', 600, now()),
  ('40000000-0000-0000-0000-000000000002', '43000000-0000-0000-0000-000000000001', 120, null),
  ('40000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000002', 300, now());

insert into public.flashcard_decks (id, discipline_id, title, status, access_level, published_at)
values ('44000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', 'Revisão de métricas', 'published', 'free', now());
insert into public.flashcards (id, deck_id, front, back)
values ('45000000-0000-0000-0000-000000000001', '44000000-0000-0000-0000-000000000001', 'Pergunta', 'Resposta');

-- Flashcard reviews: 2 strong grades (good/easy) and 1 weak (again) -> retention 2/3.
insert into public.flashcard_reviews (user_id, card_id, event_id, grade, due_at, repetitions, interval_days, ease_factor)
values
  ('40000000-0000-0000-0000-000000000001', '45000000-0000-0000-0000-000000000001', '46000000-0000-0000-0000-000000000001', 'good', now() + interval '2 days', 1, 2, 2.50),
  ('40000000-0000-0000-0000-000000000002', '45000000-0000-0000-0000-000000000001', '46000000-0000-0000-0000-000000000002', 'easy', now() + interval '4 days', 1, 4, 2.70),
  ('40000000-0000-0000-0000-000000000001', '45000000-0000-0000-0000-000000000001', '46000000-0000-0000-0000-000000000003', 'again', now() + interval '10 minutes', 0, 0, 2.30);

set local role anon;
select throws_ok(
  $$ select * from public.get_admin_metrics_overview(now() - interval '3 days') $$,
  '42501', null, 'anonymous cannot call the metrics overview function at all'
);
select throws_ok(
  $$ select * from public.get_admin_top_lessons(now() - interval '3 days', 5) $$,
  '42501', null, 'anonymous cannot call the top-lessons function at all'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$ select * from public.get_admin_metrics_overview(now() - interval '3 days') $$,
  '42501', null, 'a regular student is rejected by the internal admin check'
);
select throws_ok(
  $$ select * from public.get_admin_top_lessons(now() - interval '3 days', 5) $$,
  '42501', null, 'a regular student cannot read the top-lessons breakdown either'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000004', true);

select is(
  (select active_subscribers from public.get_admin_metrics_overview(now() - interval '3 days')),
  1::bigint, 'exactly one subscription is currently active'
);
select is(
  (select new_subscriptions from public.get_admin_metrics_overview(now() - interval '3 days')),
  1::bigint, 'only the subscription created in-window counts as new (pending excluded)'
);
select is(
  (select cancellations from public.get_admin_metrics_overview(now() - interval '3 days')),
  1::bigint, 'the subscription canceled in-window is counted once'
);
select is(
  (select lessons_started from public.get_admin_metrics_overview(now() - interval '3 days')),
  3::bigint, 'three lesson_progress rows were recorded in-window'
);
select is(
  (select lessons_completed from public.get_admin_metrics_overview(now() - interval '3 days')),
  2::bigint, 'two of those three rows are completed'
);
select is(
  (select completion_rate from public.get_admin_metrics_overview(now() - interval '3 days')),
  0.6667::numeric, 'completion rate is completed/started rounded to 4 decimals'
);
select is(
  (select flashcard_reviews from public.get_admin_metrics_overview(now() - interval '3 days')),
  3::bigint, 'three flashcard reviews were recorded in-window'
);
select is(
  (select flashcard_retention_rate from public.get_admin_metrics_overview(now() - interval '3 days')),
  0.6667::numeric, 'retention rate counts good/easy grades over the total'
);

select is(
  (select array_agg(title order by learners desc)
     from public.get_admin_top_lessons(now() - interval '3 days', 5)),
  array['Aula mais acessada', 'Aula menos acessada'],
  'top lessons are ordered by distinct learners, most accessed first'
);
select is(
  (select count(*) from public.get_admin_top_lessons(now() - interval '3 days', 1)),
  1::bigint, 'the limit argument caps how many lessons come back'
);
reset role;

select * from finish();
rollback;

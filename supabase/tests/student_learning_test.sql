begin;
select plan(10);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student-a@medhelp.test', '', now(), now(), now(), '{"full_name":"Estudante A"}'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student-b@medhelp.test', '', now(), now(), now(), '{"full_name":"Estudante B"}');

insert into public.disciplines (id, cycle_id, title, slug)
select '31000000-0000-0000-0000-000000000001', id, 'Anatomia do Estudo', 'anatomia-do-estudo'
from public.cycles where slug = 'basico';
insert into public.modules (id, discipline_id, title, slug)
values ('32000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'Fundamentos', 'fundamentos');
insert into public.lessons (id, module_id, title, slug, status, access_level, published_at, created_by, updated_by)
values
  ('33000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000001', 'Aula gratuita', 'aula-gratuita', 'published', 'free', now(), '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
  ('33000000-0000-0000-0000-000000000002', '32000000-0000-0000-0000-000000000001', 'Aula premium', 'aula-premium', 'published', 'premium', now(), '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001');

set local role anon;
select throws_ok($$ insert into public.lesson_progress(user_id, lesson_id, seconds) values ('30000000-0000-0000-0000-000000000001','33000000-0000-0000-0000-000000000001',30) $$, '42501', null, 'anonymous cannot write study progress');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
select lives_ok($$ insert into public.lesson_progress(user_id, lesson_id, seconds) values (auth.uid(),'33000000-0000-0000-0000-000000000001',120) $$, 'student can record free lesson progress');
select throws_ok($$ insert into public.lesson_progress(user_id, lesson_id, seconds) values (auth.uid(),'33000000-0000-0000-0000-000000000002',30) $$, '42501', null, 'premium progress requires access');
select lives_ok($$ update public.lesson_progress set seconds = 30, completed_at = now() where lesson_id = '33000000-0000-0000-0000-000000000001' $$, 'student can complete own lesson');
select is((select seconds from public.lesson_progress where lesson_id = '33000000-0000-0000-0000-000000000001'), 120, 'resume position cannot decrease');
select is((select count(*) from public.study_streaks), 1::bigint, 'study activity records one daily streak');
select is((select count(*) from public.lesson_progress where user_id = '30000000-0000-0000-0000-000000000002'), 0::bigint, 'student cannot see another user history');
reset role;

insert into public.subscriptions (user_id, state, access_until)
values ('30000000-0000-0000-0000-000000000001','active',now() + interval '1 day');
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
select lives_ok($$ insert into public.lesson_progress(user_id, lesson_id, seconds) values (auth.uid(),'33000000-0000-0000-0000-000000000002',90) $$, 'premium progress allowed during access');
reset role;
update public.subscriptions set state = 'expired', access_until = now() - interval '1 day' where user_id = '30000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.lesson_progress), 2::bigint, 'expired subscription retains recorded progress');
select is((select count(*) from public.favorites), 0::bigint, 'favorites table is readable to the owner');
reset role;

select * from finish();
rollback;

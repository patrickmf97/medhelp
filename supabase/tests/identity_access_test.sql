begin;
select plan(13);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student@medhelp.test', '', now(), now(), now(), '{"full_name":"Aluno Teste"}'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other@medhelp.test', '', now(), now(), now(), '{"full_name":"Outro Aluno"}'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'editor@medhelp.test', '', now(), now(), now(), '{"full_name":"Editor Teste"}'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@medhelp.test', '', now(), now(), now(), '{"full_name":"Admin Teste"}');

insert into public.user_roles (user_id, role, assigned_by)
values
  ('10000000-0000-0000-0000-000000000003', 'editor', '10000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000004', 'admin', '10000000-0000-0000-0000-000000000004');

insert into public.subscriptions (user_id, state, access_until)
values
  ('10000000-0000-0000-0000-000000000001', 'active', now() + interval '30 days'),
  ('10000000-0000-0000-0000-000000000003', 'active', now() + interval '30 days');

set local role anon;
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anonymous users cannot list profiles');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.profiles), 1::bigint, 'student reads only own profile');
select lives_ok($$ update public.profiles set full_name = 'Aluno Atualizado' where id = '10000000-0000-0000-0000-000000000001' $$, 'student updates own name');
select is((select count(*) from public.profiles where full_name = 'Aluno Atualizado'), 1::bigint, 'own profile update is visible');
select throws_ok($$ insert into public.user_roles (user_id, role) values ('10000000-0000-0000-0000-000000000001', 'admin') $$, '42501', null, 'student cannot grant roles');
select throws_ok($$ insert into public.access_grants (user_id, starts_at, ends_at, reason) values ('10000000-0000-0000-0000-000000000001', now(), now() + interval '1 day', 'self grant') $$, '42501', null, 'student cannot grant access');
select is((select count(*) from public.subscriptions), 1::bigint, 'student reads only own subscription');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.subscriptions), 0::bigint, 'editor cannot read billing');
select is((select count(*) from public.user_roles where user_id <> auth.uid()), 0::bigint, 'editor cannot list other roles');
select throws_ok($$ update public.user_roles set role = 'admin' where user_id = '10000000-0000-0000-0000-000000000003' $$, '42501', null, 'editor cannot elevate roles');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select is((select count(*) from public.profiles), 4::bigint, 'admin lists profiles');
select lives_ok($$ update public.subscriptions set state = 'expired' where user_id = '10000000-0000-0000-0000-000000000001' $$, 'admin manages subscriptions');
select lives_ok($$ insert into public.audit_logs (actor_id, action, entity_type, entity_id) values (auth.uid(), 'subscription.expired', 'subscription', '10000000-0000-0000-0000-000000000001') $$, 'admin writes audit events');
reset role;

select * from finish();
rollback;

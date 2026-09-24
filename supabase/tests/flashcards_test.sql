begin;
select plan(7);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('34000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','flashcard-check@medhelp.test','',now(),now(),now());
insert into public.disciplines(id,cycle_id,title,slug)
select '35000000-0000-0000-0000-000000000001', id, 'Revisão clínica', 'revisao-clinica' from public.cycles where slug='basico';
insert into public.flashcard_decks(id,discipline_id,title,status,access_level,published_at)
values
('36000000-0000-0000-0000-000000000001','35000000-0000-0000-0000-000000000001','Teste gratuito','published','free',now()),
('36000000-0000-0000-0000-000000000002','35000000-0000-0000-0000-000000000001','Teste premium','published','premium',now());
insert into public.flashcards(id,deck_id,front,back)
values
('37000000-0000-0000-0000-000000000001','36000000-0000-0000-0000-000000000001','Pergunta','Resposta'),
('37000000-0000-0000-0000-000000000002','36000000-0000-0000-0000-000000000002','Pergunta premium','Resposta premium');

set local role anon;
select throws_ok($$select * from public.review_flashcard('37000000-0000-0000-0000-000000000001','easy','38000000-0000-0000-0000-000000000001')$$, '42501', null, 'anonymous cannot review');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','34000000-0000-0000-0000-000000000001',true);
select is((select count(*) from public.flashcards), 1::bigint, 'premium card answer is hidden');
select throws_ok($$select * from public.review_flashcard('37000000-0000-0000-0000-000000000002','easy','38000000-0000-0000-0000-000000000002')$$, '42501', null, 'premium review is denied without access');
select is((select interval_days from public.review_flashcard('37000000-0000-0000-0000-000000000001','easy','38000000-0000-0000-0000-000000000001')), 4, 'easy card starts at four days');
select ok((select replayed from public.review_flashcard('37000000-0000-0000-0000-000000000001','easy','38000000-0000-0000-0000-000000000001')), 'same event is replayed');
select is((select count(*) from public.flashcard_reviews), 1::bigint, 'duplicate submission writes only once');
select throws_ok($$select * from public.review_flashcard('37000000-0000-0000-0000-000000000001','again','38000000-0000-0000-0000-000000000001')$$, '22023', null, 'event identifier cannot change its grade');
reset role;

select * from finish();
rollback;

begin;
select no_plan();

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
values ('90000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','import-editor@medhelp.test','',now(),now(),now(),'{}'),
       ('90000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','import-student@medhelp.test','',now(),now(),now(),'{}');
insert into public.user_roles(user_id, role, assigned_by)
values ('90000000-0000-4000-8000-000000000001','editor','90000000-0000-4000-8000-000000000001');

-- Synthetic 12 disciplines × 6 modules, plus 11 second lessons = 83.
select set_config('test.import_bundle', jsonb_build_object('version','0.3','digest',repeat('a',64),'lessons', (
  select jsonb_agg(jsonb_build_object(
    'editorialId', code || '-' || lpad(m::text,2,'0') || '-A' || a,
    'moduleId', code || '-' || lpad(m::text,2,'0'), 'moduleTitle','Module ' || code || m,
    'disciplineCode',code,'disciplineTitle','Discipline ' || code,
    'title','Lesson ' || code || m || a,'position',a,'summary','Introduction',
    'sourcePath','content/ciclo-basico/disciplinas/' || lower(code) || '.md',
    'sourceHash',repeat('b',64),
    'blocks',jsonb_build_array(jsonb_build_object('block_type','rich_text','position',0,'content',jsonb_build_object('text','Original lesson','format','medhelp-markdown-v1')))
  ) order by code,m,a)
  from unnest(array['AN','BQ','CH','EB','EG','FG','FI','HC','IM','MP','PG','SH']) with ordinality as d(code,n)
  cross join generate_series(1,6) m
  cross join lateral generate_series(1,case when m=1 and n<=11 then 2 else 1 end) a
))::text,true);

select has_function('public','preview_content_import',array['jsonb'],'preview exists');
select has_function('public','apply_content_import',array['jsonb','text'],'apply exists');
select has_function('public','publish_content_import',array['uuid','text'],'publish exists');

set local role anon;
select throws_ok($$select public.preview_content_import(current_setting('test.import_bundle')::jsonb)$$,'42501',null,'anon rejected');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.preview_content_import(current_setting('test.import_bundle')::jsonb)$$,'42501',null,'student rejected');
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.preview_content_import('{}'::jsonb)$$,'22023',null,'malformed bundle rejected');
select throws_ok($$select public.preview_content_import(jsonb_set(current_setting('test.import_bundle')::jsonb,'{lessons,1,editorialId}','"AN-01-A1"'))$$,'22023',null,'duplicate identity rejected');
savepoint collision;
insert into public.disciplines(cycle_id,title,slug) select id,'Discipline AN','an' from public.cycles where slug='basico';
insert into public.modules(discipline_id,title,slug) select id,'Module AN1','an-01' from public.disciplines where slug='an';
insert into public.lessons(module_id,title,slug,access_level,created_by,updated_by) select id,'Existing free lesson','an-01-a1','free',auth.uid(),auth.uid() from public.modules where slug='an-01';
select throws_ok($$select public.apply_content_import(current_setting('test.import_bundle')::jsonb,public.preview_content_import(current_setting('test.import_bundle')::jsonb)->>'expectedState')$$,'40001',null,'unbound free slug is not adopted');
select is((select count(*) from public.content_import_bindings),0::bigint,'conflict rolls back entire import');
select is((select access_level::text from public.lessons where slug='an-01-a1'),'free','collision preserves free content');
rollback to collision;
select set_config('test.preview',public.preview_content_import(current_setting('test.import_bundle')::jsonb)::text,true);
select is((current_setting('test.preview')::jsonb->>'create')::int,83,'preview creates 83');
select set_config('test.applied',public.apply_content_import(current_setting('test.import_bundle')::jsonb,current_setting('test.preview')::jsonb->>'expectedState')::text,true);
select is((select count(*) from public.content_import_bindings),83::bigint,'83 bindings');
select is((select count(*) from public.lessons where status='review'),83::bigint,'all imported to review');
select is((public.preview_content_import(current_setting('test.import_bundle')::jsonb)->>'unchanged')::int,83,'repeat is unchanged');
select throws_ok($$select public.apply_content_import(current_setting('test.import_bundle')::jsonb,current_setting('test.preview')::jsonb->>'expectedState')$$,'40001',null,'stale preview rejected');

select set_config('test.ids',(select jsonb_agg(lesson_id order by editorial_id)::text from public.content_import_bindings),true);
select lives_ok($$select public.apply_content_import(current_setting('test.import_bundle')::jsonb,public.preview_content_import(current_setting('test.import_bundle')::jsonb)->>'expectedState')$$,'identical reimport accepted');
select is((select jsonb_agg(lesson_id order by editorial_id)::text from public.content_import_bindings),current_setting('test.ids'),'IDs stable');

savepoint human_edit;
update public.lessons set title='Human edit', updated_by=auth.uid() where id=(select lesson_id from public.content_import_bindings where editorial_id='AN-01-A1');
select throws_ok($$select public.apply_content_import(current_setting('test.import_bundle')::jsonb,public.preview_content_import(current_setting('test.import_bundle')::jsonb)->>'expectedState')$$,'40001',null,'human changes conflict even when source unchanged');
rollback to human_edit;

savepoint free_update;
-- Simulate an already-bound free lesson at its acknowledged editorial baseline.
update public.lessons set access_level='free',updated_by=auth.uid() where slug='an-01-a1';
update public.content_import_bindings set imported_state_hash=private.content_import_lesson_hash(lesson_id) where editorial_id='AN-01-A1';
select set_config('test.free_bundle',jsonb_set(current_setting('test.import_bundle')::jsonb,'{lessons,0,title}','"Updated free lesson"')::text,true);
select lives_ok($$select public.apply_content_import(current_setting('test.free_bundle')::jsonb,public.preview_content_import(current_setting('test.free_bundle')::jsonb)->>'expectedState')$$,'bound draft/review content can update');
select is((select access_level::text from public.lessons where slug='an-01-a1'),'free','bound free lesson remains free');
select is((select count(*) from public.lesson_blocks where deleted_at is not null),1::bigint,'old blocks retained by soft deletion');
rollback to free_update;

select set_config('test.publish_state',public.preview_content_import(current_setting('test.import_bundle')::jsonb)->>'expectedState',true);
select lives_ok($$select public.publish_content_import((current_setting('test.applied')::jsonb->>'batchId')::uuid,current_setting('test.publish_state'))$$,'publish complete batch');
select is((select count(*) from public.lessons where status='published'),83::bigint,'atomic publication');
select lives_ok($$select public.publish_content_import((current_setting('test.applied')::jsonb->>'batchId')::uuid,current_setting('test.publish_state'))$$,'publish retry idempotent');
select set_config('test.changed_bundle',jsonb_set(current_setting('test.import_bundle')::jsonb,'{lessons,0,title}','"Changed published lesson"')::text,true);
select throws_ok($$select public.apply_content_import(current_setting('test.changed_bundle')::jsonb,public.preview_content_import(current_setting('test.changed_bundle')::jsonb)->>'expectedState')$$,'40001',null,'published edits rejected');

reset role;
insert into public.subscriptions(user_id,state,access_until) values('90000000-0000-4000-8000-000000000002','active',now()+interval '1 day');
set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000002',true);
insert into public.lesson_progress(user_id,lesson_id,seconds,completed_at) select auth.uid(),id,90,now() from public.lessons where slug='an-01-a1';
insert into public.favorites(user_id,lesson_id) select auth.uid(),id from public.lessons where slug='an-01-a1';
select set_config('test.progress',(select to_jsonb(p)::text from public.lesson_progress p),true);
select set_config('test.favorite',(select to_jsonb(f)::text from public.favorites f),true);
select is((select count(*) from public.lesson_blocks where deleted_at is null),83::bigint,'subscriber reads imported bodies');
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.apply_content_import(current_setting('test.import_bundle')::jsonb,public.preview_content_import(current_setting('test.import_bundle')::jsonb)->>'expectedState')$$,'unchanged published reimport allowed');
reset role;
update public.subscriptions set state='expired',access_until=now()-interval '1 day' where user_id='90000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000002',true);
select is((select count(*) from public.lesson_blocks),0::bigint,'expired subscriber cannot query premium bodies');
select is((select to_jsonb(p)::text from public.lesson_progress p),current_setting('test.progress'),'reimport and expiry preserve progress');
select is((select to_jsonb(f)::text from public.favorites f),current_setting('test.favorite'),'reimport and expiry preserve favorites');
select is((select count(*) from public.content_import_batches),0::bigint,'students cannot read batch body copies');
select is((select count(*) from public.content_import_bindings),0::bigint,'students cannot read bindings');

select * from finish();
rollback;

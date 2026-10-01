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

select set_config('test.publish_state',public.preview_content_import(current_setting('test.import_bundle')::jsonb)->>'expectedState',true);
select lives_ok($$select public.publish_content_import((current_setting('test.applied')::jsonb->>'batchId')::uuid,current_setting('test.publish_state'))$$,'publish complete batch');
select is((select count(*) from public.lessons where status='published'),83::bigint,'atomic publication');
select lives_ok($$select public.publish_content_import((current_setting('test.applied')::jsonb->>'batchId')::uuid,current_setting('test.publish_state'))$$,'publish retry idempotent');
select set_config('test.changed_bundle',jsonb_set(current_setting('test.import_bundle')::jsonb,'{lessons,0,title}','"Changed published lesson"')::text,true);
select throws_ok($$select public.apply_content_import(current_setting('test.changed_bundle')::jsonb,public.preview_content_import(current_setting('test.changed_bundle')::jsonb)->>'expectedState')$$,'40001',null,'published edits rejected');

select * from finish();
rollback;

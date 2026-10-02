-- Import operations are administrative, invoker-only and transactional.
create table public.content_import_batches (
  id uuid primary key default gen_random_uuid(),
  digest text not null,
  state text not null default 'review' check (state in ('review','published')),
  actor_id uuid not null references auth.users(id) on delete restrict,
  counts jsonb not null,
  bundle jsonb not null,
  members jsonb not null default '{}'::jsonb,
  publish_state text,
  created_at timestamptz not null default now()
);
create table public.content_import_bindings (
  editorial_id text primary key,
  lesson_id uuid not null unique references public.lessons(id) on delete restrict,
  source_hash text not null,
  payload_hash text not null,
  imported_state_hash text not null,
  batch_id uuid not null references public.content_import_batches(id) on delete restrict
);
create index content_import_bindings_batch_idx on public.content_import_bindings(batch_id);
create index content_import_batches_actor_idx on public.content_import_batches(actor_id);
alter table public.content_import_batches enable row level security;
alter table public.content_import_bindings enable row level security;
revoke all on public.content_import_batches, public.content_import_bindings from anon, authenticated;
grant select, insert, update on public.content_import_batches, public.content_import_bindings to authenticated;
create policy "staff import batches" on public.content_import_batches for all to authenticated
using (public.has_role('editor') or public.has_role('admin'))
with check (public.has_role('editor') or public.has_role('admin'));
create policy "staff import bindings" on public.content_import_bindings for all to authenticated
using (public.has_role('editor') or public.has_role('admin'))
with check (public.has_role('editor') or public.has_role('admin'));

create function private.content_import_hash(value jsonb) returns text
language sql immutable security invoker set search_path = '' as $$
  select encode(sha256(convert_to(value::text,'UTF8')),'hex');
$$;
create function private.content_import_authorize() returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or not (public.has_role('editor') or public.has_role('admin')) then
    raise exception 'Editor session required' using errcode = '42501';
  end if;
end;
$$;
create function private.content_import_lesson_hash(lesson uuid) returns text
language sql stable security invoker set search_path = '' as $$
  select private.content_import_hash(jsonb_build_object('lesson',to_jsonb(l),
    'module',to_jsonb(m),'discipline',to_jsonb(d),'cycle',to_jsonb(c),
    'blocks',coalesce((select jsonb_agg(to_jsonb(b) order by b.id) from public.lesson_blocks b where b.lesson_id=l.id),'[]'::jsonb)))
  from public.lessons l join public.modules m on m.id=l.module_id
  join public.disciplines d on d.id=m.discipline_id join public.cycles c on c.id=d.cycle_id
  where l.id=lesson;
$$;
-- Conservative catalog-wide token also detects inserts/collisions between preview and apply.
create function private.content_import_state() returns text
language sql stable security invoker set search_path = '' as $$
  select private.content_import_hash(jsonb_build_array(
    (select jsonb_agg(to_jsonb(c) order by c.id) from public.cycles c),
    (select jsonb_agg(to_jsonb(d) order by d.id) from public.disciplines d),
    (select jsonb_agg(to_jsonb(m) order by m.id) from public.modules m),
    (select jsonb_agg(to_jsonb(l) order by l.id) from public.lessons l),
    (select jsonb_agg(to_jsonb(b) order by b.id) from public.lesson_blocks b),
    (select jsonb_agg(to_jsonb(i) order by i.editorial_id) from public.content_import_bindings i)));
$$;
create function private.validate_content_import(bundle jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare item jsonb; block jsonb; field text;
begin
  if jsonb_typeof(bundle) is distinct from 'object' or bundle->>'version' is distinct from '0.3'
    or coalesce(bundle->>'digest','') !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(bundle->'lessons') is distinct from 'array' then
    raise exception 'Invalid bundle' using errcode='22023';
  end if;
  if jsonb_array_length(bundle->'lessons') <> 83 then
    raise exception 'Expected 83 lessons' using errcode='22023';
  end if;
  for item in select value from jsonb_array_elements(bundle->'lessons') loop
    foreach field in array array['editorialId','moduleId','moduleTitle','disciplineCode','disciplineTitle','title','summary','sourcePath','sourceHash'] loop
      if jsonb_typeof(item->field) is distinct from 'string' or length(trim(item->>field))=0 then
        raise exception 'Invalid lesson field: %',field using errcode='22023';
      end if;
    end loop;
    if item->>'disciplineCode' <> all(array['AN','BQ','CH','EB','EG','FG','FI','HC','IM','MP','PG','SH'])
      or item->>'moduleId' !~ ('^' || (item->>'disciplineCode') || '-0[1-6]$')
      or item->>'editorialId' !~ ('^' || (item->>'moduleId') || '-A[1-9][0-9]*$')
      or jsonb_typeof(item->'position') is distinct from 'number'
      or coalesce(item->>'position','') !~ '^[1-9][0-9]{0,3}$'
      or item->>'editorialId' <> (item->>'moduleId') || '-A' || (item->>'position')
      or length(item->>'title') not between 2 and 180
      or length(item->>'moduleTitle') not between 2 and 160
      or length(item->>'disciplineTitle') not between 2 and 120
      or item->>'sourceHash' !~ '^[a-f0-9]{64}$'
      or (item->>'sourcePath' !~ '^content/ciclo-basico/[A-Za-z0-9_./-]+\.md$'
          and item->>'sourcePath' <> 'content/drafts/biologia-celular-divisao-celular.md')
      or item->>'sourcePath' like '%..%'
      or jsonb_typeof(item->'blocks') is distinct from 'array' then
      raise exception 'Invalid lesson schema' using errcode='22023';
    end if;
    if jsonb_array_length(item->'blocks')=0 then raise exception 'Empty lesson' using errcode='22023'; end if;
    for block in select value from jsonb_array_elements(item->'blocks') loop
      if coalesce(block->>'block_type','') not in ('heading','rich_text','callout')
        or jsonb_typeof(block->'content'->'text') is distinct from 'string'
        or length(trim(block->'content'->>'text'))=0
        or (block->'content' ? 'format' and block->'content'->>'format' is distinct from 'medhelp-markdown-v1')
        or jsonb_typeof(block->'position') is distinct from 'number'
        or coalesce(block->>'position','') !~ '^[0-9]{1,6}$' then
        raise exception 'Invalid block' using errcode='22023';
      end if;
    end loop;
    if (select count(distinct value->>'position') from jsonb_array_elements(item->'blocks')) <> jsonb_array_length(item->'blocks') then
      raise exception 'Duplicate block positions' using errcode='22023';
    end if;
  end loop;
  if (select count(distinct value->>'editorialId') from jsonb_array_elements(bundle->'lessons')) <> 83
    or (select count(distinct value->>'moduleId') from jsonb_array_elements(bundle->'lessons')) <> 72
    or (select count(distinct value->>'disciplineCode') from jsonb_array_elements(bundle->'lessons')) <> 12
    or exists(select 1 from jsonb_array_elements(bundle->'lessons') group by value->>'moduleId' having count(distinct value->>'moduleTitle')>1)
    or exists(select 1 from jsonb_array_elements(bundle->'lessons') group by value->>'disciplineCode' having count(distinct value->>'disciplineTitle')>1) then
    raise exception 'Invalid catalog counts or inconsistent metadata' using errcode='22023';
  end if;
end;
$$;

create function public.preview_content_import(bundle jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare item jsonb; binding public.content_import_bindings; lesson public.lessons;
  creates int:=0; updates int:=0; unchanged int:=0; conflicts jsonb:='[]';
  reason text; cycle uuid; discipline public.disciplines; module public.modules;
begin
  perform private.content_import_authorize();
  perform private.validate_content_import(bundle);
  select id into cycle from public.cycles where slug='basico' and deleted_at is null;
  if cycle is null then raise exception 'Basic cycle not found' using errcode='22023'; end if;
  for item in select value from jsonb_array_elements(bundle->'lessons') loop
    reason:=null;
    select * into binding from public.content_import_bindings where editorial_id=item->>'editorialId';
    if binding.lesson_id is not null then
      select * into lesson from public.lessons where id=binding.lesson_id;
      if private.content_import_lesson_hash(binding.lesson_id) is distinct from binding.imported_state_hash
        or lesson.deleted_at is not null then reason:='manual_change';
      elsif binding.payload_hash=private.content_import_hash(item) then unchanged:=unchanged+1;
      elsif lesson.status not in ('draft','review') then reason:='published_or_archived';
      else updates:=updates+1;
      end if;
    else
      select * into discipline from public.disciplines where cycle_id=cycle and slug=lower(item->>'disciplineCode');
      select * into module from public.modules where discipline_id=discipline.id and slug=lower(item->>'moduleId');
      if (discipline.id is not null and (discipline.deleted_at is not null or discipline.title<>item->>'disciplineTitle'))
        or (module.id is not null and (module.deleted_at is not null or module.title<>item->>'moduleTitle'))
        or exists(select 1 from public.lessons where module_id=module.id and slug=lower(item->>'editorialId')) then
        reason:='unbound_slug_collision';
      else creates:=creates+1;
      end if;
    end if;
    if reason is not null then conflicts:=conflicts || jsonb_build_array(jsonb_build_object('editorialId',item->>'editorialId','reason',reason)); end if;
  end loop;
  return jsonb_build_object('digest',bundle->>'digest','create',creates,'update',updates,'unchanged',unchanged,
    'conflicts',conflicts,'expectedState',private.content_import_state());
end;
$$;

create function public.apply_content_import(bundle jsonb, expected_state text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare report jsonb; item jsonb; block jsonb; binding public.content_import_bindings;
  batch uuid; cycle uuid; discipline uuid; module uuid; lesson uuid; batch_members jsonb:='{}';
begin
  perform private.content_import_authorize();
  -- Table locks cover edits from the existing editor as well as other imports,
  -- including phantom inserts of blocks and unbound slug collisions.
  lock table public.cycles, public.disciplines, public.modules, public.lessons,
    public.lesson_blocks, public.content_import_bindings, public.content_import_batches in share row exclusive mode;
  report:=public.preview_content_import(bundle);
  if expected_state is distinct from report->>'expectedState' or jsonb_array_length(report->'conflicts')>0 then
    raise exception 'Import conflict; obtain a new preview and reconcile changes' using errcode='40001';
  end if;
  insert into public.content_import_batches(digest,actor_id,counts,bundle)
    values(bundle->>'digest',auth.uid(),report - 'expectedState' - 'conflicts',bundle) returning id into batch;
  select id into cycle from public.cycles where slug='basico' and deleted_at is null;
  for item in select value from jsonb_array_elements(bundle->'lessons') loop
    select * into binding from public.content_import_bindings where editorial_id=item->>'editorialId';
    lesson:=binding.lesson_id;
    if lesson is null then
      select id into discipline from public.disciplines where cycle_id=cycle and slug=lower(item->>'disciplineCode');
      if discipline is null then
        insert into public.disciplines(cycle_id,slug,title) values(cycle,lower(item->>'disciplineCode'),item->>'disciplineTitle') returning id into discipline;
      end if;
      select id into module from public.modules where discipline_id=discipline and slug=lower(item->>'moduleId');
      if module is null then
        insert into public.modules(discipline_id,slug,title,position) values(discipline,lower(item->>'moduleId'),item->>'moduleTitle',right(item->>'moduleId',2)::int) returning id into module;
      end if;
      insert into public.lessons(module_id,slug,title,summary,position,created_by,updated_by)
        values(module,lower(item->>'editorialId'),item->>'title',item->>'summary',(item->>'position')::int,auth.uid(),auth.uid()) returning id into lesson;
    end if;
    if binding.lesson_id is null or binding.payload_hash<>private.content_import_hash(item) then
      -- Parent metadata changes require editorial reconciliation, not a silent shared-parent rewrite.
      if exists(select 1 from public.lessons l join public.modules m on m.id=l.module_id join public.disciplines d on d.id=m.discipline_id
        where l.id=lesson and (m.slug<>lower(item->>'moduleId') or m.title<>item->>'moduleTitle' or d.slug<>lower(item->>'disciplineCode') or d.title<>item->>'disciplineTitle')) then
        raise exception 'Parent metadata conflict' using errcode='40001';
      end if;
      update public.lesson_blocks set deleted_at=now() where lesson_id=lesson and deleted_at is null;
      for block in select value from jsonb_array_elements(item->'blocks') loop
        insert into public.lesson_blocks(lesson_id,block_type,content,position)
          values(lesson,(block->>'block_type')::public.lesson_block_type,block->'content',(block->>'position')::int);
      end loop;
      update public.lessons set title=item->>'title',summary=item->>'summary',position=(item->>'position')::int,status='review',updated_by=auth.uid() where id=lesson;
      insert into public.content_import_bindings(editorial_id,lesson_id,source_hash,payload_hash,imported_state_hash,batch_id)
        values(item->>'editorialId',lesson,item->>'sourceHash',private.content_import_hash(item),private.content_import_lesson_hash(lesson),batch)
        on conflict (editorial_id) do update set source_hash=excluded.source_hash,payload_hash=excluded.payload_hash,
          imported_state_hash=excluded.imported_state_hash,batch_id=excluded.batch_id;
    end if;
    batch_members:=batch_members || jsonb_build_object(lesson::text,private.content_import_lesson_hash(lesson));
  end loop;
  update public.content_import_batches set members=batch_members where id=batch;
  return jsonb_build_object('batchId',batch,'create',report->'create','update',report->'update','unchanged',report->'unchanged');
end;
$$;

create function public.publish_content_import(batch_id uuid, expected_state text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare batch public.content_import_batches; member record; published_members jsonb:='{}';
begin
  perform private.content_import_authorize();
  lock table public.cycles, public.disciplines, public.modules, public.lessons,
    public.lesson_blocks, public.content_import_bindings, public.content_import_batches in share row exclusive mode;
  select * into batch from public.content_import_batches where id=batch_id;
  if batch.id is null then raise exception 'Batch not found' using errcode='22023'; end if;
  if (batch.state='review' and expected_state is distinct from private.content_import_state())
    or (batch.state='published' and expected_state is distinct from batch.publish_state) then
    raise exception 'Stale publication preview' using errcode='40001';
  end if;
  for member in select * from jsonb_each_text(batch.members) loop
    if private.content_import_lesson_hash(member.key::uuid) is distinct from member.value
      or not exists(select 1 from public.lessons where id=member.key::uuid and deleted_at is null
        and status=(case when batch.state='published' then 'published' else 'review' end)::public.content_status) then
      raise exception 'Batch changed; publication aborted' using errcode='40001';
    end if;
  end loop;
  if batch.state='published' then return jsonb_build_object('batchId',batch.id,'state','published'); end if;
  for member in select * from jsonb_each_text(batch.members) loop
    update public.lessons set status='published',updated_by=auth.uid() where id=member.key::uuid;
    update public.content_import_bindings set imported_state_hash=private.content_import_lesson_hash(member.key::uuid) where lesson_id=member.key::uuid;
    published_members:=published_members || jsonb_build_object(member.key,private.content_import_lesson_hash(member.key::uuid));
  end loop;
  update public.content_import_batches set state='published',publish_state=expected_state,members=published_members where id=batch.id;
  return jsonb_build_object('batchId',batch.id,'state','published');
end;
$$;

revoke all on function private.content_import_hash(jsonb), private.content_import_authorize(),
  private.content_import_lesson_hash(uuid), private.content_import_state(), private.validate_content_import(jsonb),
  public.preview_content_import(jsonb), public.apply_content_import(jsonb,text), public.publish_content_import(uuid,text) from public, anon, authenticated;
grant execute on function private.content_import_hash(jsonb), private.content_import_authorize(),
  private.content_import_lesson_hash(uuid), private.content_import_state(), private.validate_content_import(jsonb),
  public.preview_content_import(jsonb), public.apply_content_import(jsonb,text), public.publish_content_import(uuid,text) to authenticated;

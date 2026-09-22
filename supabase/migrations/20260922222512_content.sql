create type public.content_status as enum ('draft', 'review', 'published', 'archived');
create type public.access_level as enum ('free', 'premium');
create type public.lesson_block_type as enum ('heading', 'rich_text', 'image', 'video', 'callout', 'quiz');

create table public.cycles (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.disciplines (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 2 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (cycle_id, slug)
);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  discipline_id uuid not null references public.disciplines(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 2 and 160),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (discipline_id, slug)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 2 and 180),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text,
  status public.content_status not null default 'draft',
  access_level public.access_level not null default 'premium',
  position integer not null default 0 check (position >= 0),
  scheduled_for timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (module_id, slug),
  constraint lessons_publication_dates check (
    (status <> 'published' or published_at is not null)
    and (status <> 'archived' or archived_at is not null)
  )
);

create table public.lesson_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  block_type public.lesson_block_type not null,
  content jsonb not null default '{}'::jsonb,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  object_key text not null unique check (object_key ~ '^content/[A-Za-z0-9-]+/[A-Za-z0-9._-]+$'),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  access_level public.access_level not null default 'premium',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.summaries (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  body text not null check (char_length(trim(body)) > 0),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.content_relations (
  source_lesson_id uuid not null references public.lessons(id) on delete cascade,
  target_lesson_id uuid not null references public.lessons(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  primary key (source_lesson_id, target_lesson_id),
  constraint content_relations_no_self_reference check (source_lesson_id <> target_lesson_id)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz not null default now()
);

create table public.content_tags (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (lesson_id, tag_id)
);

create index disciplines_cycle_position_idx on public.disciplines (cycle_id, position) where deleted_at is null;
create index modules_discipline_position_idx on public.modules (discipline_id, position) where deleted_at is null;
create index lessons_module_position_idx on public.lessons (module_id, position) where deleted_at is null;
create index lessons_publication_idx on public.lessons (status, scheduled_for, published_at) where deleted_at is null;
create index lesson_blocks_lesson_position_idx on public.lesson_blocks (lesson_id, position) where deleted_at is null;
create index attachments_lesson_idx on public.attachments (lesson_id) where deleted_at is null;

create trigger cycles_set_updated_at before update on public.cycles
for each row execute function public.set_updated_at();
create trigger disciplines_set_updated_at before update on public.disciplines
for each row execute function public.set_updated_at();
create trigger modules_set_updated_at before update on public.modules
for each row execute function public.set_updated_at();
create trigger lessons_set_updated_at before update on public.lessons
for each row execute function public.set_updated_at();
create trigger lesson_blocks_set_updated_at before update on public.lesson_blocks
for each row execute function public.set_updated_at();
create trigger summaries_set_updated_at before update on public.summaries
for each row execute function public.set_updated_at();

create or replace function public.validate_lesson_status_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = old.status then
    if new.status = 'published' and new.scheduled_for is distinct from old.scheduled_for then
      new.published_at = coalesce(new.scheduled_for, now());
    end if;
    return new;
  end if;

  if old.status = 'archived' and new.status <> 'draft' then
    raise exception 'Archived content must return to draft' using errcode = '23514';
  end if;

  if not (
    (old.status = 'draft' and new.status = 'review') or
    (old.status = 'review' and new.status in ('draft', 'published')) or
    (old.status = 'published' and new.status = 'archived') or
    (old.status = 'archived' and new.status = 'draft')
  ) then
    raise exception 'Invalid content status transition: % -> %', old.status, new.status using errcode = '23514';
  end if;

  if new.status = 'published' then
    new.published_at = coalesce(new.scheduled_for, now());
    new.archived_at = null;
  elsif new.status = 'archived' then
    new.archived_at = now();
  elsif new.status = 'draft' then
    new.published_at = null;
    new.archived_at = null;
  end if;

  return new;
end;
$$;

create trigger lessons_validate_status_transition
before update of status, scheduled_for on public.lessons
for each row execute function public.validate_lesson_status_transition();

create or replace function public.protect_lesson_attribution()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.created_by <> old.created_by then
    raise exception 'Lesson creator cannot be changed' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger lessons_protect_attribution
before update of created_by on public.lessons
for each row execute function public.protect_lesson_attribution();

create or replace function public.audit_content_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_id text;
begin
  row_id := coalesce(
    to_jsonb(new) ->> 'id',
    to_jsonb(old) ->> 'id',
    nullif(concat_ws(':', to_jsonb(new) ->> 'source_lesson_id', to_jsonb(new) ->> 'target_lesson_id'), ''),
    nullif(concat_ws(':', to_jsonb(old) ->> 'source_lesson_id', to_jsonb(old) ->> 'target_lesson_id'), ''),
    nullif(concat_ws(':', to_jsonb(new) ->> 'lesson_id', to_jsonb(new) ->> 'tag_id'), ''),
    nullif(concat_ws(':', to_jsonb(old) ->> 'lesson_id', to_jsonb(old) ->> 'tag_id'), '')
  );
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    row_id,
    jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
  );
  return coalesce(new, old);
end;
$$;

revoke all on function public.audit_content_mutation() from public;

create trigger cycles_audit after insert or update or delete on public.cycles
for each row execute function public.audit_content_mutation();
create trigger disciplines_audit after insert or update or delete on public.disciplines
for each row execute function public.audit_content_mutation();
create trigger modules_audit after insert or update or delete on public.modules
for each row execute function public.audit_content_mutation();
create trigger lessons_audit after insert or update or delete on public.lessons
for each row execute function public.audit_content_mutation();
create trigger lesson_blocks_audit after insert or update or delete on public.lesson_blocks
for each row execute function public.audit_content_mutation();
create trigger attachments_audit after insert or update or delete on public.attachments
for each row execute function public.audit_content_mutation();
create trigger summaries_audit after insert or update or delete on public.summaries
for each row execute function public.audit_content_mutation();
create trigger content_relations_audit after insert or update or delete on public.content_relations
for each row execute function public.audit_content_mutation();
create trigger tags_audit after insert or update or delete on public.tags
for each row execute function public.audit_content_mutation();
create trigger content_tags_audit after insert or update or delete on public.content_tags
for each row execute function public.audit_content_mutation();

create or replace function public.has_active_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    exists (
      select 1 from public.subscriptions
      where user_id = (select auth.uid())
        and state in ('active', 'grace', 'canceled')
        and access_until > now()
    )
    or exists (
      select 1 from public.access_grants
      where user_id = (select auth.uid())
        and starts_at <= now()
        and ends_at > now()
        and revoked_at is null
    )
  );
$$;

revoke all on function public.has_active_access() from public;
grant execute on function public.has_active_access() to anon, authenticated;

alter table public.cycles enable row level security;
alter table public.disciplines enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_blocks enable row level security;
alter table public.attachments enable row level security;
alter table public.summaries enable row level security;
alter table public.content_relations enable row level security;
alter table public.tags enable row level security;
alter table public.content_tags enable row level security;

revoke all on public.cycles, public.disciplines, public.modules, public.lessons,
  public.lesson_blocks, public.attachments, public.summaries, public.content_relations,
  public.tags, public.content_tags from anon, authenticated;

grant select on public.cycles, public.disciplines, public.modules, public.lessons,
  public.lesson_blocks, public.attachments, public.summaries, public.content_relations,
  public.tags, public.content_tags to anon, authenticated;
grant insert, update, delete on public.cycles, public.disciplines, public.modules, public.lessons,
  public.lesson_blocks, public.attachments, public.summaries, public.content_relations,
  public.tags, public.content_tags to authenticated;

create policy "public reads active cycles" on public.cycles for select
using (deleted_at is null);
create policy "public reads active disciplines" on public.disciplines for select
using (deleted_at is null);
create policy "public reads active modules" on public.modules for select
using (deleted_at is null);
create policy "public reads released lessons" on public.lessons for select
using (deleted_at is null and status = 'published' and published_at <= now());
create policy "public reads released lesson blocks" on public.lesson_blocks for select
using (
  deleted_at is null and exists (
    select 1 from public.lessons
    where lessons.id = lesson_blocks.lesson_id
      and lessons.deleted_at is null
      and lessons.status = 'published'
      and lessons.published_at <= now()
      and (lessons.access_level = 'free' or (select public.has_active_access()))
  )
);
create policy "members read authorized released attachments" on public.attachments for select
using (
  deleted_at is null and exists (
    select 1 from public.lessons
    where lessons.id = attachments.lesson_id
      and lessons.deleted_at is null
      and lessons.status = 'published'
      and lessons.published_at <= now()
      and (
        (lessons.access_level = 'free' and attachments.access_level = 'free')
        or (select public.has_active_access())
      )
  )
);
create policy "public reads released summaries" on public.summaries for select
using (
  deleted_at is null and exists (
    select 1 from public.lessons
    where lessons.id = summaries.lesson_id
      and lessons.deleted_at is null
      and lessons.status = 'published'
      and lessons.published_at <= now()
      and (lessons.access_level = 'free' or (select public.has_active_access()))
  )
);
create policy "public reads tags" on public.tags for select using (true);
create policy "public reads released content tags" on public.content_tags for select
using (exists (
  select 1 from public.lessons
  where lessons.id = content_tags.lesson_id
    and lessons.deleted_at is null
    and lessons.status = 'published'
    and lessons.published_at <= now()
));
create policy "public reads released relations" on public.content_relations for select
using (exists (
  select 1 from public.lessons source, public.lessons target
  where source.id = content_relations.source_lesson_id
    and target.id = content_relations.target_lesson_id
    and source.deleted_at is null and target.deleted_at is null
    and source.status = 'published' and target.status = 'published'
    and source.published_at <= now() and target.published_at <= now()
));

create policy "staff reads all cycles" on public.cycles for select to authenticated
using ((select public.has_role('editor')) or (select public.has_role('admin')));
create policy "staff reads all disciplines" on public.disciplines for select to authenticated
using ((select public.has_role('editor')) or (select public.has_role('admin')));
create policy "staff reads all modules" on public.modules for select to authenticated
using ((select public.has_role('editor')) or (select public.has_role('admin')));
create policy "staff reads all lessons" on public.lessons for select to authenticated
using ((select public.has_role('editor')) or (select public.has_role('admin')));
create policy "staff reads all lesson blocks" on public.lesson_blocks for select to authenticated
using ((select public.has_role('editor')) or (select public.has_role('admin')));
create policy "staff reads all attachments" on public.attachments for select to authenticated
using ((select public.has_role('editor')) or (select public.has_role('admin')));
create policy "staff reads all summaries" on public.summaries for select to authenticated
using ((select public.has_role('editor')) or (select public.has_role('admin')));
create policy "staff reads all relations" on public.content_relations for select to authenticated
using ((select public.has_role('editor')) or (select public.has_role('admin')));
create policy "staff manages cycles" on public.cycles for all to authenticated
using ((select public.has_role('editor')) or (select public.has_role('admin')))
with check ((select public.has_role('editor')) or (select public.has_role('admin')));
create policy "staff manages disciplines" on public.disciplines for all to authenticated
using ((select public.has_role('editor')) or (select public.has_role('admin')))
with check ((select public.has_role('editor')) or (select public.has_role('admin')));
create policy "staff manages modules" on public.modules for all to authenticated
using ((select public.has_role('editor')) or (select public.has_role('admin')))
with check ((select public.has_role('editor')) or (select public.has_role('admin')));
create policy "staff creates lessons" on public.lessons for insert to authenticated
with check (
  ((select public.has_role('editor')) or (select public.has_role('admin')))
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
  and status = 'draft'
  and published_at is null
  and archived_at is null
);
create policy "staff updates lessons" on public.lessons for update to authenticated
using ((select public.has_role('editor')) or (select public.has_role('admin')))
with check (
  ((select public.has_role('editor')) or (select public.has_role('admin')))
  and updated_by = (select auth.uid())
);
create policy "staff deletes lessons" on public.lessons for delete to authenticated
using ((select public.has_role('editor')) or (select public.has_role('admin')));
create policy "staff manages lesson blocks" on public.lesson_blocks for all to authenticated
using ((select public.has_role('editor')) or (select public.has_role('admin')))
with check ((select public.has_role('editor')) or (select public.has_role('admin')));
create policy "staff manages attachments" on public.attachments for all to authenticated
using ((select public.has_role('editor')) or (select public.has_role('admin')))
with check (
  ((select public.has_role('editor')) or (select public.has_role('admin')))
  and created_by = (select auth.uid())
);
create policy "staff manages summaries" on public.summaries for all to authenticated
using ((select public.has_role('editor')) or (select public.has_role('admin')))
with check ((select public.has_role('editor')) or (select public.has_role('admin')));
create policy "staff manages relations" on public.content_relations for all to authenticated
using ((select public.has_role('editor')) or (select public.has_role('admin')))
with check ((select public.has_role('editor')) or (select public.has_role('admin')));
create policy "staff manages tags" on public.tags for all to authenticated
using ((select public.has_role('editor')) or (select public.has_role('admin')))
with check ((select public.has_role('editor')) or (select public.has_role('admin')));
create policy "staff manages content tags" on public.content_tags for all to authenticated
using ((select public.has_role('editor')) or (select public.has_role('admin')))
with check ((select public.has_role('editor')) or (select public.has_role('admin')));

insert into public.cycles (title, slug, description, position) values
  ('Ciclo Básico', 'basico', 'Fundamentos para construir raciocínio clínico.', 0),
  ('Ciclo Clínico', 'clinico', 'Conteúdo orientado à prática e tomada de decisão.', 1),
  ('Internato', 'internato', 'Preparação para assistência supervisionada.', 2);

-- Rights-aware ebook library (platform plan Task 10).
-- Ebooks reuse the existing content_status/access_level enums and the
-- private.has_role / private.has_active_access helpers introduced by the
-- identity/content/security-hardening migrations.

create type public.ebook_license_type as enum (
  'dominio_publico',
  'creative_commons',
  'licenca_institucional'
);

create table public.ebooks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 180),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  author text not null check (char_length(trim(author)) between 2 and 180),
  description text,
  source text not null check (char_length(trim(source)) between 2 and 280),
  license_type public.ebook_license_type,
  license_url text check (license_url is null or license_url ~ '^https://'),
  cover_object_key text check (cover_object_key is null or cover_object_key ~ '^content/[A-Za-z0-9-]+/[A-Za-z0-9._-]+$'),
  file_object_key text not null unique check (file_object_key ~ '^content/[A-Za-z0-9-]+/[A-Za-z0-9._-]+$'),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  access_level public.access_level not null default 'premium',
  status public.content_status not null default 'draft',
  position integer not null default 0 check (position >= 0),
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint ebooks_publication_dates check (
    (status <> 'published' or published_at is not null)
    and (status <> 'archived' or archived_at is not null)
  ),
  -- Database-level enforcement of "Ebooks cannot be published without rights
  -- metadata" (platform plan global constraint), independent of the UI/app layer.
  constraint ebooks_rights_metadata_required_to_publish check (
    status <> 'published' or (
      license_type is not null
      and license_url is not null and char_length(trim(license_url)) > 0
      and char_length(trim(author)) > 0
      and char_length(trim(source)) > 0
    )
  )
);

create index ebooks_published_idx on public.ebooks (status, published_at) where deleted_at is null;

create trigger ebooks_set_updated_at before update on public.ebooks
for each row execute function public.set_updated_at();

create or replace function public.validate_ebook_status_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = old.status then
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
    new.published_at = now();
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

create trigger ebooks_validate_status_transition
before update of status on public.ebooks
for each row execute function public.validate_ebook_status_transition();

create or replace function public.protect_ebook_attribution()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.created_by <> old.created_by then
    raise exception 'Ebook creator cannot be changed' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger ebooks_protect_attribution
before update of created_by on public.ebooks
for each row execute function public.protect_ebook_attribution();

alter table public.ebooks enable row level security;

revoke all on public.ebooks from anon, authenticated;
grant select on public.ebooks to anon, authenticated;
grant insert, update, delete on public.ebooks to authenticated;

-- Anonymous and student visitors only see ebooks they are entitled to read:
-- free released ebooks for everyone, premium ones only with active access.
-- Unlike the lesson catalog (which shows locked metadata as a teaser),
-- ebook rows include a direct storage object key, so premium rows are not
-- exposed at all to non-entitled readers (mirrors the existing
-- "members read authorized released attachments" policy for lesson media).
create policy "members read authorized released ebooks" on public.ebooks for select
using (
  deleted_at is null
  and status = 'published'
  and published_at <= now()
  and (access_level = 'free' or (select private.has_active_access()))
);

create policy "staff reads all ebooks" on public.ebooks for select to authenticated
using ((select private.has_role('editor')) or (select private.has_role('admin')));

create policy "staff creates ebooks" on public.ebooks for insert to authenticated
with check (
  ((select private.has_role('editor')) or (select private.has_role('admin')))
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
  and status = 'draft'
  and published_at is null
  and archived_at is null
);

create policy "staff updates ebooks" on public.ebooks for update to authenticated
using ((select private.has_role('editor')) or (select private.has_role('admin')))
with check (
  ((select private.has_role('editor')) or (select private.has_role('admin')))
  and updated_by = (select auth.uid())
);

create policy "staff deletes ebooks" on public.ebooks for delete to authenticated
using ((select private.has_role('editor')) or (select private.has_role('admin')));

create type public.app_role as enum ('student', 'editor', 'admin');
create type public.subscription_state as enum ('pending', 'active', 'grace', 'expired', 'canceled', 'refunded');
create type public.legal_document as enum ('terms', 'privacy');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  role public.app_role primary key,
  description text not null
);

insert into public.roles (role, description) values
  ('student', 'Acesso à experiência de estudos'),
  ('editor', 'Gestão de conteúdo acadêmico'),
  ('admin', 'Administração integral da plataforma');

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null references public.roles(role),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  state public.subscription_state not null default 'pending',
  provider_customer_id text,
  provider_subscription_id text,
  access_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_access_date_check check (
    state not in ('active', 'grace', 'canceled') or access_until is not null
  )
);

create unique index subscriptions_provider_subscription_id_key
  on public.subscriptions (provider_subscription_id)
  where provider_subscription_id is not null;

create table public.access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null check (char_length(trim(reason)) between 3 and 240),
  granted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint access_grants_valid_window check (ends_at > starts_at),
  constraint access_grants_revoke_after_start check (revoked_at is null or revoked_at >= starts_at)
);

create index access_grants_user_window_idx
  on public.access_grants (user_id, starts_at, ends_at);

create table public.legal_acceptances (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  document public.legal_document not null,
  version text not null check (char_length(trim(version)) between 1 and 40),
  accepted_at timestamptz not null default now(),
  unique (user_id, document, version)
);

create index legal_acceptances_user_idx on public.legal_acceptances (user_id, accepted_at desc);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(trim(action)) between 3 and 120),
  entity_type text not null check (char_length(trim(entity_type)) between 2 and 80),
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_created_idx on public.audit_logs (actor_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create or replace function public.has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = required_role
  );
$$;

revoke all on function public.has_role(public.app_role) from public;
grant execute on function public.has_role(public.app_role) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_name text;
  terms_version text;
  privacy_version text;
begin
  safe_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(coalesce(new.email, 'Estudante MEDHELP'), '@', 1)
  );

  if char_length(safe_name) < 2 then
    safe_name := 'Estudante MEDHELP';
  end if;

  insert into public.profiles (id, full_name) values (new.id, left(safe_name, 120));
  insert into public.user_roles (user_id, role) values (new.id, 'student');

  terms_version := nullif(trim(new.raw_user_meta_data ->> 'terms_version'), '');
  privacy_version := nullif(trim(new.raw_user_meta_data ->> 'privacy_version'), '');

  if terms_version is not null then
    insert into public.legal_acceptances (user_id, document, version)
    values (new.id, 'terms', left(terms_version, 40));
  end if;

  if privacy_version is not null then
    insert into public.legal_acceptances (user_id, document, version)
    values (new.id, 'privacy', left(privacy_version, 40));
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.access_grants enable row level security;
alter table public.legal_acceptances enable row level security;
alter table public.audit_logs enable row level security;

revoke all on public.profiles, public.roles, public.user_roles, public.subscriptions,
  public.access_grants, public.legal_acceptances, public.audit_logs from anon, authenticated;
revoke all on sequence public.legal_acceptances_id_seq, public.audit_logs_id_seq from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;
grant select, insert, update, delete on public.subscriptions to authenticated;
grant select, insert, update, delete on public.access_grants to authenticated;
grant select, insert on public.legal_acceptances to authenticated;
grant usage, select on sequence public.legal_acceptances_id_seq to authenticated;
grant select, insert on public.audit_logs to authenticated;
grant usage, select on sequence public.audit_logs_id_seq to authenticated;

create policy "profile owner reads self"
on public.profiles for select to authenticated
using (id = (select auth.uid()));

create policy "profile owner updates self"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "admin reads all profiles"
on public.profiles for select to authenticated
using ((select public.has_role('admin')));

create policy "admin updates profiles"
on public.profiles for update to authenticated
using ((select public.has_role('admin')))
with check ((select public.has_role('admin')));

create policy "users read own roles"
on public.user_roles for select to authenticated
using (user_id = (select auth.uid()));

create policy "admin manages roles"
on public.user_roles for all to authenticated
using ((select public.has_role('admin')))
with check ((select public.has_role('admin')));

create policy "students read own subscription"
on public.subscriptions for select to authenticated
using (
  user_id = (select auth.uid())
  and not (select public.has_role('editor'))
  and not (select public.has_role('admin'))
);

create policy "admin manages subscriptions"
on public.subscriptions for all to authenticated
using ((select public.has_role('admin')))
with check ((select public.has_role('admin')));

create policy "students read own access grants"
on public.access_grants for select to authenticated
using (
  user_id = (select auth.uid())
  and not (select public.has_role('editor'))
  and not (select public.has_role('admin'))
);

create policy "admin manages access grants"
on public.access_grants for all to authenticated
using ((select public.has_role('admin')))
with check ((select public.has_role('admin')));

create policy "users read own legal acceptances"
on public.legal_acceptances for select to authenticated
using (user_id = (select auth.uid()));

create policy "users record own legal acceptances"
on public.legal_acceptances for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "admin reads legal acceptances"
on public.legal_acceptances for select to authenticated
using ((select public.has_role('admin')));

create policy "admin reads audit logs"
on public.audit_logs for select to authenticated
using ((select public.has_role('admin')));

create policy "admin writes audit logs"
on public.audit_logs for insert to authenticated
with check (
  (select public.has_role('admin'))
  and actor_id = (select auth.uid())
);

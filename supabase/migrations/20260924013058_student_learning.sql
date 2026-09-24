create table public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  seconds integer not null default 0 check (seconds >= 0),
  completed_at timestamptz,
  last_studied_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index lesson_progress_recent_idx on public.lesson_progress (user_id, last_studied_at desc);

create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.study_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_count integer not null default 0 check (current_count >= 0),
  longest_count integer not null default 0 check (longest_count >= current_count),
  last_studied_on date,
  updated_at timestamptz not null default now()
);

alter table public.lesson_progress enable row level security;
alter table public.favorites enable row level security;
alter table public.study_streaks enable row level security;

revoke all on public.lesson_progress, public.favorites, public.study_streaks from anon, authenticated;
grant select, insert, update, delete on public.lesson_progress to authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select on public.study_streaks to authenticated;

create policy "students read own progress" on public.lesson_progress for select to authenticated
using (user_id = (select auth.uid()));

create policy "students add accessible progress" on public.lesson_progress for insert to authenticated
with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.lessons lesson
    where lesson.id = lesson_id and lesson.deleted_at is null
      and lesson.status = 'published' and lesson.published_at <= now()
      and (lesson.access_level = 'free' or (select private.has_active_access()))
  )
);

create policy "students update accessible progress" on public.lesson_progress for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.lessons lesson
    where lesson.id = lesson_id and lesson.deleted_at is null
      and lesson.status = 'published' and lesson.published_at <= now()
      and (lesson.access_level = 'free' or (select private.has_active_access()))
  )
);

create policy "students remove own progress" on public.lesson_progress for delete to authenticated
using (user_id = (select auth.uid()));

create policy "students read own favorites" on public.favorites for select to authenticated
using (user_id = (select auth.uid()));
create policy "students add accessible favorites" on public.favorites for insert to authenticated
with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.lessons lesson
    where lesson.id = lesson_id and lesson.deleted_at is null
      and lesson.status = 'published' and lesson.published_at <= now()
      and (lesson.access_level = 'free' or (select private.has_active_access()))
  )
);
create policy "students remove own favorites" on public.favorites for delete to authenticated
using (user_id = (select auth.uid()));
create policy "students read own streak" on public.study_streaks for select to authenticated
using (user_id = (select auth.uid()));

create function private.merge_lesson_progress()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.user_id := old.user_id;
    new.lesson_id := old.lesson_id;
    new.seconds := greatest(old.seconds, new.seconds);
    new.completed_at := coalesce(old.completed_at, case when new.completed_at is not null then now() end);
  elsif new.completed_at is not null then
    new.completed_at := now();
  end if;
  new.last_studied_at := now();
  return new;
end;
$$;

revoke all on function private.merge_lesson_progress() from public, anon, authenticated;
create trigger lesson_progress_monotonic before insert or update on public.lesson_progress
for each row execute function private.merge_lesson_progress();

create function private.record_study_day()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  study_day date := (now() at time zone 'UTC')::date;
begin
  if new.user_id is null then return new; end if;
  insert into public.study_streaks(user_id, current_count, longest_count, last_studied_on)
  values (new.user_id, 1, 1, study_day)
  on conflict (user_id) do update set
    current_count = case
      when public.study_streaks.last_studied_on = study_day then public.study_streaks.current_count
      when public.study_streaks.last_studied_on = study_day - 1 then public.study_streaks.current_count + 1
      else 1
    end,
    longest_count = greatest(public.study_streaks.longest_count, case
      when public.study_streaks.last_studied_on = study_day then public.study_streaks.current_count
      when public.study_streaks.last_studied_on = study_day - 1 then public.study_streaks.current_count + 1
      else 1
    end),
    last_studied_on = study_day,
    updated_at = now();
  return new;
end;
$$;

revoke all on function private.record_study_day() from public, anon, authenticated;
create trigger lesson_progress_study_day after insert or update on public.lesson_progress
for each row execute function private.record_study_day();

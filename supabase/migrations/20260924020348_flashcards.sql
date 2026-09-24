create type public.review_grade as enum ('again', 'hard', 'good', 'easy');

create table public.flashcard_decks (
  id uuid primary key default gen_random_uuid(),
  discipline_id uuid not null references public.disciplines(id) on delete restrict,
  lesson_id uuid references public.lessons(id) on delete set null,
  title text not null check (char_length(trim(title)) between 2 and 160),
  description text,
  status public.content_status not null default 'draft',
  access_level public.access_level not null default 'premium',
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  check (status <> 'published' or published_at is not null)
);

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.flashcard_decks(id) on delete cascade,
  front text not null check (char_length(trim(front)) between 1 and 2000),
  back text not null check (char_length(trim(back)) between 1 and 4000),
  explanation text,
  position integer not null default 0 check (position >= 0),
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index flashcards_deck_position_idx on public.flashcards (deck_id, position);

create table public.flashcard_schedules (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.flashcards(id) on delete cascade,
  repetitions integer not null default 0 check (repetitions >= 0),
  interval_days integer not null default 0 check (interval_days between 0 and 36500),
  ease_factor numeric(3,2) not null default 2.50 check (ease_factor between 1.30 and 3.00),
  due_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);
create index flashcard_schedules_due_idx on public.flashcard_schedules (user_id, due_at);

create table public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.flashcards(id) on delete cascade,
  event_id uuid not null,
  grade public.review_grade not null,
  reviewed_at timestamptz not null default now(),
  due_at timestamptz not null,
  repetitions integer not null,
  interval_days integer not null,
  ease_factor numeric(3,2) not null,
  unique (user_id, event_id)
);
create index flashcard_reviews_user_recent_idx on public.flashcard_reviews (user_id, reviewed_at desc);

alter table public.flashcard_decks enable row level security;
alter table public.flashcards enable row level security;
alter table public.flashcard_schedules enable row level security;
alter table public.flashcard_reviews enable row level security;

revoke all on public.flashcard_decks, public.flashcards, public.flashcard_schedules, public.flashcard_reviews from anon, authenticated;
grant select on public.flashcard_decks, public.flashcards to anon, authenticated;
grant insert, update, delete on public.flashcard_decks, public.flashcards to authenticated;
grant select on public.flashcard_schedules, public.flashcard_reviews to authenticated;

create policy "public reads released deck previews" on public.flashcard_decks for select
using (deleted_at is null and status = 'published' and published_at <= now());
create policy "members read accessible released cards" on public.flashcards for select
using (deleted_at is null and exists (
  select 1 from public.flashcard_decks deck
  where deck.id = flashcards.deck_id and deck.deleted_at is null
    and deck.status = 'published' and deck.published_at <= now()
    and (deck.access_level = 'free' or (select private.has_active_access()))
));
create policy "staff reads all decks" on public.flashcard_decks for select to authenticated
using ((select private.has_role('editor')) or (select private.has_role('admin')));
create policy "staff reads all cards" on public.flashcards for select to authenticated
using ((select private.has_role('editor')) or (select private.has_role('admin')));
create policy "staff manages decks" on public.flashcard_decks for all to authenticated
using ((select private.has_role('editor')) or (select private.has_role('admin')))
with check ((select private.has_role('editor')) or (select private.has_role('admin')));
create policy "staff manages cards" on public.flashcards for all to authenticated
using ((select private.has_role('editor')) or (select private.has_role('admin')))
with check ((select private.has_role('editor')) or (select private.has_role('admin')));
create policy "students read own schedules" on public.flashcard_schedules for select to authenticated
using (user_id = (select auth.uid()));
create policy "students read own reviews" on public.flashcard_reviews for select to authenticated
using (user_id = (select auth.uid()));

create function private.review_flashcard_internal(p_card_id uuid, p_grade public.review_grade, p_event_id uuid)
returns table(due_at timestamptz, repetitions integer, interval_days integer, ease_factor numeric, replayed boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_previous public.flashcard_schedules%rowtype;
  v_existing public.flashcard_reviews%rowtype;
  v_now timestamptz := now();
  v_ease numeric;
  v_interval integer;
  v_repetitions integer;
  v_due timestamptz;
begin
  if v_user is null or p_card_id is null or p_grade is null or p_event_id is null then
    raise exception 'Revisão inválida' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.flashcards card join public.flashcard_decks deck on deck.id = card.deck_id
    where card.id = p_card_id and card.deleted_at is null and deck.deleted_at is null
      and deck.status = 'published' and deck.published_at <= v_now
      and (deck.access_level = 'free' or private.has_active_access())
  ) then raise exception 'Cartão indisponível' using errcode = '42501'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':' || p_card_id::text, 0));
  select * into v_existing from public.flashcard_reviews
    where user_id = v_user and event_id = p_event_id;
  if found then
    if v_existing.card_id <> p_card_id or v_existing.grade <> p_grade then
      raise exception 'Identificador de revisão reutilizado' using errcode = '22023';
    end if;
    return query select v_existing.due_at, v_existing.repetitions, v_existing.interval_days, v_existing.ease_factor, true;
    return;
  end if;

  select * into v_previous from public.flashcard_schedules
    where user_id = v_user and card_id = p_card_id for update;
  v_ease := greatest(1.30, least(3.00, round(coalesce(v_previous.ease_factor, 2.50) +
    case p_grade when 'again' then -.20 when 'hard' then -.15 when 'easy' then .20 else 0 end, 2)));
  if p_grade = 'again' then
    v_repetitions := 0; v_interval := 0; v_due := v_now + interval '10 minutes';
  else
    v_repetitions := coalesce(v_previous.repetitions, 0) + 1;
    v_interval := case
      when coalesce(v_previous.interval_days, 0) = 0 then
        case p_grade when 'hard' then 1 when 'good' then 2 else 4 end
      when p_grade = 'hard' then greatest(1, round(v_previous.interval_days * 1.2)::integer)
      when p_grade = 'good' then greatest(2, round(v_previous.interval_days * v_previous.ease_factor)::integer)
      else greatest(4, round(v_previous.interval_days * (v_previous.ease_factor + .8))::integer)
    end;
    v_interval := least(v_interval, 36500);
    v_due := v_now + make_interval(days => v_interval);
  end if;

  insert into public.flashcard_schedules(user_id, card_id, repetitions, interval_days, ease_factor, due_at, updated_at)
    values (v_user, p_card_id, v_repetitions, v_interval, v_ease, v_due, v_now)
    on conflict (user_id, card_id) do update set repetitions = excluded.repetitions,
      interval_days = excluded.interval_days, ease_factor = excluded.ease_factor,
      due_at = excluded.due_at, updated_at = excluded.updated_at;
  insert into public.flashcard_reviews(user_id, card_id, event_id, grade, reviewed_at, due_at, repetitions, interval_days, ease_factor)
    values (v_user, p_card_id, p_event_id, p_grade, v_now, v_due, v_repetitions, v_interval, v_ease);
  return query select v_due, v_repetitions, v_interval, v_ease, false;
end;
$$;

revoke all on function private.review_flashcard_internal(uuid, public.review_grade, uuid) from public, anon, authenticated;
grant execute on function private.review_flashcard_internal(uuid, public.review_grade, uuid) to authenticated;

create function public.review_flashcard(p_card_id uuid, p_grade public.review_grade, p_event_id uuid)
returns table(due_at timestamptz, repetitions integer, interval_days integer, ease_factor numeric, replayed boolean)
language sql security invoker set search_path = '' as $$
  select * from private.review_flashcard_internal(p_card_id, p_grade, p_event_id);
$$;
revoke all on function public.review_flashcard(uuid, public.review_grade, uuid) from public, anon, authenticated;
grant execute on function public.review_flashcard(uuid, public.review_grade, uuid) to authenticated;

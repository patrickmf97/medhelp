-- Admin metrics: aggregate indicators for the administration dashboard (Task 13 /
-- "Painel administrativo" > "Indicadores"). Each aggregate reads across all users, so it
-- cannot run under the regular per-row RLS policies (e.g. lesson_progress and
-- flashcard_reviews only let a student read their own rows). Following the existing
-- has_role()/review_flashcard() pattern, the aggregation itself lives in a
-- security-definer function in the `private` schema that checks the caller's role
-- internally, and a thin security-invoker wrapper in `public` is what the application
-- calls. No raw per-student row is ever returned by these functions, only counts.

create or replace function private.admin_metrics_overview(p_since timestamptz)
returns table (
  active_subscribers bigint,
  new_subscriptions bigint,
  cancellations bigint,
  lessons_started bigint,
  lessons_completed bigint,
  completion_rate numeric,
  flashcard_reviews bigint,
  flashcard_retention_rate numeric
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_role('admin') then
    raise exception 'Apenas administradores podem acessar métricas' using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from public.subscriptions
      where state in ('active', 'grace') and access_until > now()),
    (select count(*) from public.subscriptions
      where created_at >= p_since and state <> 'pending'),
    (select count(*) from public.subscriptions
      where state = 'canceled' and updated_at >= p_since),
    (select count(*) from public.lesson_progress
      where last_studied_at >= p_since),
    (select count(*) from public.lesson_progress
      where completed_at is not null and last_studied_at >= p_since),
    (select case when count(*) = 0 then 0
       else round(count(*) filter (where completed_at is not null)::numeric / count(*), 4)
       end
     from public.lesson_progress where last_studied_at >= p_since),
    (select count(*) from public.flashcard_reviews
      where reviewed_at >= p_since),
    (select case when count(*) = 0 then 0
       else round(count(*) filter (where grade in ('good', 'easy'))::numeric / count(*), 4)
       end
     from public.flashcard_reviews where reviewed_at >= p_since);
end;
$$;

revoke all on function private.admin_metrics_overview(timestamptz) from public, anon, authenticated;
grant execute on function private.admin_metrics_overview(timestamptz) to authenticated;

create or replace function public.get_admin_metrics_overview(p_since timestamptz)
returns table (
  active_subscribers bigint,
  new_subscriptions bigint,
  cancellations bigint,
  lessons_started bigint,
  lessons_completed bigint,
  completion_rate numeric,
  flashcard_reviews bigint,
  flashcard_retention_rate numeric
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.admin_metrics_overview(p_since);
$$;

revoke all on function public.get_admin_metrics_overview(timestamptz) from public, anon;
grant execute on function public.get_admin_metrics_overview(timestamptz) to authenticated;

create or replace function private.admin_top_lessons(p_since timestamptz, p_limit integer)
returns table (
  lesson_id uuid,
  title text,
  slug text,
  learners bigint,
  completions bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer := coalesce(p_limit, 10);
begin
  if not private.has_role('admin') then
    raise exception 'Apenas administradores podem acessar métricas' using errcode = '42501';
  end if;

  if v_limit < 1 or v_limit > 50 then
    v_limit := 10;
  end if;

  return query
  select l.id, l.title, l.slug,
    count(distinct lp.user_id) as learners,
    count(*) filter (where lp.completed_at is not null) as completions
  from public.lesson_progress lp
  join public.lessons l on l.id = lp.lesson_id
  where lp.last_studied_at >= p_since
  group by l.id, l.title, l.slug
  order by learners desc, completions desc, l.title asc
  limit v_limit;
end;
$$;

revoke all on function private.admin_top_lessons(timestamptz, integer) from public, anon, authenticated;
grant execute on function private.admin_top_lessons(timestamptz, integer) to authenticated;

create or replace function public.get_admin_top_lessons(p_since timestamptz, p_limit integer default 10)
returns table (
  lesson_id uuid,
  title text,
  slug text,
  learners bigint,
  completions bigint
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.admin_top_lessons(p_since, p_limit);
$$;

revoke all on function public.get_admin_top_lessons(timestamptz, integer) from public, anon;
grant execute on function public.get_admin_top_lessons(timestamptz, integer) to authenticated;

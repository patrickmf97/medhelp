-- No clinical content is seeded. Private keys are inaccessible through table grants.
create table public.questions (
 id uuid primary key default gen_random_uuid(),
 editorial_id text not null unique check(editorial_id ~ '^MEDHELP-ENAMED-[0-9]{5}$'),
 created_at timestamptz not null default now()
);
create table public.question_versions (
 id uuid primary key default gen_random_uuid(),
 question_id uuid not null references public.questions(id) on delete restrict,
 version integer not null check(version>0),
 area text not null check(area in ('clinica','cirurgia','pediatria','go','mfc_sc')),
 topic text not null, stem text not null, lead_in text not null,
 estimated_difficulty text not null check(estimated_difficulty in ('easy','medium','hard')),
 status text not null default 'draft' check(status in ('draft','checked','approved','published','withdrawn')),
 content_hash text not null check(content_hash ~ '^[a-f0-9]{64}$'),
 published_at timestamptz,
 annulled_at timestamptz,
 created_at timestamptz not null default now(),
 unique(question_id,version),
 check(status<>'published' or published_at is not null)
);
create index question_versions_listing_idx on public.question_versions(status,area,estimated_difficulty,question_id,version);
create table public.question_options (
 version_id uuid not null references public.question_versions(id) on delete restrict,
 option_id text not null check(option_id in ('A','B','C','D')),
 text text not null,
 primary key(version_id,option_id)
);
create table private.question_keys (
 version_id uuid primary key references public.question_versions(id) on delete restrict,
 answer text not null check(answer in ('A','B','C','D')),
 rationale text not null,
 option_rationales jsonb not null,
 references_json jsonb not null check(jsonb_typeof(references_json)='array'),
 editorial_payload jsonb not null default '{}'
);
create table public.question_attempts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 question_id uuid not null references public.questions(id) on delete restrict,
 version_id uuid not null references public.question_versions(id) on delete restrict,
 selected_option_id text not null check(selected_option_id in ('A','B','C','D')),
 event_id uuid not null,
 outcome text not null check(outcome in ('correct','incorrect')),
 answered_at timestamptz not null default now(),
 unique(user_id,event_id)
);
create index question_attempts_owner_date_idx on public.question_attempts(user_id,answered_at desc,id);
create index question_attempts_version_idx on public.question_attempts(version_id);
alter table public.questions enable row level security;
alter table public.question_versions enable row level security;
alter table public.question_options enable row level security;
alter table public.question_attempts enable row level security;
alter table private.question_keys enable row level security;
revoke all on public.questions,public.question_versions,public.question_options,public.question_attempts,private.question_keys from public,anon,authenticated;
grant select on public.questions,public.question_versions,public.question_options,public.question_attempts to authenticated;
create policy questions_read on public.questions for select to authenticated using(
 (select private.has_role('admin')) or ((select private.has_active_access()) and exists(select 1 from public.question_versions v where v.question_id=questions.id))
);
create policy question_versions_read on public.question_versions for select to authenticated using(
 (select private.has_role('admin')) or (status='published' and published_at<=now() and annulled_at is null and (select private.has_active_access()))
);
create policy question_options_read on public.question_options for select to authenticated using(exists(select 1 from public.question_versions v where v.id=question_options.version_id));
create policy question_attempts_own on public.question_attempts for select to authenticated using(user_id=(select auth.uid()));

-- Publication status may change, but the version's content is immutable after first publication.
create function private.freeze_question_version() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if old.published_at is not null and
 (to_jsonb(new)-'status'-'annulled_at') is distinct from (to_jsonb(old)-'status'-'annulled_at') then
 raise exception 'Published content is immutable; create another version' using errcode='22023';end if;
 if old.annulled_at is not null and new.annulled_at is distinct from old.annulled_at then
 raise exception 'Annulment is immutable' using errcode='22023';end if;
 return new;
end$$;
create trigger question_version_immutable before update on public.question_versions for each row execute function private.freeze_question_version();
revoke all on function private.freeze_question_version() from public,anon,authenticated;

create function private.question_attempt_result(p_attempt_id uuid,p_replayed boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.question_attempts;v public.question_versions;k private.question_keys;opts jsonb;result jsonb;
begin
 if auth.uid() is null or not private.has_active_access() then raise exception 'Premium access required' using errcode='42501';end if;
 select * into a from public.question_attempts where id=p_attempt_id and user_id=auth.uid();
 if not found then raise exception 'Attempt unavailable' using errcode='42501';end if;
 select * into strict v from public.question_versions where id=a.version_id;
 select * into strict k from private.question_keys where version_id=v.id;
 select jsonb_agg(jsonb_build_object('id',option_id,'text',text) order by option_id) into opts from public.question_options where version_id=v.id;
 result:=jsonb_build_object('attemptId',a.id,'question',jsonb_build_object('id',a.question_id,'versionId',v.id,'stem',v.stem,'leadIn',v.lead_in,'options',opts,'area',v.area,'topic',v.topic,'estimatedDifficulty',v.estimated_difficulty),
 'selectedOptionId',a.selected_option_id,'outcome',case when v.annulled_at is not null then 'annulled' else a.outcome end,
 'answer',k.answer,'rationale',k.rationale,'optionRationales',k.option_rationales,'references',k.references_json,'replayed',p_replayed);
 return result;
end$$;
revoke all on function private.question_attempt_result(uuid,boolean) from public,anon,authenticated;

create function private.submit_question_internal(p_version_id uuid,p_option text,p_event_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.question_attempts;v public.question_versions;key_answer text;attempt_id uuid;
begin
 if auth.uid() is null or not private.has_active_access() then raise exception 'Premium access required' using errcode='42501';end if;
 if p_version_id is null or p_event_id is null or p_option is null or p_option not in ('A','B','C','D') then raise exception 'Invalid answer' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text||':'||p_event_id::text,0));
 select * into a from public.question_attempts where user_id=auth.uid() and event_id=p_event_id;
 if found then
  if a.version_id<>p_version_id or a.selected_option_id<>p_option then raise exception 'Event conflict' using errcode='23505';end if;
  return private.question_attempt_result(a.id,true);
 end if;
 select * into v from public.question_versions where id=p_version_id for share;
 if not found or v.status<>'published' or v.published_at>now() or v.annulled_at is not null then raise exception 'Question unavailable' using errcode='22023';end if;
 if not exists(select 1 from public.question_options where version_id=v.id and option_id=p_option) then raise exception 'Option unavailable' using errcode='22023';end if;
 select answer into strict key_answer from private.question_keys where version_id=v.id;
 insert into public.question_attempts(user_id,question_id,version_id,selected_option_id,event_id,outcome)
 values(auth.uid(),v.question_id,v.id,p_option,p_event_id,case when p_option=key_answer then 'correct' else 'incorrect' end) returning id into attempt_id;
 return private.question_attempt_result(attempt_id,false);
end$$;
revoke all on function private.submit_question_internal(uuid,text,uuid) from public,anon,authenticated;
grant execute on function private.submit_question_internal(uuid,text,uuid) to authenticated;
create function public.submit_question(p_version_id uuid,p_option text,p_event_id uuid) returns jsonb
language sql security invoker set search_path='' as $$ select private.submit_question_internal(p_version_id,p_option,p_event_id) $$;
revoke all on function public.submit_question(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.submit_question(uuid,text,uuid) to authenticated;

-- Keys and options are part of the version, not editable independently after publication.
create function private.freeze_question_child() returns trigger
language plpgsql security invoker set search_path='' as $$
declare old_id uuid;new_id uuid;v public.question_versions;
begin
 if tg_op<>'INSERT' then old_id:=old.version_id;end if;
 if tg_op<>'DELETE' then new_id:=new.version_id;end if;
 for v in select * from public.question_versions where id=old_id or id=new_id order by id for share loop
  if v.published_at is not null then raise exception 'Published content is immutable; create another version' using errcode='22023';end if;
 end loop;
 if tg_op='DELETE' then return old;end if;
 return new;
end$$;
create trigger question_options_immutable before insert or update or delete on public.question_options for each row execute function private.freeze_question_child();
create trigger question_keys_immutable before insert or update or delete on private.question_keys for each row execute function private.freeze_question_child();
revoke all on function private.freeze_question_child() from public,anon,authenticated;

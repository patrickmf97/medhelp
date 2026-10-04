begin;
-- Fixtures are non-clinical and rolled back. Actual RLS and function grants run under roles.
insert into auth.users(id,email) values
 ('10000000-0000-0000-0000-000000000001','question-a@example.invalid'),
 ('10000000-0000-0000-0000-000000000002','question-b@example.invalid');
insert into public.subscriptions(user_id,state,access_until) values
 ('10000000-0000-0000-0000-000000000001','active',now()+interval '1 day');
insert into public.questions(id,editorial_id) values('20000000-0000-0000-0000-000000000001','MEDHELP-ENAMED-00001');
insert into public.question_versions(id,question_id,version,area,topic,stem,lead_in,estimated_difficulty,status,published_at,content_hash)
 values('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',1,'clinica','Fixture','Case fixture','Choose fixture','easy','draft',null,repeat('a',64));
insert into public.question_options(version_id,option_id,text) select '30000000-0000-0000-0000-000000000001',x,'Fixture '||x from unnest(array['A','B','C','D']) x;
insert into private.question_keys(version_id,answer,rationale,option_rationales,references_json) values
 ('30000000-0000-0000-0000-000000000001','A','Fixture comment','{"A":"A","B":"B","C":"C","D":"D"}','[]');
update public.question_versions set status='published',published_at=now();
do $$begin
 begin update public.question_options set text='Mutated' where option_id='A';raise exception 'published option changed';exception when invalid_parameter_value then null;end;
 begin update private.question_keys set answer='B';raise exception 'published key changed';exception when invalid_parameter_value then null;end;
 begin delete from private.question_keys;raise exception 'published key deleted';exception when invalid_parameter_value then null;end;
 begin delete from public.question_options;raise exception 'published options deleted';exception when invalid_parameter_value then null;end;
end$$;
set local role anon;
do $$ begin
 if has_function_privilege(current_user,'public.submit_question(uuid,text,uuid)','EXECUTE') then raise exception 'anon execute leak';end if;
 if has_table_privilege(current_user,'private.question_keys','SELECT') then raise exception 'anon key leak';end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$ begin
 if exists(select from public.question_versions) then raise exception 'nonpremium body leak';end if;
 begin
 perform public.submit_question('30000000-0000-0000-0000-000000000001','A','40000000-0000-0000-0000-000000000001');raise exception 'nonpremium allowed';
 exception when insufficient_privilege then null;end;
 if has_table_privilege(current_user,'private.question_keys','SELECT') then raise exception 'authenticated key leak';end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ declare r jsonb;begin
 begin perform public.submit_question('30000000-0000-0000-0000-000000000001','E','40000000-0000-0000-0000-000000000001');raise exception 'invalid option allowed';exception when invalid_parameter_value then null;end;
 r:=public.submit_question('30000000-0000-0000-0000-000000000001','B','40000000-0000-0000-0000-000000000001');
 if r->>'outcome'<>'incorrect' or r->>'answer'<>'A' then raise exception 'wrong correction';end if;
 r:=public.submit_question('30000000-0000-0000-0000-000000000001','B','40000000-0000-0000-0000-000000000001');
 if (r->>'replayed')::boolean is not true then raise exception 'retry not replayed';end if;
 begin perform public.submit_question('30000000-0000-0000-0000-000000000001','A','40000000-0000-0000-0000-000000000001');raise exception 'conflicting retry allowed';exception when unique_violation then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$begin if exists(select from public.question_attempts) then raise exception 'crossowner leak';end if;end$$;
reset role;
update public.question_versions set status='withdrawn' where id='30000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$begin
 begin perform private.submit_question_internal('30000000-0000-0000-0000-000000000001','A','40000000-0000-0000-0000-000000000002');raise exception 'withdrawn version allowed';exception when invalid_parameter_value then null;end;
end$$;
reset role;
update public.subscriptions set access_until=now()-interval '1 minute';
set local role authenticated;
do $$begin
 if (select count(*) from public.question_attempts)<>1 then raise exception 'history lost after expiry';end if;
 if exists(select from public.question_versions) then raise exception 'expired body leak';end if;
 begin perform public.submit_question('30000000-0000-0000-0000-000000000001','B','40000000-0000-0000-0000-000000000001');raise exception 'expired retry reveals key';exception when insufficient_privilege then null;end;
end$$;
reset role;
rollback;

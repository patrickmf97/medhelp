begin;
select plan(8);

select hasnt_function('public', 'has_role', array['app_role'], 'role helper is not exposed through the public schema');
select hasnt_function('public', 'has_active_access', array[]::text[], 'access helper is not exposed through the public schema');
select hasnt_function('public', 'handle_new_user', array[]::text[], 'user trigger is not exposed through the public schema');
select hasnt_function('public', 'audit_content_mutation', array[]::text[], 'audit trigger is not exposed through the public schema');

select ok(has_function_privilege('authenticated', 'private.has_role(public.app_role)', 'EXECUTE'), 'authenticated policies can check roles');
select ok(has_function_privilege('authenticated', 'private.has_active_access()', 'EXECUTE'), 'authenticated policies can check access');
select ok(has_function_privilege('anon', 'private.has_active_access()', 'EXECUTE'), 'anonymous policies can resolve free access');
select ok(not has_function_privilege('anon', 'private.audit_content_mutation()', 'EXECUTE'), 'anonymous callers cannot execute audit triggers');

select * from finish();
rollback;

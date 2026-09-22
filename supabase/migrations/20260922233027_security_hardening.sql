create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated;

alter function public.has_role(public.app_role) set schema private;
alter function public.handle_new_user() set schema private;
alter function public.audit_content_mutation() set schema private;
alter function public.has_active_access() set schema private;

revoke all on function private.has_role(public.app_role) from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.audit_content_mutation() from public, anon, authenticated;
revoke all on function private.has_active_access() from public, anon, authenticated;

grant execute on function private.has_role(public.app_role) to authenticated;
grant execute on function private.has_active_access() to anon, authenticated;

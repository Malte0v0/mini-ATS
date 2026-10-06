-- 002_service_role_grants.sql
-- Edge Functions use the secret key, which acts as the service_role database
-- role. service_role bypasses RLS, but it still needs table privileges
-- (GRANTs): those are a separate layer, checked before RLS. 001 only granted
-- access to authenticated, so the create-user function failed with
-- "permission denied for table profiles".

grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.jobs to service_role;
grant select, insert, update, delete on public.candidates to service_role;

-- Fungsi bantu RLS dipindah dari skema public agar tidak bisa dipanggil lewat API (/rest/v1/rpc).
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
alter function public.current_role_name() set schema private;
alter function public.owns_listing(text) set schema private;
grant execute on function private.current_role_name() to anon, authenticated;
grant execute on function private.owns_listing(text) to anon, authenticated;

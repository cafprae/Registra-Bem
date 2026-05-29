-- Apply this file in Supabase SQL Editor or through the Supabase CLI.
-- It enforces server-side access rules that mirror the React client roles.

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.current_user_can_edit()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role(), '') in (
    'admin',
    'editor',
    'agente',
    'gestor',
    'coordenador'
  )
$$;

alter table public.profiles enable row level security;
alter table public.tabela_inicial enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_insert_own_viewer" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;
drop policy if exists "profiles_delete_admin" on public.profiles;

create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.current_user_role() = 'admin'
);

create policy "profiles_insert_own_viewer"
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and coalesce(role, 'viewer') = 'viewer'
);

create policy "profiles_update_admin"
on public.profiles
for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "profiles_delete_admin"
on public.profiles
for delete
to authenticated
using (public.current_user_role() = 'admin');

drop policy if exists "assets_select_authenticated" on public.tabela_inicial;
drop policy if exists "assets_insert_authorized" on public.tabela_inicial;
drop policy if exists "assets_update_authorized" on public.tabela_inicial;
drop policy if exists "assets_delete_admin" on public.tabela_inicial;

create policy "assets_select_authenticated"
on public.tabela_inicial
for select
to authenticated
using (true);

create policy "assets_insert_authorized"
on public.tabela_inicial
for insert
to authenticated
with check (public.current_user_can_edit());

create policy "assets_update_authorized"
on public.tabela_inicial
for update
to authenticated
using (public.current_user_can_edit())
with check (public.current_user_can_edit());

create policy "assets_delete_admin"
on public.tabela_inicial
for delete
to authenticated
using (public.current_user_role() = 'admin');


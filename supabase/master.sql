-- =============================================================================
-- Registra Bem — Supabase Master Script (idempotent / safe to re-run)
-- =============================================================================
-- BEFORE RUNNING: replace YOUR_EMAIL@ufc.br with the designated admin email.
-- After changes: sign out and sign in again in the app.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES TABLE (columns match handle_new_user inserts exactly)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'viewer',
  sector text,
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (
    role in ('admin', 'editor', 'viewer', 'agente', 'gestor', 'coordenador')
  )
);

-- Migrate legacy installs (drop extra column; tighten defaults)
alter table public.profiles drop column if exists created_at;
alter table public.profiles add column if not exists sector text;
alter table public.profiles alter column full_name set default '';
alter table public.profiles alter column role set default 'viewer';
alter table public.profiles alter column updated_at set default now();

-- Back-fill nulls before NOT NULL enforcement
update public.profiles
set
  full_name = coalesce(nullif(trim(full_name), ''), 'Usuário'),
  role = coalesce(role, 'viewer'),
  updated_at = coalesce(updated_at, now())
where full_name is null or role is null or updated_at is null;

alter table public.profiles alter column full_name set not null;

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_sector_idx on public.profiles (sector);

-- ---------------------------------------------------------------------------
-- 6. UNIQUE TOMBAMENTO
-- ---------------------------------------------------------------------------
drop index if exists public.tabela_inicial_tombamento_unique;

create unique index tabela_inicial_tombamento_unique
  on public.tabela_inicial (tombamento);

-- ---------------------------------------------------------------------------
-- DROP TRIGGERS
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists profiles_enforce_designated_admin_update on public.profiles;
drop trigger if exists enforce_designated_admin_on_profiles on public.profiles;
drop trigger if exists profiles_touch_updated_at on public.profiles;
drop trigger if exists profiles_before_insert_defaults on public.profiles;

-- ---------------------------------------------------------------------------
-- DROP POLICIES — profiles
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_insert_own_viewer" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;
drop policy if exists "profiles_delete_admin" on public.profiles;

-- ---------------------------------------------------------------------------
-- DROP POLICIES — assets
-- ---------------------------------------------------------------------------
drop policy if exists "assets_select_authenticated" on public.tabela_inicial;
drop policy if exists "assets_insert_authorized" on public.tabela_inicial;
drop policy if exists "assets_update_authorized" on public.tabela_inicial;
drop policy if exists "assets_delete_admin" on public.tabela_inicial;
drop policy if exists "assets_select_by_sector" on public.tabela_inicial;
drop policy if exists "assets_insert_by_sector" on public.tabela_inicial;
drop policy if exists "assets_update_by_sector" on public.tabela_inicial;

-- ---------------------------------------------------------------------------
-- DROP FUNCTIONS
-- ---------------------------------------------------------------------------
drop function if exists public.enforce_designated_admin_profile() cascade;
drop function if exists public.profiles_enforce_designated_admin_update() cascade;
drop function if exists public.profiles_before_insert_defaults() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.profiles_touch_updated_at() cascade;
drop function if exists public.is_designated_admin(uuid) cascade;
drop function if exists public.is_designated_admin_email(text) cascade;
drop function if exists public.designated_admin_email() cascade;
drop function if exists public.admin_delete_user(uuid) cascade;
drop function if exists public.sector_matches_asset(text) cascade;
drop function if exists public.sector_storage_key(text) cascade;
drop function if exists public.current_user_sector() cascade;
drop function if exists public.current_user_can_edit() cascade;
drop function if exists public.current_user_role() cascade;

-- ---------------------------------------------------------------------------
-- HELPERS
-- ---------------------------------------------------------------------------
create or replace function public.designated_admin_email()
returns text
language sql
immutable
set search_path = public
as $$
  select lower(trim('YOUR_EMAIL@ufc.br'));
$$;

-- Email-based check (no auth.users lookup — safe inside auth triggers)
create or replace function public.is_designated_admin_email(p_email text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select length(trim(coalesce(p_email, ''))) > 0
    and lower(trim(p_email)) = public.designated_admin_email();
$$;

create or replace function public.is_designated_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = p_user_id
      and public.is_designated_admin_email(u.email)
  );
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_can_edit()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role(), '') in (
    'admin', 'editor', 'agente', 'gestor', 'coordenador'
  );
$$;

create or replace function public.sector_storage_key(p_sector text)
returns text
language sql
immutable
set search_path = public
as $$
  select upper(trim(coalesce(
    nullif(regexp_replace(coalesce(p_sector, ''), '^.*\s-\s*', ''), ''),
    coalesce(p_sector, '')
  )));
$$;

create or replace function public.current_user_sector()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select sector from public.profiles where id = auth.uid();
$$;

create or replace function public.sector_matches_asset(p_asset_sector text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_role() = 'admin'
    or (
      nullif(trim(coalesce(public.current_user_sector(), '')), '') is not null
      and (
        trim(public.current_user_sector()) = trim(coalesce(p_asset_sector, ''))
        or public.sector_storage_key(public.current_user_sector()) = public.sector_storage_key(p_asset_sector)
        or upper(coalesce(p_asset_sector, '')) like '%' || public.sector_storage_key(public.current_user_sector()) || '%'
      )
    );
$$;

create or replace function public.admin_delete_user(target_uid uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado.';
  end if;

  if public.current_user_role() is distinct from 'admin' then
    raise exception 'Apenas administradores podem excluir usuários.';
  end if;

  if target_uid = auth.uid() then
    raise exception 'Você não pode excluir sua própria conta.';
  end if;

  if not exists (select 1 from auth.users where id = target_uid) then
    raise exception 'Usuário não encontrado.';
  end if;

  delete from auth.users where id = target_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. SIGN-UP: create profile when auth.users row is inserted
-- Role is chosen here only (no competing BEFORE INSERT trigger on profiles).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_email text;
  v_full_name text;
  v_sector text;
  v_role text := 'viewer';
begin
  v_id := new.id;
  if v_id is null then
    return new;
  end if;

  v_email := lower(trim(coalesce(new.email, '')));

  if public.is_designated_admin_email(v_email) then
    v_role := 'admin';
  end if;

  v_full_name := nullif(trim(coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    ''
  )), '');

  if v_full_name is null then
    v_full_name := coalesce(nullif(v_email, ''), 'Usuário');
  end if;

  v_sector := nullif(trim(coalesce(new.raw_user_meta_data->>'sector', '')), '');

  insert into public.profiles (id, full_name, role, sector, updated_at)
  values (v_id, v_full_name, v_role, v_sector, now())
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    role = excluded.role,
    sector = coalesce(excluded.sector, public.profiles.sector),
    updated_at = now();

  return new;
exception
  when others then
    raise exception 'handle_new_user failed for %: %', v_id, sqlerrm;
end;
$$;

-- Client may upsert role = viewer after sign-up; restore admin for designated email
create or replace function public.profiles_enforce_designated_admin_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.is_designated_admin(new.id) then
    new.role := 'admin';
  end if;
  return new;
end;
$$;

create or replace function public.profiles_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Ensure trigger runs with privileges that bypass RLS on public.profiles
alter function public.handle_new_user() owner to postgres;
alter function public.profiles_enforce_designated_admin_update() owner to postgres;
alter function public.is_designated_admin(uuid) owner to postgres;
alter function public.current_user_role() owner to postgres;
alter function public.current_user_can_edit() owner to postgres;
alter function public.admin_delete_user(uuid) owner to postgres;
alter function public.sector_matches_asset(text) owner to postgres;
alter function public.current_user_sector() owner to postgres;

revoke all on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to postgres, service_role;

revoke all on function public.profiles_enforce_designated_admin_update() from public;
grant execute on function public.profiles_enforce_designated_admin_update() to postgres, service_role;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated, service_role;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- UPDATE only — avoids conflicting with handle_new_user on INSERT
create trigger profiles_enforce_designated_admin_update
  before update of role on public.profiles
  for each row
  execute function public.profiles_enforce_designated_admin_update();

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row
  execute function public.profiles_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 2. ENABLE RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.tabela_inicial enable row level security;

-- ---------------------------------------------------------------------------
-- PROFILES RLS
-- ---------------------------------------------------------------------------
create policy "profiles_select_authenticated"
  on public.profiles
  for select
  to authenticated
  using (true);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (
    id = auth.uid()
    and (
      coalesce(role, 'viewer') = 'viewer'
      or public.is_designated_admin(auth.uid())
    )
  );

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role is not distinct from (
      select p.role from public.profiles p where p.id = auth.uid()
    )
    and sector is not distinct from (
      select p.sector from public.profiles p where p.id = auth.uid()
    )
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

-- ---------------------------------------------------------------------------
-- ASSETS RLS — sector-scoped; admin bypasses via sector_matches_asset()
-- ---------------------------------------------------------------------------
create policy "assets_select_by_sector"
  on public.tabela_inicial
  for select
  to authenticated
  using (public.sector_matches_asset(local_sistema));

create policy "assets_insert_by_sector"
  on public.tabela_inicial
  for insert
  to authenticated
  with check (
    public.current_user_can_edit()
    and public.sector_matches_asset(local_sistema)
  );

create policy "assets_update_by_sector"
  on public.tabela_inicial
  for update
  to authenticated
  using (
    public.current_user_can_edit()
    and public.sector_matches_asset(local_sistema)
  )
  with check (
    public.current_user_can_edit()
    and public.sector_matches_asset(local_sistema)
  );

create policy "assets_delete_admin"
  on public.tabela_inicial
  for delete
  to authenticated
  using (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- GRANTS (trigger owner + app clients)
-- ---------------------------------------------------------------------------
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on table public.profiles to postgres, service_role;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.tabela_inicial to authenticated;

grant execute on function public.designated_admin_email() to authenticated, service_role;
grant execute on function public.is_designated_admin_email(text) to authenticated, service_role;
grant execute on function public.is_designated_admin(uuid) to authenticated, service_role;
grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.current_user_can_edit() to authenticated, service_role;
grant execute on function public.sector_storage_key(text) to authenticated, service_role;
grant execute on function public.current_user_sector() to authenticated, service_role;
grant execute on function public.sector_matches_asset(text) to authenticated, service_role;

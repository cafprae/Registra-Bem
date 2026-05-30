# Supabase — Registra Bem

Database setup for this project lives in **one file only**.

## Single source of truth

| File | Purpose |
|------|---------|
| **`master.sql`** | Full, idempotent schema: `profiles` table, RLS policies, asset rules, designated-admin triggers, unique `tombamento` constraint |

Run **`master.sql`** in the [Supabase SQL Editor](https://supabase.com/dashboard) whenever you need to:

- Bootstrap a fresh project after wiping users or policies
- Re-apply RLS after policy changes
- Fix drift between dashboard and repo

The script uses `DROP … IF EXISTS` before each object, so it is **safe to re-run** on an existing database (it will not duplicate policies or triggers).

## Before you run

1. Open `master.sql` and replace **`YOUR_EMAIL@ufc.br`** with the designated administrator email (search for that placeholder).
2. Paste the entire file into **SQL Editor → New query → Run**.
3. If users already exist, sign out and sign in again in the app so the client reloads `profiles.role`.

## What `master.sql` includes

- **`public.profiles`** — `id`, `full_name`, `role`, `sector`, `updated_at`
- **RLS on `profiles`** — authenticated read; own `full_name` update; admin role/delete
- **RLS on `tabela_inicial`** — sector-scoped SELECT/INSERT/UPDATE for non-admins; admin sees all rows
- **RPC `admin_delete_user(target_uid)`** — admins delete users from `auth.users` (cascade to profiles)
- **Unique index** on `tabela_inicial.tombamento`
- **Designated admin** — auto `admin` for your email on sign-up; `viewer` for everyone else
- **Triggers** — `auth.users` → `handle_new_user()` creates profile; **UPDATE-only** trigger restores admin if the client upserts `viewer`

## Verify after running

```sql
-- Policies (expect 9 rows: 5 profiles + 4 tabela_inicial)
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'tabela_inicial')
order by tablename, policyname;

-- Designated admin
select p.role, u.email
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = lower('YOUR_EMAIL@ufc.br');
```

## App alignment

The React app expects:

- Table **`profiles`** with roles: `admin`, `editor`, `viewer`, `agente`, `gestor`, `coordenador`
- Table **`tabela_inicial`** for inventory (see `frontend` hooks and `InventoryContext`)
- Route **`/admin`** — requires `profiles.role = 'admin'`

Do not change policy names in `master.sql` without checking for hard-coded references in the codebase (there are none today; policies are server-side only).

## Obsolete scripts (removed)

These files were merged into `master.sql` and removed from the repo:

- ~~`rls_policies.sql`~~
- ~~`designated_admin.sql`~~
- ~~`bootstrap_admin.sql`~~

If you find old copies locally or in git history, ignore them and use **`master.sql`** only.

## Optional: promote an existing user

If someone registered **before** triggers were applied, uncomment and run the block at the bottom of `master.sql` (or run it once with your email substituted).

## Local Supabase CLI (optional)

If you later adopt the [Supabase CLI](https://supabase.com/docs/guides/cli), treat `master.sql` as the canonical migration reference and copy its contents into `supabase/migrations/` as needed. This repo currently documents the **dashboard SQL Editor** workflow only.

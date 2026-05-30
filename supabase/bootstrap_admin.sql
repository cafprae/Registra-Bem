-- Bootstrap the first administrator.
-- Run this in the Supabase SQL Editor while logged in as a project owner.
-- Paste the whole file into a new query tab and execute it as-is.
-- The email must already exist in Authentication > Users.
-- Sign out and sign in again in the app after running this script.

insert into public.profiles (id, full_name, role)
select
  users.id,
  coalesce(users.raw_user_meta_data->>'full_name', users.email),
  'admin'
from auth.users as users
where lower(users.email) = lower('caf.prae@ufc.br')
on conflict (id) do update
  set full_name = excluded.full_name,
      role = 'admin',
      updated_at = now();

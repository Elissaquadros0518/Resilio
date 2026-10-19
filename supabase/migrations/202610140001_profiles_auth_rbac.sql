-- Riskscape profile identities and baseline RBAC.
-- Run this migration as the Supabase database owner in the SQL Editor or via CLI.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 100),
  role text not null default 'user' check (role in ('user', 'authority', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

-- SECURITY DEFINER helper avoids recursive RLS evaluation while checking roles.
create or replace function public.riskscape_has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = required_role
  );
$$;
revoke all on function public.riskscape_has_role(text) from public;
grant execute on function public.riskscape_has_role(text) to authenticated;

create policy "Users read own profile; admins read profiles"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.riskscape_has_role('admin'));

create policy "Users update own profile; admins update profiles"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.riskscape_has_role('admin'))
  with check (id = (select auth.uid()) or public.riskscape_has_role('admin'));

-- Authenticated clients can update display_name only. They cannot insert rows or
-- update role because table privileges do not grant those operations/columns.
-- Profiles are created by this trusted trigger and role is always 'user'.
create or replace function public.create_riskscape_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 100), 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.create_riskscape_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_riskscape_profile on auth.users;
create trigger on_auth_user_created_riskscape_profile
  after insert on auth.users
  for each row execute procedure public.create_riskscape_profile();

-- No client-facing role assignment policy is provided intentionally. Granting an
-- authority role requires an administrator to verify the person's identity and
-- execute a targeted UPDATE in the Supabase SQL Editor (or a trusted server-only
-- admin workflow). Never expose a service-role key in the browser.

-- Reports currently live in browser mock state, not in a database table. When
-- reports are moved to Supabase, create RLS policies against the actual table:
-- user: SELECT/insert only own reports; authority: SELECT and update only assigned
-- jurisdiction; admin: explicit moderation access. Do not treat this profiles
-- migration as protection for client-side report data.

-- Profiles hardening and backfill for existing Auth users.
-- Safe to apply after 202610140001_profiles_auth_rbac.sql; does not modify or
-- delete existing profile roles or Auth users.

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles alter column role set default 'user';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_role_allowed_values'
  ) then
    alter table public.profiles
      add constraint profiles_role_allowed_values
      check (role in ('user', 'authority', 'admin'));
  end if;
end
$$;

create index if not exists profiles_role_idx on public.profiles(role);

-- Idempotent backfill: existing profiles (including manually granted roles) are
-- retained as-is. Only Auth users without a profile get a default user profile.
insert into public.profiles (id, display_name, role)
select
  u.id,
  left(trim(coalesce(u.raw_user_meta_data ->> 'display_name', '')), 100),
  'user'
from auth.users u
on conflict (id) do nothing;

create or replace function public.riskscape_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.riskscape_profile_updated_at() from public, anon, authenticated;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.riskscape_profile_updated_at();

-- Rebuild the profiles policies as one known, restrictive set. This removes any
-- dashboard-created permissive policy that could OR-bypass the policies below.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', existing_policy.policyname);
  end loop;
end
$$;

alter table public.profiles enable row level security;
revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

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

create policy "profiles_select_own_or_admin"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.riskscape_has_role('admin'));

create policy "profiles_update_own_permitted_fields"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Signup trigger: profile creation failures abort the Auth user insert, so an
-- account cannot be created without its profile. Metadata is used only for the
-- non-privileged display name. Role is always hard-coded to 'user'.
create or replace function public.create_riskscape_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 100),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.create_riskscape_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_riskscape_profile on auth.users;
create trigger on_auth_user_created_riskscape_profile
  after insert on auth.users
  for each row execute procedure public.create_riskscape_profile();

-- There is intentionally no client role-assignment policy or RPC. A project
-- owner grants roles through the SQL Editor after verifying the person:
-- UPDATE public.profiles SET role='authority' WHERE id='<verified Auth UUID>';

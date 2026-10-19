-- Harden the existing Riskscape profile and authority-application foundation.
-- Apply after 202610150006_two_role_manual_authority_approval.sql.
-- This migration reuses the existing tables and never touches report workflow.

-- Keep application roles to exactly user and authority. Legacy admin profiles
-- become ordinary users; role assignment remains a database-owner operation.
do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select c.conname
    from pg_catalog.pg_constraint c
    where c.conrelid = 'public.profiles'::regclass
      and c.contype = 'c'
      and pg_catalog.pg_get_constraintdef(c.oid) ilike '%role%'
  loop
    execute pg_catalog.format('alter table public.profiles drop constraint %I', v_constraint.conname);
  end loop;

  update public.profiles set role = 'user' where role = 'admin';
  alter table public.profiles alter column role set default 'user';
  alter table public.profiles add constraint profiles_role_two_values
    check (role in ('user', 'authority'));
end;
$$;

alter table public.profiles enable row level security;
revoke all on table public.profiles from public, anon, authenticated;
grant select (id, display_name, role, created_at, updated_at)
  on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
revoke insert, delete on public.profiles from public, anon, authenticated;
revoke update (role) on public.profiles from public, anon, authenticated;

-- Remove any older or dashboard-added permissive policies on profiles, then
-- retain only caller-owned profile reads and display-name updates.
do $$
declare
  v_policy record;
begin
  for v_policy in
    select policyname from pg_catalog.pg_policies
    where schemaname = 'public' and tablename = 'profiles'
  loop
    execute pg_catalog.format('drop policy if exists %I on public.profiles', v_policy.policyname);
  end loop;
end;
$$;

create policy profiles_select_own
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_update_display_name_own
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Reassert the existing signup trigger rather than adding a second trigger.
-- The Auth UUID is the profile key, metadata supplies only a display name, and
-- role is always assigned by this trusted function as 'user'. A profile insert
-- failure aborts the Auth insert so there is no account without its profile.
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
    pg_catalog.left(pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 100),
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
  for each row execute function public.create_riskscape_profile();

-- Keep the already-created application table, IDs, and rows. A unique
-- applicant_id (from migration 005) is stricter than one pending application:
-- it prevents duplicate/repeat applications for an Auth user.
alter table public.authority_applications enable row level security;
revoke all on table public.authority_applications from public, anon, authenticated;
grant select (
  id, applicant_id, full_name, organization, designation,
  requested_jurisdiction_id, requested_latitude, requested_longitude,
  status, review_note, reviewed_at, created_at, updated_at
) on public.authority_applications to authenticated;
grant insert (full_name, organization, designation, requested_jurisdiction_id)
  on public.authority_applications to authenticated;
revoke update, delete on public.authority_applications from public, anon, authenticated;

do $$
declare
  v_policy record;
begin
  for v_policy in
    select policyname from pg_catalog.pg_policies
    where schemaname = 'public' and tablename = 'authority_applications'
  loop
    execute pg_catalog.format('drop policy if exists %I on public.authority_applications', v_policy.policyname);
  end loop;
end;
$$;

create policy authority_applications_select_own
  on public.authority_applications for select to authenticated
  using (applicant_id = (select auth.uid()));
create policy authority_applications_insert_own_pending
  on public.authority_applications for insert to authenticated
  with check (applicant_id = (select auth.uid()) and status = 'pending');

-- Validate the selected service area from the trusted locations table. Updates
-- are permitted only from the database-owner session and only for a pending
-- decision. Approval promotes the profile and activates the matching stable
-- service-area assignment inside the same transaction as the status update.
create or replace function private.riskscape_protect_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_jurisdiction public.jurisdictions%rowtype;
begin
  if tg_op = 'INSERT' then
    new.applicant_id := (select auth.uid());
    if new.applicant_id is null then
      raise exception 'Sign in before applying.' using errcode = '42501';
    end if;

    select j.* into v_jurisdiction
    from public.jurisdictions j
    where j.id = new.requested_jurisdiction_id and j.active
    for share;
    if not found then
      raise exception 'Select an active supported service area.' using errcode = '22023';
    end if;

    new.requested_jurisdiction := v_jurisdiction.display_name;
    new.requested_latitude := v_jurisdiction.latitude;
    new.requested_longitude := v_jurisdiction.longitude;
    new.status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.review_note := null;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  if session_user not in ('postgres', 'supabase_admin')
    or old.status <> 'pending'
    or new.status not in ('approved', 'rejected')
    or new.id is distinct from old.id
    or new.applicant_id is distinct from old.applicant_id
    or new.full_name is distinct from old.full_name
    or new.organization is distinct from old.organization
    or new.designation is distinct from old.designation
    or new.requested_jurisdiction is distinct from old.requested_jurisdiction
    or new.requested_jurisdiction_id is distinct from old.requested_jurisdiction_id
    or new.requested_latitude is distinct from old.requested_latitude
    or new.requested_longitude is distinct from old.requested_longitude
    or new.created_at is distinct from old.created_at
    or (new.status = 'rejected' and pg_catalog.char_length(pg_catalog.btrim(coalesce(new.review_note, ''))) = 0) then
    raise exception 'Only the Supabase project owner can review a pending application.' using errcode = '42501';
  end if;

  if new.status = 'approved' then
    select j.* into v_jurisdiction
    from public.jurisdictions j
    where j.id = old.requested_jurisdiction_id and j.active
    for share;
    if not found then
      raise exception 'The requested service area is no longer active.' using errcode = '22023';
    end if;

    update public.profiles set role = 'authority' where id = old.applicant_id;
    if not found then
      raise exception 'The applicant profile does not exist.' using errcode = '23503';
    end if;

    insert into public.authority_assignments (
      authority_profile_id, jurisdiction, jurisdiction_id, active
    ) values (
      old.applicant_id, v_jurisdiction.display_name, v_jurisdiction.id, true
    )
    on conflict (authority_profile_id, jurisdiction) do update
      set jurisdiction_id = excluded.jurisdiction_id, active = true;
  end if;

  new.reviewed_at := coalesce(new.reviewed_at, now());
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.riskscape_protect_application() from public, anon, authenticated;
drop trigger if exists authority_applications_protect on public.authority_applications;
create trigger authority_applications_protect
  before insert or update on public.authority_applications
  for each row execute function private.riskscape_protect_application();

-- Assignment rows are authorization data, not applicant-managed data. Existing
-- authenticated admin RPCs and legacy policies are disabled by migration 006;
-- reassert that neither applicants nor authorities can write assignments.
alter table public.authority_assignments enable row level security;
revoke all on table public.authority_assignments from public, anon, authenticated;
do $$
declare
  v_policy record;
begin
  for v_policy in
    select policyname from pg_catalog.pg_policies
    where schemaname = 'public' and tablename = 'authority_assignments'
  loop
    execute pg_catalog.format('drop policy if exists %I on public.authority_assignments', v_policy.policyname);
  end loop;
end;
$$;
revoke all on function public.review_authority_application(uuid, text, text) from public, anon, authenticated;
revoke all on function public.set_authority_assignment(uuid, text, boolean) from public, anon, authenticated;

-- Location data remains a selectable reference list; callers can read only
-- non-sensitive columns for active service areas.
alter table public.jurisdictions enable row level security;
revoke all on table public.jurisdictions from public, anon, authenticated;
grant select (id, display_name, city, state, latitude, longitude)
  on public.jurisdictions to anon, authenticated;
do $$
declare
  v_policy record;
begin
  for v_policy in
    select policyname from pg_catalog.pg_policies
    where schemaname = 'public' and tablename = 'jurisdictions'
  loop
    execute pg_catalog.format('drop policy if exists %I on public.jurisdictions', v_policy.policyname);
  end loop;
end;
$$;
create policy jurisdictions_read_active
  on public.jurisdictions for select to anon, authenticated
  using (active);

comment on table public.authority_applications is
  'Applicant-owned requests for project-owner review; approval atomically promotes the profile and activates its verified service-area assignment.';
comment on column public.authority_applications.requested_jurisdiction_id is
  'Stable foreign-key reference to an owner-verified active service area; authorization must use this ID, not applicant-entered text.';

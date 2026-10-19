-- Move Riskscape to two application roles and owner-managed authority approval.
-- This migration preserves profile IDs, reports, applications, assignments,
-- and status history. Apply after migration 005.

-- Current reports are assigned by an existing database trigger to this exact
-- locality. It is the only locality currently configured by the project.
create table if not exists public.jurisdictions (
  id text primary key,
  display_name text not null unique check (char_length(btrim(display_name)) between 2 and 120),
  city text not null,
  state text not null,
  latitude double precision,
  longitude double precision,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint jurisdictions_coordinates_pair check ((latitude is null) = (longitude is null)),
  constraint jurisdictions_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint jurisdictions_longitude_range check (longitude is null or longitude between -180 and 180)
);
alter table public.jurisdictions enable row level security;
revoke all on public.jurisdictions from public, anon, authenticated;
grant select (id, display_name, city, state, latitude, longitude) on public.jurisdictions to anon, authenticated;
drop policy if exists jurisdictions_read_active on public.jurisdictions;
create policy jurisdictions_read_active on public.jurisdictions for select to anon, authenticated using (active);
insert into public.jurisdictions(id, display_name, city, state, latitude, longitude)
values ('vidyavihar-mumbai', 'Vidyavihar, Mumbai', 'Mumbai', 'Maharashtra', null, null)
on conflict (id) do update set display_name = excluded.display_name, city = excluded.city,
  state = excluded.state, active = true;

alter table public.authority_assignments
  add column if not exists jurisdiction_id text references public.jurisdictions(id);
update public.authority_assignments a set jurisdiction_id = j.id
from public.jurisdictions j
where a.jurisdiction_id is null and lower(btrim(a.jurisdiction)) = lower(j.display_name);
create index if not exists authority_assignments_jurisdiction_id_active_idx
  on public.authority_assignments(jurisdiction_id, authority_profile_id) where active;
alter table public.reports add column if not exists jurisdiction_id text references public.jurisdictions(id);
update public.reports r set jurisdiction_id = j.id
from public.jurisdictions j
where r.jurisdiction_id is null and lower(btrim(r.jurisdiction)) = lower(j.display_name);

-- Convert legacy application admins to ordinary users and enforce exactly two
-- application roles. Database-owner access is separate from profiles.role.
do $$
declare c record;
begin
  for c in select conname from pg_catalog.pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'c'
      and pg_catalog.pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute pg_catalog.format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
  update public.profiles set role = 'user' where role = 'admin';
  alter table public.profiles alter column role set default 'user';
  alter table public.profiles add constraint profiles_role_two_values check (role in ('user', 'authority'));
end;
$$;
revoke update (role) on public.profiles from public, anon, authenticated;

-- Keep old application jurisdiction text for compatibility, while new records
-- use a stable locality ID. Trusted trigger derives display text and coordinates.
alter table public.authority_applications
  add column if not exists requested_jurisdiction_id text references public.jurisdictions(id),
  add column if not exists requested_latitude double precision,
  add column if not exists requested_longitude double precision;
alter table public.authority_applications alter column requested_jurisdiction drop not null;
update public.authority_applications a set requested_jurisdiction_id = j.id,
  requested_latitude = j.latitude, requested_longitude = j.longitude
from public.jurisdictions j
where a.requested_jurisdiction_id is null
  and lower(btrim(a.requested_jurisdiction)) = lower(j.display_name);
do $$
begin
  if not exists (select 1 from pg_catalog.pg_constraint where conrelid='public.authority_applications'::regclass and conname='authority_applications_coordinates_pair') then
    alter table public.authority_applications add constraint authority_applications_coordinates_pair
      check ((requested_latitude is null) = (requested_longitude is null));
  end if;
end;
$$;
revoke insert (requested_jurisdiction) on public.authority_applications from public, anon, authenticated;
revoke select (requested_jurisdiction) on public.authority_applications from public, anon, authenticated;
grant select (requested_jurisdiction_id, requested_latitude, requested_longitude) on public.authority_applications to authenticated;
grant insert (requested_jurisdiction_id) on public.authority_applications to authenticated;
drop policy if exists authority_applications_admin_read on public.authority_applications;

create or replace function private.riskscape_protect_application()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_jurisdiction public.jurisdictions%rowtype;
begin
  if tg_op = 'INSERT' then
    new.applicant_id := (select auth.uid());
    if new.applicant_id is null then raise exception 'Sign in before applying.' using errcode = '42501'; end if;
    select * into v_jurisdiction from public.jurisdictions j
      where j.id = new.requested_jurisdiction_id and j.active for share;
    if not found then raise exception 'Select an active supported jurisdiction.' using errcode = '22023'; end if;
    new.requested_jurisdiction := v_jurisdiction.display_name;
    new.requested_latitude := v_jurisdiction.latitude;
    new.requested_longitude := v_jurisdiction.longitude;
    new.status := 'pending'; new.reviewed_by := null; new.reviewed_at := null; new.review_note := null;
    new.created_at := now(); new.updated_at := now();
  else
    -- SQL Editor sessions run as the Supabase database owner. Only that
    -- privileged path can review a pending application; application fields
    -- remain immutable and no JWT-authenticated user can enter this path.
    if session_user not in ('postgres', 'supabase_admin')
      or old.status <> 'pending' or new.status not in ('approved', 'rejected')
      or new.id is distinct from old.id or new.applicant_id is distinct from old.applicant_id
      or new.full_name is distinct from old.full_name or new.organization is distinct from old.organization
      or new.designation is distinct from old.designation
      or new.requested_jurisdiction is distinct from old.requested_jurisdiction
      or new.requested_jurisdiction_id is distinct from old.requested_jurisdiction_id
      or new.requested_latitude is distinct from old.requested_latitude
      or new.requested_longitude is distinct from old.requested_longitude
      or new.created_at is distinct from old.created_at
      or (new.status = 'rejected' and char_length(btrim(coalesce(new.review_note, ''))) = 0) then
      raise exception 'Only the Supabase project owner can review a pending application.' using errcode = '42501';
    end if;
    new.updated_at := now();
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;
  return new;
end;
$$;
revoke all on function private.riskscape_protect_application() from public, anon, authenticated;

-- Retain legacy operational RPC definitions, but remove all execution grants to
-- application roles. Project owners use SQL Editor transactions instead.
revoke all on function public.review_authority_application(uuid, text, text) from public, anon, authenticated;
revoke all on function public.set_authority_assignment(uuid, text, boolean) from public, anon, authenticated;

-- Keep the private helper for existing policy/function dependencies, but make
-- it false to all application callers. Database owners retain owner privileges.
create or replace function private.riskscape_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select false;
$$;
revoke all on function private.riskscape_is_admin() from public, anon, authenticated;
grant execute on function private.riskscape_is_admin() to authenticated;

-- Authority role and active exact jurisdiction are both required for report
-- reads and review; no second privileged application role exists.
create or replace function private.riskscape_can_review_report(p_report_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    join public.authority_assignments a on a.authority_profile_id = p.id and a.active
    join public.reports r on r.id = p_report_id and r.jurisdiction_id = a.jurisdiction_id
    where p.id = (select auth.uid()) and p.role = 'authority'
  );
$$;
revoke all on function private.riskscape_can_review_report(uuid) from public, anon, authenticated;
grant execute on function private.riskscape_can_review_report(uuid) to authenticated;

create or replace function public.get_my_authority_access()
returns table(role text, application_status text, jurisdictions text[])
language sql stable security definer set search_path = '' as $$
  select p.role, app.status,
    coalesce((select array_agg(a.jurisdiction_id order by a.jurisdiction_id)
      from public.authority_assignments a where a.authority_profile_id = p.id
        and a.active and a.jurisdiction_id is not null), array[]::text[])
  from public.profiles p
  left join public.authority_applications app on app.applicant_id = p.id
  where p.id = (select auth.uid());
$$;
revoke all on function public.get_my_authority_access() from public, anon, authenticated;
grant execute on function public.get_my_authority_access() to authenticated;

create or replace function public.get_authority_reports(p_offset integer default 0, p_limit integer default 1000)
returns table(id uuid, title text, category text, description text, severity text, status text,
  location_name text, latitude double precision, longitude double precision, created_at timestamptz,
  updated_at timestamptz, reviewed_at timestamptz, resolved_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null or not exists (select 1 from public.profiles p where p.id=v_user and p.role='authority') then
    raise exception 'An approved authority account is required.' using errcode = '42501';
  end if;
  if p_offset < 0 or p_limit < 1 or p_limit > 1000 then
    raise exception 'Invalid report page requested.' using errcode = '22023';
  end if;
  return query select r.id, r.title, r.category, r.description, r.severity, r.status,
    r.location_name, r.latitude, r.longitude, r.created_at, r.updated_at, r.reviewed_at, r.resolved_at
  from public.reports r
  where exists (select 1 from public.authority_assignments a
    where a.authority_profile_id=v_user and a.active and a.jurisdiction_id=r.jurisdiction_id)
  order by r.created_at desc, r.id
  offset p_offset limit p_limit;
end;
$$;
revoke all on function public.get_authority_reports(integer, integer) from public, anon, authenticated;
grant execute on function public.get_authority_reports(integer, integer) to authenticated;

create or replace function private.riskscape_set_report_jurisdiction_id()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select j.id into new.jurisdiction_id from public.jurisdictions j
    where j.display_name = new.jurisdiction and j.active;
  if new.jurisdiction_id is null then
    raise exception 'Report jurisdiction is not an active supported locality.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.riskscape_set_report_jurisdiction_id() from public, anon, authenticated;
drop trigger if exists reports_assign_jurisdiction_id on public.reports;
create trigger reports_assign_jurisdiction_id
  before insert on public.reports for each row execute function private.riskscape_set_report_jurisdiction_id();

create or replace function public.review_report_status(p_report_id uuid, p_new_status text, p_note text default null)
returns table(id uuid, title text, category text, description text, severity text, status text,
  location_name text, latitude double precision, longitude double precision, created_at timestamptz,
  updated_at timestamptz, reviewed_at timestamptz, resolved_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_report public.reports%rowtype; v_role text; v_scope text;
begin
  if v_user is null then raise exception 'Sign in to review reports.' using errcode = '42501'; end if;
  if not private.riskscape_can_review_report(p_report_id) then raise exception 'This report is outside your active assignment.' using errcode = '42501'; end if;
  if p_new_status not in ('Verified', 'Authority notified', 'Resolved', 'Rejected') then raise exception 'Unsupported review status.' using errcode = '22023'; end if;
  if p_new_status = 'Rejected' and char_length(btrim(coalesce(p_note, ''))) = 0 then
    raise exception 'A rejection reason is required.' using errcode = '22023';
  end if;
  select * into v_report from public.reports where id = p_report_id for update;
  if not found or not private.riskscape_can_review_report(p_report_id) then
    raise exception 'This report is no longer available in your active assignment.' using errcode = '42501';
  end if;
  select p.role into v_role from public.profiles p where p.id = v_user for share;
  if v_role <> 'authority' then raise exception 'An approved authority account is required.' using errcode = '42501'; end if;
  select a.jurisdiction_id into v_scope from public.authority_assignments a
    where a.authority_profile_id = v_user and a.active and a.jurisdiction_id = v_report.jurisdiction_id
    for share;
  if not found then raise exception 'Authority assignment was revoked during review.' using errcode = '42501'; end if;
  if not ((v_report.status = 'Under verification' and p_new_status in ('Verified', 'Authority notified', 'Rejected'))
    or (v_report.status = 'Authority notified' and p_new_status in ('Verified', 'Resolved', 'Rejected'))
    or (v_report.status = 'Verified' and p_new_status in ('Authority notified', 'Resolved', 'Rejected')))
  then raise exception 'The requested transition is not valid for the current report status.' using errcode = '23514'; end if;
  perform pg_catalog.set_config('riskscape.review_note', coalesce(nullif(btrim(p_note), ''), ''), true);
  update public.reports r set status = p_new_status where r.id = p_report_id returning r.* into v_report;
  return query select v_report.id, v_report.title, v_report.category, v_report.description,
    v_report.severity, v_report.status, v_report.location_name, v_report.latitude,
    v_report.longitude, v_report.created_at, v_report.updated_at, v_report.reviewed_at, v_report.resolved_at;
end;
$$;
revoke all on function public.review_report_status(uuid, text, text) from public, anon, authenticated;
grant execute on function public.review_report_status(uuid, text, text) to authenticated;

comment on table public.jurisdictions is 'Owner-managed list of supported report and authority-application areas; only active rows are selectable.';
comment on column public.authority_applications.requested_jurisdiction is 'Legacy display text retained for old records; new submissions use requested_jurisdiction_id.';
comment on function public.review_authority_application(uuid, text, text) is 'Legacy RPC retained but not executable by application roles; owner approval uses a SQL Editor transaction.';

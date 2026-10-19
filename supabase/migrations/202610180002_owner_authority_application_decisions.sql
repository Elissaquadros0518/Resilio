-- Controlled project-owner approval and rejection operations.
-- Apply after 202610180001_secure_two_role_authority_applications.sql.
-- Decisions run through these functions only; no application role can execute
-- them or update authority_applications directly.

do $$
begin
  if session_user not in ('postgres', 'supabase_admin') then
    raise exception 'Apply this migration as the Supabase database owner.' using errcode = '42501';
  end if;
end;
$$;

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
    or pg_catalog.current_setting('riskscape.authority_application_decision', true)
      is distinct from new.status
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
    or new.created_at is distinct from old.created_at then
    raise exception 'Only the project-owner decision functions can review a pending application.' using errcode = '42501';
  end if;

  if new.status = 'approved' then
    select j.* into v_jurisdiction
    from public.jurisdictions j
    where j.id = old.requested_jurisdiction_id and j.active
    for share;
    if not found then
      raise exception 'The requested service area is missing or inactive.' using errcode = '22023';
    end if;

    update public.profiles set role = 'authority' where id = old.applicant_id;
    if not found then
      raise exception 'The applicant profile does not exist.' using errcode = '23503';
    end if;

    insert into public.authority_assignments (
      authority_profile_id, jurisdiction, jurisdiction_id, active
    ) values (
      old.applicant_id, v_jurisdiction.display_name, v_jurisdiction.id, true
    );
  end if;

  new.reviewed_at := now();
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.riskscape_protect_application() from public, anon, authenticated, service_role;

create or replace function public.owner_approve_authority_application(
  p_application_id uuid,
  p_expected_auth_user_id uuid,
  p_review_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application public.authority_applications%rowtype;
  v_jurisdiction public.jurisdictions%rowtype;
  v_profile_role text;
begin
  if session_user not in ('postgres', 'supabase_admin') then
    raise exception 'Run this operation as the Supabase project owner in SQL Editor.' using errcode = '42501';
  end if;
  if p_application_id is null or p_expected_auth_user_id is null then
    raise exception 'Application ID and expected Auth user ID are required.' using errcode = '22023';
  end if;
  if p_review_note is not null and pg_catalog.char_length(p_review_note) > 1000 then
    raise exception 'Review note must be 1000 characters or fewer.' using errcode = '22023';
  end if;

  select a.* into v_application
  from public.authority_applications a
  where a.id = p_application_id
  for update;
  if not found then
    raise exception 'Authority application does not exist.' using errcode = 'P0002';
  end if;
  if v_application.status <> 'pending' then
    raise exception 'Authority application has already been reviewed.' using errcode = '55000';
  end if;
  if v_application.applicant_id <> p_expected_auth_user_id then
    raise exception 'Expected Auth user does not match this application.' using errcode = '22023';
  end if;

  select p.role into v_profile_role
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = v_application.applicant_id
  for update of p;
  if not found then
    raise exception 'The applicant profile or matching auth.users record does not exist.' using errcode = '23503';
  end if;
  if v_profile_role <> 'user' then
    raise exception 'Only a user profile can be approved as an authority.' using errcode = '55000';
  end if;
  if v_application.requested_jurisdiction_id is null then
    raise exception 'Application has no verified service-area ID.' using errcode = '22023';
  end if;

  select j.* into v_jurisdiction
  from public.jurisdictions j
  where j.id = v_application.requested_jurisdiction_id and j.active
  for share;
  if not found then
    raise exception 'Requested service area does not exist or is inactive.' using errcode = '22023';
  end if;

  -- The unique legacy key is (authority_profile_id, jurisdiction text). Check
  -- both that key and the stable ID to prevent duplicate or conflicting scopes.
  if exists (
    select 1 from public.authority_assignments aa
    where aa.authority_profile_id = v_application.applicant_id
      and (aa.jurisdiction_id = v_jurisdiction.id
        or pg_catalog.lower(pg_catalog.btrim(aa.jurisdiction)) = pg_catalog.lower(pg_catalog.btrim(v_jurisdiction.display_name)))
  ) then
    raise exception 'An assignment already exists for this authority and service area.' using errcode = '23505';
  end if;

  perform pg_catalog.set_config('riskscape.authority_application_decision', 'approved', true);
  update public.authority_applications a
  set status = 'approved', review_note = nullif(pg_catalog.btrim(p_review_note), '')
  where a.id = v_application.id and a.status = 'pending';
  if not found then
    raise exception 'Application changed before approval could be recorded.' using errcode = '40001';
  end if;

  return v_application.id;
end;
$$;
revoke all on function public.owner_approve_authority_application(uuid, uuid, text)
  from public, anon, authenticated, service_role;
comment on function public.owner_approve_authority_application(uuid, uuid, text) is
  'Project-owner-only SQL Editor operation. Atomically approves a pending application, promotes its matching Auth profile, and creates its verified service-area assignment.';

create or replace function public.owner_reject_authority_application(
  p_application_id uuid,
  p_expected_auth_user_id uuid,
  p_review_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application public.authority_applications%rowtype;
  v_jurisdiction_id text;
  v_profile_role text;
begin
  if session_user not in ('postgres', 'supabase_admin') then
    raise exception 'Run this operation as the Supabase project owner in SQL Editor.' using errcode = '42501';
  end if;
  if p_application_id is null or p_expected_auth_user_id is null then
    raise exception 'Application ID and expected Auth user ID are required.' using errcode = '22023';
  end if;
  if p_review_note is not null and pg_catalog.char_length(p_review_note) > 1000 then
    raise exception 'Review note must be 1000 characters or fewer.' using errcode = '22023';
  end if;

  select a.* into v_application
  from public.authority_applications a
  where a.id = p_application_id
  for update;
  if not found then
    raise exception 'Authority application does not exist.' using errcode = 'P0002';
  end if;
  if v_application.status <> 'pending' then
    raise exception 'Authority application has already been reviewed.' using errcode = '55000';
  end if;
  if v_application.applicant_id <> p_expected_auth_user_id then
    raise exception 'Expected Auth user does not match this application.' using errcode = '22023';
  end if;

  select p.role into v_profile_role
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = v_application.applicant_id
  for update of p;
  if not found then
    raise exception 'The applicant profile or matching auth.users record does not exist.' using errcode = '23503';
  end if;
  if v_profile_role <> 'user' then
    raise exception 'Rejected applicant must retain the user role.' using errcode = '55000';
  end if;
  if v_application.requested_jurisdiction_id is not null then
    select j.id into v_jurisdiction_id
    from public.jurisdictions j
    where j.id = v_application.requested_jurisdiction_id;
    if not found then
      raise exception 'The referenced service area does not exist.' using errcode = '22023';
    end if;
  end if;

  perform pg_catalog.set_config('riskscape.authority_application_decision', 'rejected', true);
  update public.authority_applications a
  set status = 'rejected', review_note = nullif(pg_catalog.btrim(p_review_note), '')
  where a.id = v_application.id and a.status = 'pending';
  if not found then
    raise exception 'Application changed before rejection could be recorded.' using errcode = '40001';
  end if;

  return v_application.id;
end;
$$;
revoke all on function public.owner_reject_authority_application(uuid, uuid, text)
  from public, anon, authenticated, service_role;
comment on function public.owner_reject_authority_application(uuid, uuid, text) is
  'Project-owner-only SQL Editor operation. Atomically rejects a pending application and records its review timestamp and optional note.';

-- No GRANT is issued to application roles. The migration owner retains function
-- ownership; Supabase SQL Editor must execute as postgres/supabase_admin.

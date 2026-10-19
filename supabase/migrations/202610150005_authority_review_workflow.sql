-- Authority applications, self-scoped access discovery, and atomic report review.
-- Apply after 202610150004_harden_report_rpcs.sql. Existing report status values
-- remain unchanged for compatibility: Under verification, Verified,
-- Authority notified, Resolved, and Rejected.

create table public.authority_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null unique references public.profiles(id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 100),
  organization text not null check (char_length(btrim(organization)) between 2 and 160),
  designation text not null check (char_length(btrim(designation)) between 2 and 120),
  requested_jurisdiction text not null check (char_length(btrim(requested_jurisdiction)) between 2 and 120),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (review_note is null or char_length(review_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index authority_applications_status_created_idx on public.authority_applications(status, created_at);
alter table public.authority_applications enable row level security;
revoke all on public.authority_applications from public, anon, authenticated;
grant select (id, applicant_id, full_name, organization, designation, requested_jurisdiction, status, review_note, created_at, updated_at) on public.authority_applications to authenticated;
grant insert (full_name, organization, designation, requested_jurisdiction) on public.authority_applications to authenticated;
create policy authority_applications_own_read on public.authority_applications for select to authenticated
  using (applicant_id = (select auth.uid()));
create policy authority_applications_admin_read on public.authority_applications for select to authenticated
  using ((select private.riskscape_is_admin()));
create policy authority_applications_own_insert on public.authority_applications for insert to authenticated
  with check (applicant_id = (select auth.uid()) and status = 'pending');

create or replace function private.riskscape_protect_application()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.applicant_id := (select auth.uid());
    new.status := 'pending'; new.reviewed_by := null; new.reviewed_at := null; new.review_note := null;
    new.created_at := now(); new.updated_at := now();
    if new.applicant_id is null or new.applicant_id <> (select auth.uid()) then
      raise exception 'A signed-in applicant is required.' using errcode = '42501';
    end if;
  else
    if not ((select private.riskscape_is_admin())
      and pg_catalog.current_setting('riskscape.application_review', true) = 'on'
      and old.status = 'pending' and new.status in ('approved', 'rejected'))
      or new.applicant_id is distinct from old.applicant_id
      or new.full_name is distinct from old.full_name
      or new.organization is distinct from old.organization
      or new.designation is distinct from old.designation
      or new.requested_jurisdiction is distinct from old.requested_jurisdiction then
      raise exception 'Authority applications cannot be edited by applicants.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.riskscape_protect_application() from public, anon, authenticated;
create trigger authority_applications_protect before insert or update on public.authority_applications
  for each row execute function private.riskscape_protect_application();

-- Applicants can only discover their own current status; the role and active
-- assignments returned here come from protected database records.
create or replace function public.get_my_authority_access()
returns table(role text, application_status text, jurisdictions text[])
language sql stable security definer set search_path = '' as $$
  select p.role, a.status,
    coalesce((select array_agg(x.jurisdiction order by x.jurisdiction)
      from public.authority_assignments x where x.authority_profile_id = p.id and x.active), array[]::text[])
  from public.profiles p
  left join public.authority_applications a on a.applicant_id = p.id
  where p.id = (select auth.uid());
$$;
revoke all on function public.get_my_authority_access() from public, anon, authenticated;
grant execute on function public.get_my_authority_access() to authenticated;

-- Admin review is atomic: approve promotes and assigns the requested exact
-- jurisdiction in one transaction. Rejection never changes the profile role.
create or replace function public.review_authority_application(p_application_id uuid, p_decision text, p_note text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare v_app public.authority_applications%rowtype; v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not private.riskscape_is_admin() then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Decision must be approved or rejected.' using errcode = '22023'; end if;
  if p_decision = 'rejected' and char_length(btrim(coalesce(p_note, ''))) = 0 then
    raise exception 'A rejection explanation is required.' using errcode = '22023';
  end if;
  select * into v_app from public.authority_applications where id = p_application_id for update;
  if not found or v_app.status <> 'pending' then raise exception 'Application is unavailable or already reviewed.' using errcode = '40001'; end if;
  perform pg_catalog.set_config('riskscape.application_review', 'on', true);
  update public.authority_applications set status = p_decision, reviewed_by = v_actor,
    reviewed_at = now(), review_note = nullif(btrim(p_note), ''), updated_at = now() where id = v_app.id;
  if p_decision = 'approved' then
    update public.profiles set role = 'authority' where id = v_app.applicant_id;
    insert into public.authority_assignments(authority_profile_id, jurisdiction, active)
      values (v_app.applicant_id, v_app.requested_jurisdiction, true)
      on conflict (authority_profile_id, jurisdiction) do update set active = true;
  end if;
  return p_decision;
end;
$$;
revoke all on function public.review_authority_application(uuid, text, text) from public, anon, authenticated;
grant execute on function public.review_authority_application(uuid, text, text) to authenticated;

-- Admin assignment maintenance can create, reactivate, or deactivate an exact
-- scope. Assignment management cannot promote the target profile.
revoke insert (authority_profile_id, jurisdiction, active), update (jurisdiction, active)
  on public.authority_assignments from public, anon, authenticated;
create or replace function public.set_authority_assignment(p_authority_profile_id uuid, p_jurisdiction text, p_active boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_assignment_id uuid;
begin
  if (select auth.uid()) is null or not private.riskscape_is_admin() then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_jurisdiction, ''))) not between 2 and 120 then
    raise exception 'Enter a valid jurisdiction key.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_authority_profile_id and p.role = 'authority') then
    raise exception 'The selected profile is not an approved authority.' using errcode = '22023';
  end if;
  insert into public.authority_assignments(authority_profile_id, jurisdiction, active)
    values(p_authority_profile_id, btrim(p_jurisdiction), p_active)
    on conflict(authority_profile_id, jurisdiction) do update set active = excluded.active
    returning id into v_assignment_id;
  return v_assignment_id;
end;
$$;
revoke all on function public.set_authority_assignment(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.set_authority_assignment(uuid, text, boolean) to authenticated;

-- Status updates are only possible through this lock-and-audit RPC. The trigger
-- writes history and notification in the same transaction as the status update.
revoke update (status) on public.reports from public, anon, authenticated;
create or replace function public.review_report_status(p_report_id uuid, p_new_status text, p_note text default null)
returns table(id uuid, title text, category text, description text, severity text, status text,
  location_name text, latitude double precision, longitude double precision, created_at timestamptz,
  updated_at timestamptz, reviewed_at timestamptz, resolved_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_report public.reports%rowtype; v_role text;
begin
  if v_user is null then raise exception 'Sign in to review reports.' using errcode = '42501'; end if;
  if not private.riskscape_can_review_report(p_report_id) then raise exception 'This report is outside your authorized assignment.' using errcode = '42501'; end if;
  if p_new_status not in ('Verified', 'Authority notified', 'Resolved', 'Rejected') then raise exception 'Unsupported review status.' using errcode = '22023'; end if;
  if p_new_status = 'Rejected' and char_length(btrim(coalesce(p_note, ''))) = 0 then
    raise exception 'A rejection reason is required.' using errcode = '22023';
  end if;
  select * into v_report from public.reports where id = p_report_id for update;
  if not found then raise exception 'Report not found.' using errcode = 'P0002'; end if;
  select p.role into v_role from public.profiles p where p.id = v_user for share;
  if v_role = 'authority' then
    perform 1 from public.authority_assignments a
      where a.authority_profile_id = v_user and a.active and a.jurisdiction = v_report.jurisdiction
      for share;
    if not found then raise exception 'This report is outside your active assignment.' using errcode = '42501'; end if;
  elsif v_role <> 'admin' then
    raise exception 'An approved reviewer is required.' using errcode = '42501';
  end if;
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

-- Replace status recorder to include the transaction-local validated note.
create or replace function private.riskscape_record_report_status()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_note text := nullif(pg_catalog.current_setting('riskscape.review_note', true), '');
begin
  if tg_op = 'INSERT' then
    insert into public.report_status_history(report_id, previous_status, new_status, actor_user_id)
      values(new.id, null, new.status, (select auth.uid()));
  elsif new.status is distinct from old.status then
    if new.status = 'Rejected' and char_length(btrim(coalesce(v_note, ''))) = 0 then
      raise exception 'A rejection reason is required.' using errcode = '22023';
    end if;
    insert into public.report_status_history(report_id, previous_status, new_status, actor_user_id, note)
      values(new.id, old.status, new.status, (select auth.uid()), v_note);
    if new.reporter_id is not null and new.reporter_id is distinct from (select auth.uid()) then
      insert into public.notifications(recipient_user_id, notification_type, title, message, related_report_id)
      values(new.reporter_id, 'report_status', 'Report status updated', 'Your report status changed to ' || new.status || '.', new.id);
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.riskscape_record_report_status() from public, anon, authenticated;

comment on table public.authority_applications is 'Applicant-owned, immutable applications; approval and role/assignment changes are administrator-only and atomic.';
comment on function public.review_report_status(uuid, text, text) is 'Locks and validates an assigned report status transition; trigger writes the audit event atomically.';

-- Permit Verify after a reviewer starts a legacy Authority notified report.
-- All other preparation rules from the existing write trigger are preserved.
create or replace function private.riskscape_prepare_report()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_actor_id uuid; v_actor_role text; v_trusted_server boolean; v_valid_transition boolean;
begin
  v_actor_id := (select auth.uid());
  v_trusted_server := coalesce((select auth.jwt() ->> 'role'), '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin');
  if tg_op = 'INSERT' then
    if v_actor_id is null or coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') = 'true' then
      raise exception 'A signed-in community account is required to create a report.' using errcode = '42501';
    end if;
    new.reporter_id := v_actor_id; new.status := 'Under verification'; new.jurisdiction := 'Vidyavihar, Mumbai';
    new.reviewed_by := null; new.reviewed_at := null; new.resolved_by := null; new.resolved_at := null;
    new.created_at := now(); new.updated_at := now();
    if char_length(btrim(coalesce(new.title, ''))) = 0 then new.title := left(btrim(new.category), 160); end if;
    return new;
  end if;
  if new.reporter_id is distinct from old.reporter_id or new.jurisdiction is distinct from old.jurisdiction
    or new.created_at is distinct from old.created_at then
    raise exception 'Report ownership, jurisdiction, and creation time are immutable.' using errcode = '42501';
  end if;
  new.reviewed_by := old.reviewed_by; new.reviewed_at := old.reviewed_at;
  new.resolved_by := old.resolved_by; new.resolved_at := old.resolved_at; new.updated_at := now();
  if new.status is distinct from old.status then
    if v_actor_id is null and not v_trusted_server then raise exception 'A trusted reviewer is required.' using errcode = '42501'; end if;
    if v_actor_id is not null then
      select p.role into v_actor_role from public.profiles p where p.id = v_actor_id;
      if coalesce(v_actor_role, '') not in ('authority', 'admin') then raise exception 'Only an authority or administrator can review.' using errcode = '42501'; end if;
      if v_actor_role = 'authority' and not private.riskscape_can_review_report(old.id) then raise exception 'Report is outside the assigned jurisdiction.' using errcode = '42501'; end if;
    end if;
    v_valid_transition :=
      (old.status = 'Under verification' and new.status in ('Verified', 'Authority notified', 'Rejected'))
      or (old.status = 'Verified' and new.status in ('Authority notified', 'Resolved', 'Rejected'))
      or (old.status = 'Authority notified' and new.status in ('Verified', 'Resolved', 'Rejected'));
    if not v_trusted_server and coalesce(v_actor_role, '') <> 'admin' and not v_valid_transition then
      raise exception 'The requested report status transition is not permitted.' using errcode = '23514';
    end if;
    if new.status in ('Verified', 'Authority notified', 'Resolved', 'Rejected') then
      new.reviewed_at := coalesce(old.reviewed_at, now()); new.reviewed_by := coalesce(old.reviewed_by, v_actor_id);
    end if;
    if new.status = 'Resolved' then new.resolved_at := now(); new.resolved_by := v_actor_id;
    elsif old.status = 'Resolved' then new.resolved_at := null; new.resolved_by := null; end if;
  end if;
  return new;
end;
$$;
revoke all on function private.riskscape_prepare_report() from public, anon, authenticated;

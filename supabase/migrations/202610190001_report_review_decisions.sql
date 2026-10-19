-- Make report review a single, database-authorized decision operation.
-- Existing Authority notified values remain readable for legacy rows, but
-- authenticated clients can no longer create that intermediate status.

-- Do not allow direct PostgREST UPDATEs of status. The RPC below is the only
-- application-role write path and performs identity, role, jurisdiction,
-- current-state, and audit checks in one transaction.
revoke update (status) on public.reports from public, anon, authenticated, service_role;
drop policy if exists reports_review_assigned_status on public.reports;

create or replace function private.riskscape_prepare_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_actor_role text;
  v_trusted_server boolean := coalesce((select auth.jwt() ->> 'role'), '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin');
  v_valid_transition boolean;
begin
  if tg_op = 'INSERT' then
    if v_actor_id is null or coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') = 'true' then
      raise exception 'A signed-in community account is required to create a report.' using errcode = '42501';
    end if;
    new.reporter_id := v_actor_id;
    new.status := 'Under verification';
    new.jurisdiction := 'Vidyavihar, Mumbai';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.resolved_by := null;
    new.resolved_at := null;
    new.created_at := pg_catalog.now();
    new.updated_at := pg_catalog.now();
    if pg_catalog.char_length(pg_catalog.btrim(coalesce(new.title, ''))) = 0 then
      new.title := pg_catalog.left(pg_catalog.btrim(new.category), 160);
    end if;
    return new;
  end if;

  if new.reporter_id is distinct from old.reporter_id
    or new.jurisdiction is distinct from old.jurisdiction
    or new.jurisdiction_id is distinct from old.jurisdiction_id
    or new.created_at is distinct from old.created_at then
    raise exception 'Report ownership, jurisdiction, and creation time are immutable.' using errcode = '42501';
  end if;

  new.reviewed_by := old.reviewed_by;
  new.reviewed_at := old.reviewed_at;
  new.resolved_by := old.resolved_by;
  new.resolved_at := old.resolved_at;
  new.updated_at := pg_catalog.now();

  if new.status is distinct from old.status then
    if v_actor_id is null and not v_trusted_server then
      raise exception 'A trusted reviewer is required to change report status.' using errcode = '42501';
    end if;
    if v_actor_id is not null then
      select p.role into v_actor_role from public.profiles p where p.id = v_actor_id;
      if coalesce(v_actor_role, '') <> 'authority' then
        raise exception 'Only an approved authority can change report status.' using errcode = '42501';
      end if;
      if not private.riskscape_can_review_report(old.id) then
        raise exception 'This authority account is not assigned to the report jurisdiction.' using errcode = '42501';
      end if;
    end if;

    -- Authority notified is accepted only as a legacy current state. It is no
    -- longer a valid new transition. Decisions cannot be reversed or repeated.
    v_valid_transition :=
      (old.status = 'Under verification' and new.status in ('Verified', 'Rejected'))
      or (old.status = 'Authority notified' and new.status in ('Verified', 'Rejected'))
      or (old.status = 'Verified' and new.status = 'Resolved');
    if not v_trusted_server and not v_valid_transition then
      raise exception 'The requested report status transition is not permitted.' using errcode = '23514';
    end if;

    if new.status in ('Verified', 'Rejected') then
      new.reviewed_at := coalesce(old.reviewed_at, pg_catalog.now());
      new.reviewed_by := coalesce(old.reviewed_by, v_actor_id);
    end if;
    if new.status = 'Resolved' then
      new.resolved_at := pg_catalog.now();
      new.resolved_by := v_actor_id;
    elsif old.status = 'Resolved' then
      new.resolved_at := null;
      new.resolved_by := null;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.riskscape_prepare_report() from public, anon, authenticated;

create or replace function public.review_report_status(
  p_report_id uuid,
  p_new_status text,
  p_note text default null
)
returns table(
  id uuid, title text, category text, description text, severity text, status text,
  location_name text, latitude double precision, longitude double precision,
  created_at timestamptz, updated_at timestamptz, reviewed_at timestamptz, resolved_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_role text;
  v_report public.reports%rowtype;
  v_assigned_jurisdiction_id text;
begin
  if v_user is null then
    raise exception 'Sign in to review reports.' using errcode = '42501';
  end if;
  if p_new_status is null or p_new_status not in ('Verified', 'Rejected', 'Resolved') then
    raise exception 'Choose Accept or Reject for a report decision.' using errcode = '22023';
  end if;
  if p_note is not null and pg_catalog.char_length(p_note) > 1000 then
    raise exception 'The review note must be 1000 characters or fewer.' using errcode = '22023';
  end if;

  select r.* into v_report from public.reports r where r.id = p_report_id for update;
  if not found then
    raise exception 'Report not found.' using errcode = 'P0002';
  end if;

  select p.role into v_role from public.profiles p where p.id = v_user for share;
  if v_role is distinct from 'authority' then
    raise exception 'An approved authority account is required.' using errcode = '42501';
  end if;

  select a.jurisdiction_id into v_assigned_jurisdiction_id
  from public.authority_assignments a
  where a.authority_profile_id = v_user and a.active
    and a.jurisdiction_id = v_report.jurisdiction_id
  for share;
  if not found then
    raise exception 'This report is outside your active assignment.' using errcode = '42501';
  end if;

  if not (
    (v_report.status = 'Under verification' and p_new_status in ('Verified', 'Rejected'))
    or (v_report.status = 'Authority notified' and p_new_status in ('Verified', 'Rejected'))
    or (v_report.status = 'Verified' and p_new_status = 'Resolved')
  ) then
    raise exception 'The report has already been decided or the requested transition is invalid.' using errcode = '55000';
  end if;

  -- The row lock serializes competing requests. The trusted status trigger
  -- writes reviewer, timestamp, history, and notification in this transaction.
  perform pg_catalog.set_config('riskscape.review_note', coalesce(nullif(pg_catalog.btrim(p_note), ''), ''), true);
  update public.reports r set status = p_new_status where r.id = p_report_id returning r.* into v_report;

  return query select v_report.id, v_report.title, v_report.category, v_report.description,
    v_report.severity, v_report.status, v_report.location_name, v_report.latitude,
    v_report.longitude, v_report.created_at, v_report.updated_at,
    v_report.reviewed_at, v_report.resolved_at;
end;
$$;
alter function public.review_report_status(uuid, text, text) owner to postgres;
revoke all on function public.review_report_status(uuid, text, text) from public, anon, authenticated, service_role;
grant execute on function public.review_report_status(uuid, text, text) to authenticated;
comment on function public.review_report_status(uuid, text, text) is
  'Atomically accepts or rejects an assigned report (or separately resolves a verified report); authenticated execution requires the trusted authority role and exact active jurisdiction. Audit history is written by a database trigger.';

-- Review notes are optional and stored in the existing append-only history.
-- Remove the legacy trigger requirement for a nonempty rejection note.
create or replace function private.riskscape_record_report_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note text := nullif(pg_catalog.current_setting('riskscape.review_note', true), '');
begin
  if tg_op = 'INSERT' then
    insert into public.report_status_history(report_id, previous_status, new_status, actor_user_id)
    values (new.id, null, new.status, (select auth.uid()));
  elsif new.status is distinct from old.status then
    insert into public.report_status_history(report_id, previous_status, new_status, actor_user_id, note)
    values (new.id, old.status, new.status, (select auth.uid()), v_note);
    if new.reporter_id is not null and new.reporter_id is distinct from (select auth.uid()) then
      insert into public.notifications(recipient_user_id, notification_type, title, message, related_report_id)
      values (new.reporter_id, 'report_status', 'Report status updated',
        'Your report status changed to ' || new.status || '.', new.id);
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.riskscape_record_report_status() from public, anon, authenticated;

comment on column public.reports.status is
  'Canonical report status. New authority decisions are Verified or Rejected; Authority notified is retained only for legacy records.';

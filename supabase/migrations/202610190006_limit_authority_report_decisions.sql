-- Expose only the dashboard's two report decisions to authenticated callers.
-- Verified and Rejected are existing statuses; legacy Resolved reports remain
-- readable, but the authority decision RPC no longer performs a Resolve action.

begin;

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
  if p_new_status is null or p_new_status not in ('Verified', 'Rejected') then
    raise exception 'Choose Accept or Reject for a report decision.' using errcode = '22023';
  end if;
  if p_note is not null and pg_catalog.char_length(p_note) > 1000 then
    raise exception 'The review note must be 1000 characters or fewer.' using errcode = '22023';
  end if;

  select r.* into v_report
  from public.reports r
  where r.id = p_report_id
  for update;
  if not found then
    raise exception 'Report not found.' using errcode = 'P0002';
  end if;

  select p.role into v_role
  from public.profiles p
  where p.id = v_user
  for share;
  if v_role is distinct from 'authority' then
    raise exception 'An approved authority account is required.' using errcode = '42501';
  end if;

  select a.jurisdiction_id into v_assigned_jurisdiction_id
  from public.authority_assignments a
  where a.authority_profile_id = v_user
    and a.active
    and a.jurisdiction_id = v_report.jurisdiction_id
  for share;
  if not found then
    raise exception 'This report is outside your active assignment.' using errcode = '42501';
  end if;

  if not (
    v_report.status in ('Under verification', 'Authority notified')
    and p_new_status in ('Verified', 'Rejected')
  ) then
    raise exception 'The report has already been decided or the requested transition is invalid.' using errcode = '55000';
  end if;

  -- Existing triggers record reviewer metadata, status history, and
  -- notifications atomically with this decision.
  perform pg_catalog.set_config('riskscape.review_note', coalesce(nullif(pg_catalog.btrim(p_note), ''), ''), true);
  update public.reports r
  set status = p_new_status
  where r.id = p_report_id
  returning r.* into v_report;

  return query select v_report.id, v_report.title, v_report.category, v_report.description,
    v_report.severity, v_report.status, v_report.location_name, v_report.latitude,
    v_report.longitude, v_report.created_at, v_report.updated_at,
    v_report.reviewed_at, v_report.resolved_at;
end;
$$;

revoke all on function public.review_report_status(uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.review_report_status(uuid, text, text) to authenticated;
comment on function public.review_report_status(uuid, text, text) is
  'Atomically accepts or rejects a report within the authenticated authority''s active jurisdiction. Decisions use existing Verified or Rejected statuses; reviewer metadata, history, and notifications are recorded by database triggers.';

commit;

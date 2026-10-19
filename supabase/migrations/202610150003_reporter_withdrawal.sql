-- Allow reporters to withdraw an unreviewed report they submitted by mistake.
-- This is a soft deletion: status history and private evidence remain available
-- to authorized reviewers for audit and retention purposes.

alter table public.reports
  add column withdrawn_at timestamptz,
  add column withdrawn_by uuid references auth.users(id) on delete set null;

comment on column public.reports.withdrawn_at is
  'When the owner withdrew an unreviewed report. The report is hidden from public and owner-facing report lists but retained for audit.';
comment on column public.reports.withdrawn_by is
  'Authenticated report owner who withdrew the report; set only by the trusted withdrawal RPC.';

-- The existing helper is used by own-report RLS and evidence access. A withdrawn
-- report is no longer treated as an active owner-visible report or evidence.
create or replace function private.riskscape_owns_report(p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.reports r
    where r.id = p_report_id
      and r.reporter_id = (select auth.uid())
      and r.withdrawn_at is null
  );
$$;
revoke all on function private.riskscape_owns_report(uuid) from public, anon, authenticated;
grant execute on function private.riskscape_owns_report(uuid) to authenticated;

create or replace function private.riskscape_can_read_report(p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.reports r
    where r.id = p_report_id
      and (
        r.reporter_id = (select auth.uid())
        or private.riskscape_can_review_report(r.id)
        or (r.withdrawn_at is null and r.status <> 'Rejected')
      )
  );
$$;
revoke all on function private.riskscape_can_read_report(uuid) from public, anon, authenticated;
grant execute on function private.riskscape_can_read_report(uuid) to authenticated;

drop policy if exists reports_read_public on public.reports;
create policy reports_read_public
  on public.reports for select to anon, authenticated
  using (withdrawn_at is null and status <> 'Rejected');

-- Assigned authorities/admins can still inspect withdrawn rows for audit. The
-- owner policy above uses the helper that excludes withdrawn reports.

drop policy if exists report_history_read_public on public.report_status_history;
create policy report_history_read_public
  on public.report_status_history for select to anon, authenticated
  using (
    exists (
      select 1 from public.reports r
      where r.id = report_id
        and r.withdrawn_at is null
        and r.status <> 'Rejected'
    )
  );

create or replace function public.get_my_reports()
returns table (
  id uuid,
  title text,
  category text,
  description text,
  severity text,
  status text,
  location_name text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz,
  updated_at timestamptz,
  reviewed_at timestamptz,
  resolved_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.title, r.category, r.description, r.severity, r.status,
    r.location_name, r.latitude, r.longitude, r.created_at, r.updated_at,
    r.reviewed_at, r.resolved_at
  from public.reports r
  where (select auth.uid()) is not null
    and r.reporter_id = (select auth.uid())
    and r.withdrawn_at is null
  order by r.created_at desc;
$$;
revoke all on function public.get_my_reports() from public, anon, authenticated;
grant execute on function public.get_my_reports() to authenticated;

-- SECURITY DEFINER avoids granting users table-level UPDATE permission for the
-- withdrawal metadata. The function accepts only a report UUID and derives the
-- owner from auth.uid(); it cannot alter status, reviewer, or audit history.
create or replace function public.withdraw_my_report(p_report_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Sign in to withdraw your report.' using errcode = '42501';
  end if;

  update public.reports r
  set withdrawn_at = now(), withdrawn_by = v_user_id
  where r.id = p_report_id
    and r.reporter_id = v_user_id
    and r.status = 'Under verification'
    and r.reviewed_at is null
    and r.withdrawn_at is null;

  return found;
end;
$$;
revoke all on function public.withdraw_my_report(uuid) from public, anon, authenticated;
grant execute on function public.withdraw_my_report(uuid) to authenticated;

comment on function public.withdraw_my_report(uuid) is
  'Soft-withdraws only the authenticated caller''s unreviewed Under verification report. Audit history and private evidence are retained.';

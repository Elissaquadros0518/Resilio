-- Harden report RPC privileges while retaining the least privilege needed by
-- the existing My Reports and report-withdrawal UI.
--
-- get_my_reports() intentionally remains SECURITY DEFINER. The reports API
-- withholds reporter_id from client roles, while this RPC must return rejected
-- reports to their owners and filter by auth.uid(). It returns only the
-- existing approved columns, uses a fixed empty search_path, fully qualified
-- table names, and an explicit authenticated-owner predicate.
--
-- withdraw_my_report(uuid) can safely run as SECURITY INVOKER once the caller
-- receives UPDATE only for the two withdrawal metadata columns and a narrow
-- ownership/status RLS policy. A trigger also enforces that those columns can
-- only be set by the owning reporter on an unreviewed report, even if the
-- caller bypasses the RPC and uses the table API directly.

-- Keep the private reporter identifier unavailable to ordinary clients while
-- preserving the RPC's existing return columns and filter behavior.
alter function public.get_my_reports() security definer;
alter function public.get_my_reports() set search_path = '';
revoke all on function public.get_my_reports() from public, anon, authenticated, service_role;
grant execute on function public.get_my_reports() to authenticated;
comment on function public.get_my_reports() is
  'Returns the existing My Reports projection for auth.uid() only. SECURITY DEFINER is required because reporter_id is intentionally not selectable by API roles; the fixed search_path and explicit ownership filter limit this privileged read.';

-- Grant only the withdrawal metadata update. The existing status column grant
-- used by assigned authority review remains unchanged.
revoke update (withdrawn_at, withdrawn_by) on public.reports
  from public, anon, authenticated, service_role;
grant update (withdrawn_at, withdrawn_by) on public.reports to authenticated;

drop policy if exists reports_withdraw_own_unreviewed on public.reports;
create policy reports_withdraw_own_unreviewed
  on public.reports for update to authenticated
  using (
    (select auth.uid()) is not null
    and reporter_id = (select auth.uid())
    and status = 'Under verification'
    and reviewed_at is null
    and withdrawn_at is null
  )
  with check (
    (select auth.uid()) is not null
    and reporter_id = (select auth.uid())
    and status = 'Under verification'
    and reviewed_at is null
    and withdrawn_at is not null
    and withdrawn_by = (select auth.uid())
  );

-- A reporter can only set withdrawal metadata on their own still-unreviewed
-- report. The database supplies the audit actor and timestamp. This prevents
-- an authority's separate status-update policy from being combined with a
-- write to withdrawal fields on somebody else's report.
create or replace function private.riskscape_validate_report_withdrawal()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if new.withdrawn_at is distinct from old.withdrawn_at
    or new.withdrawn_by is distinct from old.withdrawn_by then
    if v_user_id is null
      or old.reporter_id is distinct from v_user_id
      or old.status is distinct from 'Under verification'
      or old.reviewed_at is not null
      or old.withdrawn_at is not null
      or new.withdrawn_at is null
      or new.status is distinct from old.status then
      raise exception 'Only the owner may withdraw an unreviewed report.' using errcode = '42501';
    end if;

    new.withdrawn_at := now();
    new.withdrawn_by := v_user_id;
  end if;

  return new;
end;
$$;
revoke all on function private.riskscape_validate_report_withdrawal() from public, anon, authenticated, service_role;

do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    where t.tgrelid = 'public.reports'::regclass
      and t.tgname = 'reports_validate_withdrawal'
      and not t.tgisinternal
  ) then
    create trigger reports_validate_withdrawal
      before update on public.reports
      for each row execute function private.riskscape_validate_report_withdrawal();
  end if;
end;
$$;

-- Preserve the boolean RPC contract. RLS determines whether the target row is
-- eligible, and the UPDATE only addresses its UUID; ownership is never caller
-- supplied. Missing, foreign-owned, reviewed, withdrawn, and repeated IDs all
-- return false without exposing which condition failed.
create or replace function public.withdraw_my_report(p_report_id uuid)
returns boolean
language plpgsql
security invoker
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
  where r.id = p_report_id;

  return found;
end;
$$;
revoke all on function public.withdraw_my_report(uuid) from public, anon, authenticated, service_role;
grant execute on function public.withdraw_my_report(uuid) to authenticated;
comment on function public.withdraw_my_report(uuid) is
  'SECURITY INVOKER soft-withdrawal. RLS restricts the row to the authenticated owner while unreviewed; status history and private evidence are retained.';

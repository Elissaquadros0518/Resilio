-- Share evidence only for published reports, while preserving owner and
-- assigned-authority access to private reports. Public reports are Verified
-- or Resolved; Under verification, Authority notified, Rejected, and withdrawn
-- reports are not published to other community members.

create or replace function private.riskscape_can_read_report(p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.reports r
    where r.id = p_report_id
      and (
        (r.reporter_id = (select auth.uid()) and r.withdrawn_at is null)
        or private.riskscape_can_review_report(r.id)
        or (r.withdrawn_at is null and r.status in ('Verified', 'Resolved'))
      )
  );
$$;
revoke all on function private.riskscape_can_read_report(uuid)
  from public, anon, authenticated;
grant execute on function private.riskscape_can_read_report(uuid)
  to authenticated;

-- Align report row visibility with the publication rule above. Owner and
-- assigned-review policies remain in place for private report access.
drop policy if exists reports_read_public on public.reports;
create policy reports_read_public
  on public.reports for select to anon, authenticated
  using (withdrawn_at is null and status in ('Verified', 'Resolved'));

-- Use the same database-side access decision for attachment metadata.
drop policy if exists report_media_read_authorized on public.report_media;
create policy report_media_read_authorized
  on public.report_media for select to authenticated
  using (private.riskscape_can_read_report(report_id));

-- Signed URL creation and authenticated downloads are separately checked by
-- Storage RLS. Resolve the report UUID from the established object-path format
-- and delegate to the same trusted report-access predicate.
create or replace function private.riskscape_can_access_report_object(p_object_path text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_folder text;
  v_report_id uuid;
begin
  if (select auth.uid()) is null
    or p_object_path !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[a-z0-9][a-z0-9._-]{0,119}$' then
    return false;
  end if;

  v_folder := pg_catalog.split_part(p_object_path, '/', 1);
  v_report_id := v_folder::uuid;
  return private.riskscape_can_read_report(v_report_id);
end;
$$;
revoke all on function private.riskscape_can_access_report_object(text)
  from public, anon, authenticated;
grant execute on function private.riskscape_can_access_report_object(text)
  to authenticated;

drop policy if exists riskscape_report_evidence_read_authorized on storage.objects;
create policy riskscape_report_evidence_read_authorized
  on storage.objects for select to authenticated
  using (
    bucket_id = 'riskscape-report-evidence'
    and private.riskscape_can_access_report_object(name)
  );

-- History for private and unverified reports remains owner/reviewer-only.
create or replace function private.riskscape_report_history_is_public(p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.reports r
    where r.id = p_report_id
      and r.withdrawn_at is null
      and r.status in ('Verified', 'Resolved')
  );
$$;
revoke all on function private.riskscape_report_history_is_public(uuid)
  from public, anon, authenticated;
grant execute on function private.riskscape_report_history_is_public(uuid)
  to anon, authenticated;

drop policy if exists report_history_read_public on public.report_status_history;
create policy report_history_read_public
  on public.report_status_history for select to anon, authenticated
  using (private.riskscape_report_history_is_public(report_id));

comment on function private.riskscape_can_read_report(uuid) is
  'Allows the owner, an assigned authority, or a community viewer of a non-withdrawn Verified/Resolved report to read the report.';
comment on function private.riskscape_can_access_report_object(text) is
  'Allows private-bucket reads only when the corresponding report is owned, assigned for authority review, or publicly published as Verified/Resolved.';

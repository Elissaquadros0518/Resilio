-- Keep public history visibility aligned with report publication rules without
-- requiring API roles to read private columns from public.reports.
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
      and r.status <> 'Rejected'
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

comment on function private.riskscape_report_history_is_public(uuid) is
  'Returns whether report history is public under report publication rules; reads report privacy columns as the function owner.';

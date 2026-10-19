-- INSERT ... RETURNING is subject to applicable SELECT policies. The previous
-- owner policy called a STABLE helper that queried public.reports, where the
-- just-inserted row is not visible yet. Check the proposed/visible row directly
-- while preserving the same owner and non-withdrawn access rule.

begin;

drop policy if exists reports_read_own on public.reports;
create policy reports_read_own
  on public.reports
  for select
  to authenticated
  using (
    reporter_id = (select auth.uid())
    and withdrawn_at is null
  );

commit;

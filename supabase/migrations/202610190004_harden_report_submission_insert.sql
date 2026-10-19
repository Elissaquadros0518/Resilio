-- Keep community report creation narrow and make the trusted BEFORE INSERT
-- triggers' resulting row shape explicit in the INSERT RLS policy.
-- The browser may supply its authenticated owner UUID and the initial pending
-- status; RLS checks both against auth.uid()/the allowed state, and the
-- trigger independently overwrites them. Reviewer fields and locality remain
-- database-controlled.

begin;

drop policy if exists reports_create_as_self on public.reports;
create policy reports_create_as_self
  on public.reports
  for insert
  to authenticated
  with check (
    reporter_id = (select auth.uid())
    and status = 'Under verification'
    and jurisdiction = 'Vidyavihar, Mumbai'
    and jurisdiction_id = 'vidyavihar-mumbai'
    and reviewed_by is null
    and reviewed_at is null
    and resolved_by is null
    and resolved_at is null
    and withdrawn_at is null
    and withdrawn_by is null
  );

-- Do not rely on a table-level INSERT grant. Allow only the form fields plus
-- owner and initial status; the trigger fills/reasserts protected values.
revoke insert on table public.reports from anon, authenticated;
revoke insert (
  id,
  reporter_id,
  title,
  status,
  jurisdiction,
  jurisdiction_id,
  reviewed_by,
  reviewed_at,
  resolved_by,
  resolved_at,
  withdrawn_at,
  withdrawn_by,
  created_at,
  updated_at
) on table public.reports from anon, authenticated;
grant insert (
  reporter_id,
  status,
  category,
  description,
  severity,
  location_name,
  latitude,
  longitude
) on table public.reports to authenticated;

commit;

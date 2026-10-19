-- Withdrawn reports are retained for audit but are no longer active authority
-- work. Keep the approved-authority check and active jurisdiction scope intact.

begin;

create or replace function public.get_authority_reports(
  p_offset integer default 0,
  p_limit integer default 1000
)
returns table(
  id uuid, title text, category text, description text, severity text, status text,
  location_name text, latitude double precision, longitude double precision,
  created_at timestamptz, updated_at timestamptz, reviewed_at timestamptz, resolved_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null or not exists (
    select 1 from public.profiles p where p.id = v_user and p.role = 'authority'
  ) then
    raise exception 'An approved authority account is required.' using errcode = '42501';
  end if;
  if p_offset < 0 or p_limit < 1 or p_limit > 1000 then
    raise exception 'Invalid report page requested.' using errcode = '22023';
  end if;

  return query
  select r.id, r.title, r.category, r.description, r.severity, r.status,
    r.location_name, r.latitude, r.longitude, r.created_at, r.updated_at,
    r.reviewed_at, r.resolved_at
  from public.reports r
  where r.withdrawn_at is null
    and exists (
      select 1 from public.authority_assignments a
      where a.authority_profile_id = v_user
        and a.active
        and a.jurisdiction_id = r.jurisdiction_id
    )
  order by r.created_at desc, r.id
  offset p_offset limit p_limit;
end;
$$;

revoke all on function public.get_authority_reports(integer, integer)
  from public, anon, authenticated;
grant execute on function public.get_authority_reports(integer, integer) to authenticated;
comment on function public.get_authority_reports(integer, integer) is
  'Returns active reports in the authenticated approved authority''s assigned jurisdictions. Withdrawn reports remain stored for audit but are excluded from the review queue.';

commit;

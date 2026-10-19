-- Expose only database-derived community counts and a small leaderboard.
-- Report descriptions, coordinates, emails, profile IDs, and other profile
-- fields are never returned by this RPC.

begin;

create or replace function public.get_community_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_total_reports bigint;
  v_verified_reports bigint;
  v_rejected_reports bigint;
  v_average_verification_seconds numeric;
  v_contributors jsonb;
begin
  if v_user_id is null then
    raise exception 'Sign in to view community statistics.' using errcode = '42501';
  end if;

  select count(*)::bigint,
    count(*) filter (where r.status = 'Verified'),
    count(*) filter (where r.status = 'Rejected')
  into v_total_reports, v_verified_reports, v_rejected_reports
  from public.reports r;

  -- The workflow records reviewed_at when an authority accepts or rejects.
  -- Average verification duration includes accepted reports with valid times.
  select avg(extract(epoch from (r.reviewed_at - r.created_at)))
  into v_average_verification_seconds
  from public.reports r
  where r.status = 'Verified'
    and r.reviewed_at is not null
    and r.reviewed_at >= r.created_at;

  with contributor_counts as (
    select r.reporter_id,
      coalesce(
        nullif(
          case
            when coalesce(p.display_name, '') ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}' then ''
            else pg_catalog.btrim(p.display_name)
          end,
          ''
        ),
        'Community member'
      ) as display_name,
      count(*)::bigint as verified_reports
    from public.reports r
    left join public.profiles p on p.id = r.reporter_id
    where r.reporter_id is not null
      and r.status = 'Verified'
      and r.withdrawn_at is null
    group by r.reporter_id, p.display_name
  ), ranked_contributors as (
    select dense_rank() over (order by c.verified_reports desc)::integer as rank,
      c.reporter_id,
      c.display_name,
      c.verified_reports
    from contributor_counts c
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'rank', ranked.rank,
        'name', ranked.display_name,
        'verified_reports', ranked.verified_reports
      ) order by ranked.rank, ranked.display_name, ranked.reporter_id
    ),
    '[]'::jsonb
  )
  into v_contributors
  from (
    select * from ranked_contributors order by rank, display_name, reporter_id limit 10
  ) ranked;

  return jsonb_build_object(
    'total_reports', v_total_reports,
    'verified_reports', v_verified_reports,
    'rejected_reports', v_rejected_reports,
    'average_verification_seconds', v_average_verification_seconds,
    'contributors', v_contributors
  );
end;
$$;

revoke all on function public.get_community_summary()
  from public, anon, authenticated;
grant execute on function public.get_community_summary() to authenticated;
comment on function public.get_community_summary() is
  'Returns aggregate report totals, verified-report contributor names/counts, and average verification duration to signed-in users; no report or profile identifiers are returned.';

commit;

-- Make the new RPC visible to PostgREST immediately after the migration commits.
notify pgrst, 'reload schema';

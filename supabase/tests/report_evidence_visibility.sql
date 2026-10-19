-- Cross-account evidence authorization checks for
-- 202610190003_verified_report_evidence_access.sql.
-- Run only in a disposable/local database after applying the migration.
-- Replace each *_UUID / *_PATH placeholder with existing fixture records:
--   COMMUNITY_A owns PENDING_REPORT_UUID and its PENDING_MEDIA_UUID.
--   COMMUNITY_B owns neither report and has no authority assignment.
--   PUBLISHED_REPORT_UUID is Verified or Resolved and has PUBLISHED_MEDIA_UUID.
--   EMPTY_REPORT_UUID is Verified or Resolved and has no report_media rows.
--   REJECTED_REPORT_UUID has REJECTED_MEDIA_UUID.
--   PUBLISHED_OBJECT_PATH, PENDING_OBJECT_PATH, REJECTED_OBJECT_PATH,
--   and AUTHORITY_OBJECT_PATH are the corresponding storage.objects.name values.
--   AUTHORITY_UUID has an active assignment for AUTHORITY_PRIVATE_REPORT_UUID,
--   which has AUTHORITY_MEDIA_UUID. OUTSIDE_REPORT_UUID is outside that scope.
-- Keep the final ROLLBACK so all changes made by this test are discarded.

begin;
set local role authenticated;

select pg_catalog.set_config('request.jwt.claim.sub', 'COMMUNITY_B_UUID', true);
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.reports where id = 'PUBLISHED_REPORT_UUID';
  if v_count <> 1 then raise exception 'Community B cannot read a published report'; end if;
  select count(*) into v_count from public.report_media where report_id = 'PUBLISHED_REPORT_UUID';
  if v_count < 1 then raise exception 'Community B cannot read published report evidence metadata'; end if;
  select count(*) into v_count from storage.objects
    where bucket_id = 'riskscape-report-evidence' and name = 'PUBLISHED_OBJECT_PATH';
  if v_count <> 1 then raise exception 'Community B cannot read the published evidence object'; end if;
  select count(*) into v_count from public.reports where id = 'EMPTY_REPORT_UUID';
  if v_count <> 1 then raise exception 'An authorized no-photo report is not readable'; end if;
  select count(*) into v_count from public.report_media where report_id = 'EMPTY_REPORT_UUID';
  if v_count <> 0 then raise exception 'The no-photo fixture unexpectedly contains evidence metadata'; end if;

  select count(*) into v_count from public.reports where id = 'PENDING_REPORT_UUID';
  if v_count <> 0 then raise exception 'Community B can read another user''s pending report'; end if;
  select count(*) into v_count from public.report_media where report_id = 'PENDING_REPORT_UUID';
  if v_count <> 0 then raise exception 'Community B can read another user''s pending evidence'; end if;
  select count(*) into v_count from storage.objects
    where bucket_id = 'riskscape-report-evidence' and name = 'PENDING_OBJECT_PATH';
  if v_count <> 0 then raise exception 'Community B can read another user''s pending evidence object'; end if;

  select count(*) into v_count from public.reports where id = 'REJECTED_REPORT_UUID';
  if v_count <> 0 then raise exception 'Community B can read a rejected report'; end if;
  select count(*) into v_count from public.report_media where report_id = 'REJECTED_REPORT_UUID';
  if v_count <> 0 then raise exception 'Community B can read rejected report evidence'; end if;
  select count(*) into v_count from storage.objects
    where bucket_id = 'riskscape-report-evidence' and name = 'REJECTED_OBJECT_PATH';
  if v_count <> 0 then raise exception 'Community B can read rejected evidence objects'; end if;
end;
$$;

select pg_catalog.set_config('request.jwt.claim.sub', 'COMMUNITY_A_UUID', true);
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.reports where id = 'PENDING_REPORT_UUID';
  if v_count <> 1 then raise exception 'The report owner cannot read their pending report'; end if;
  select count(*) into v_count from public.report_media where id = 'PENDING_MEDIA_UUID';
  if v_count <> 1 then raise exception 'The report owner cannot read their pending evidence'; end if;
  select count(*) into v_count from storage.objects
    where bucket_id = 'riskscape-report-evidence' and name = 'PENDING_OBJECT_PATH';
  if v_count <> 1 then raise exception 'The report owner cannot read their pending evidence object'; end if;
end;
$$;

select pg_catalog.set_config('request.jwt.claim.sub', 'AUTHORITY_UUID', true);
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.report_media where id = 'AUTHORITY_MEDIA_UUID';
  if v_count <> 1 then raise exception 'The assigned authority cannot read assigned report evidence'; end if;
  select count(*) into v_count from storage.objects
    where bucket_id = 'riskscape-report-evidence' and name = 'AUTHORITY_OBJECT_PATH';
  if v_count <> 1 then raise exception 'The assigned authority cannot read the assigned evidence object'; end if;
  select count(*) into v_count from public.report_media where report_id = 'OUTSIDE_REPORT_UUID';
  if v_count <> 0 then raise exception 'The authority can read evidence outside its jurisdiction'; end if;
end;
$$;

rollback;

-- Run only against a disposable/local Supabase database after applying
-- 202610190001_report_review_decisions.sql. Replace all eight fixture IDs with
-- existing test records that meet the stated roles/status/scope requirements.
-- The script sets an authenticated JWT subject and rolls back every change.
-- Do not remove the final ROLLBACK.

begin;

-- Fixtures:
-- AUTHORITY_UUID: profile role=authority, with an active assignment matching
--   all three AUTHORITY_* report jurisdiction_id values below.
-- COMMUNITY_UUID: profile role=user.
-- OUTSIDE_AUTHORITY_UUID: profile role=authority, with no assignment matching
--   OUTSIDE_SCOPE_REPORT_UUID.
-- ACCEPT_REPORT_UUID, REJECT_REPORT_UUID, ROLLBACK_REPORT_UUID: status
--   Under verification in AUTHORITY_UUID's assigned jurisdiction.
-- COMMUNITY_TEST_REPORT_UUID: Under verification in that same jurisdiction.
-- OUTSIDE_SCOPE_REPORT_UUID: Under verification outside the outside authority's
--   active assignments.

do $$
begin
  if has_column_privilege('authenticated', 'public.reports', 'status', 'UPDATE') then
    raise exception 'Authenticated users still have direct report status UPDATE privilege';
  end if;
  if has_function_privilege('anon', 'public.review_report_status(uuid,text,text)', 'EXECUTE')
    or has_function_privilege('service_role', 'public.review_report_status(uuid,text,text)', 'EXECUTE') then
    raise exception 'An unintended role can execute the review RPC';
  end if;
end;
$$;

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', 'AUTHORITY_UUID', true);

-- Accept persists the canonical status and creates trusted history once.
do $$
declare v_status text; v_history integer;
begin
  perform public.review_report_status('ACCEPT_REPORT_UUID', 'Verified', null);
  select r.status into v_status from public.reports r where r.id = 'ACCEPT_REPORT_UUID';
  select count(*) into v_history from public.report_status_history h
    where h.report_id = 'ACCEPT_REPORT_UUID' and h.new_status = 'Verified'
      and h.actor_user_id = 'AUTHORITY_UUID';
  if v_status <> 'Verified' or v_history <> 1 then
    raise exception 'Accept did not atomically set Verified and record reviewer history';
  end if;
  begin
    perform public.review_report_status('ACCEPT_REPORT_UUID', 'Verified', null);
    raise exception 'A duplicate accept unexpectedly succeeded';
  exception when sqlstate '55000' then null;
  end;
end;
$$;

-- Reject works with no note and records the decision in history.
do $$
declare v_status text; v_history integer;
begin
  perform public.review_report_status('REJECT_REPORT_UUID', 'Rejected', null);
  select r.status into v_status from public.reports r where r.id = 'REJECT_REPORT_UUID';
  select count(*) into v_history from public.report_status_history h
    where h.report_id = 'REJECT_REPORT_UUID' and h.new_status = 'Rejected'
      and h.actor_user_id = 'AUTHORITY_UUID';
  if v_status <> 'Rejected' or v_history <> 1 then
    raise exception 'Reject did not atomically set Rejected and record reviewer history';
  end if;
  begin
    perform public.review_report_status('REJECT_REPORT_UUID', 'Rejected', 'repeat');
    raise exception 'A duplicate reject unexpectedly succeeded';
  exception when sqlstate '55000' then null;
  end;
end;
$$;

-- A community profile cannot call the RPC successfully.
select pg_catalog.set_config('request.jwt.claim.sub', 'COMMUNITY_UUID', true);
do $$
declare v_status text;
begin
  begin
    perform public.review_report_status('COMMUNITY_TEST_REPORT_UUID', 'Verified', null);
    raise exception 'A community user unexpectedly reviewed a report';
  exception when sqlstate '42501' then null;
  end;
  select r.status into v_status from public.reports r where r.id = 'COMMUNITY_TEST_REPORT_UUID';
  if v_status <> 'Under verification' then raise exception 'Denied community review changed report status'; end if;
end;
$$;

-- An authority cannot review outside the active assigned jurisdiction.
select pg_catalog.set_config('request.jwt.claim.sub', 'OUTSIDE_AUTHORITY_UUID', true);
do $$
declare v_status text;
begin
  begin
    perform public.review_report_status('OUTSIDE_SCOPE_REPORT_UUID', 'Rejected', 'test');
    raise exception 'An out-of-scope authority unexpectedly reviewed a report';
  exception when sqlstate '42501' then null;
  end;
  select r.status into v_status from public.reports r where r.id = 'OUTSIDE_SCOPE_REPORT_UUID';
  if v_status <> 'Under verification' then raise exception 'Denied out-of-scope review changed status'; end if;
end;
$$;

-- Force a failure after the status-history trigger has run. PostgreSQL must
-- roll back the report update, history insert, and notification together.
reset role;
create function private.riskscape_test_fail_report_decision()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'Rejected' then
    raise exception 'Intentional rollback test failure' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger zz_riskscape_test_fail_report_decision
after update of status on public.reports
for each row execute function private.riskscape_test_fail_report_decision();
set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', 'AUTHORITY_UUID', true);
do $$
declare v_status text; v_history integer;
begin
  begin
    perform public.review_report_status('ROLLBACK_REPORT_UUID', 'Rejected', 'rollback test');
    raise exception 'The forced failure did not occur' using errcode = 'P0002';
  exception when sqlstate 'P0001' then null;
  end;
  select r.status into v_status from public.reports r where r.id = 'ROLLBACK_REPORT_UUID';
  select count(*) into v_history from public.report_status_history h
    where h.report_id = 'ROLLBACK_REPORT_UUID' and h.new_status = 'Rejected';
  if v_status <> 'Under verification' or v_history <> 0 then
    raise exception 'A failed decision partially persisted status or history';
  end if;
end;
$$;

reset role;
drop trigger zz_riskscape_test_fail_report_decision on public.reports;
drop function private.riskscape_test_fail_report_decision();
rollback;

-- Owner-only integration checks for migration 202610180002.
-- Run only against a disposable/local Supabase database as postgres, after
-- replacing both placeholders with an existing PENDING application for a
-- profile whose role is user and which has no assignment for its requested ID.
-- The whole script rolls back; never remove the final ROLLBACK.

begin;

do $$
begin
  if has_function_privilege('anon', 'public.owner_approve_authority_application(uuid,uuid,text)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.owner_approve_authority_application(uuid,uuid,text)', 'EXECUTE')
    or has_function_privilege('service_role', 'public.owner_approve_authority_application(uuid,uuid,text)', 'EXECUTE')
    or has_function_privilege('anon', 'public.owner_reject_authority_application(uuid,uuid,text)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.owner_reject_authority_application(uuid,uuid,text)', 'EXECUTE')
    or has_function_privilege('service_role', 'public.owner_reject_authority_application(uuid,uuid,text)', 'EXECUTE') then
    raise exception 'An application role can execute an owner decision function';
  end if;
end;
$$;

-- Success, trusted role/assignment/status updates, and safe repeated-call error.
do $$
declare
  v_application_id uuid := 'PENDING_APPLICATION_UUID';
  v_auth_user_id uuid := 'EXPECTED_AUTH_USER_UUID';
  v_result uuid;
  v_role text;
  v_status text;
  v_count integer;
begin
  v_result := public.owner_approve_authority_application(v_application_id, v_auth_user_id, 'Owner review test');
  if v_result <> v_application_id then raise exception 'Approval returned the wrong application ID'; end if;
  select p.role into v_role from public.profiles p where p.id = v_auth_user_id;
  select a.status into v_status from public.authority_applications a where a.id = v_application_id;
  select count(*) into v_count from public.authority_assignments aa
  join public.authority_applications a on a.applicant_id = aa.authority_profile_id
  where a.id = v_application_id and aa.jurisdiction_id = a.requested_jurisdiction_id and aa.active;
  if v_role <> 'authority' or v_status <> 'approved' or v_count <> 1 then
    raise exception 'Approval did not atomically set role, status, and one matching assignment';
  end if;
  begin
    perform public.owner_approve_authority_application(v_application_id, v_auth_user_id, 'Repeat call');
    raise exception 'A repeated approval unexpectedly succeeded';
  exception when sqlstate '55000' then
    null;
  end;
end;
$$;
rollback;

-- Rejection records a decision while retaining the ordinary user role and no assignment.
begin;
do $$
declare
  v_application_id uuid := 'PENDING_APPLICATION_UUID';
  v_auth_user_id uuid := 'EXPECTED_AUTH_USER_UUID';
  v_role text;
  v_status text;
  v_reviewed_at timestamptz;
  v_count integer;
begin
  perform public.owner_reject_authority_application(v_application_id, v_auth_user_id, 'Owner rejection test');
  select p.role into v_role from public.profiles p where p.id = v_auth_user_id;
  select a.status, a.reviewed_at into v_status, v_reviewed_at
  from public.authority_applications a where a.id = v_application_id;
  select count(*) into v_count from public.authority_assignments aa where aa.authority_profile_id = v_auth_user_id;
  if v_role <> 'user' or v_status <> 'rejected' or v_reviewed_at is null or v_count <> 0 then
    raise exception 'Rejection changed role, created an assignment, or missed its review timestamp';
  end if;
end;
$$;
rollback;

-- Nonexistent application.
begin;
do $$
begin
  begin
    perform public.owner_approve_authority_application('00000000-0000-0000-0000-000000000000', 'EXPECTED_AUTH_USER_UUID', null);
    raise exception 'A nonexistent application unexpectedly succeeded';
  exception when sqlstate 'P0002' then
    null;
  end;
end;
$$;
rollback;

-- Wrong Auth UUID must fail before any role, status, or assignment change.
begin;
do $$
declare
  v_application_id uuid := 'PENDING_APPLICATION_UUID';
  v_expected_auth_user_id uuid := 'EXPECTED_AUTH_USER_UUID';
  v_role text;
  v_status text;
  v_count integer;
begin
  begin
    perform public.owner_approve_authority_application(v_application_id, gen_random_uuid(), null);
    raise exception 'Mismatched Auth UUID unexpectedly succeeded';
  exception when sqlstate '22023' then
    null;
  end;
  select p.role into v_role from public.profiles p where p.id = v_expected_auth_user_id;
  select a.status into v_status from public.authority_applications a where a.id = v_application_id;
  select count(*) into v_count from public.authority_assignments aa where aa.authority_profile_id = v_expected_auth_user_id;
  if v_role <> 'user' or v_status <> 'pending' or v_count <> 0 then
    raise exception 'A failed mismatched-ID approval left partial changes';
  end if;
end;
$$;
rollback;

-- Invalid/inactive service area must not approve or promote.
begin;
update public.jurisdictions
set active = false
where id = (select requested_jurisdiction_id from public.authority_applications where id = 'PENDING_APPLICATION_UUID');
do $$
declare
  v_application_id uuid := 'PENDING_APPLICATION_UUID';
  v_expected_auth_user_id uuid := 'EXPECTED_AUTH_USER_UUID';
  v_role text;
  v_status text;
  v_count integer;
begin
  begin
    perform public.owner_approve_authority_application(v_application_id, v_expected_auth_user_id, null);
    raise exception 'An inactive service area unexpectedly approved';
  exception when sqlstate '22023' then
    null;
  end;
  select p.role into v_role from public.profiles p where p.id = v_expected_auth_user_id;
  select a.status into v_status from public.authority_applications a where a.id = v_application_id;
  select count(*) into v_count from public.authority_assignments aa where aa.authority_profile_id = v_expected_auth_user_id;
  if v_role <> 'user' or v_status <> 'pending' or v_count <> 0 then
    raise exception 'Invalid service-area approval left partial changes';
  end if;
end;
$$;
rollback;

-- Duplicate stable-ID assignment is rejected without changing the application.
begin;
insert into public.authority_assignments(authority_profile_id, jurisdiction, jurisdiction_id, active)
select a.applicant_id, j.display_name, j.id, false
from public.authority_applications a
join public.jurisdictions j on j.id = a.requested_jurisdiction_id
where a.id = 'PENDING_APPLICATION_UUID';
do $$
declare
  v_application_id uuid := 'PENDING_APPLICATION_UUID';
  v_expected_auth_user_id uuid := 'EXPECTED_AUTH_USER_UUID';
  v_role text;
  v_status text;
begin
  begin
    perform public.owner_approve_authority_application(v_application_id, v_expected_auth_user_id, null);
    raise exception 'A duplicate assignment unexpectedly approved';
  exception when sqlstate '23505' then
    null;
  end;
  select p.role into v_role from public.profiles p where p.id = v_expected_auth_user_id;
  select a.status into v_status from public.authority_applications a where a.id = v_application_id;
  if v_role <> 'user' or v_status <> 'pending' then
    raise exception 'Duplicate-assignment failure left a promoted or reviewed application';
  end if;
end;
$$;
rollback;

-- Force the final assignment insert to fail after the trigger has attempted the
-- profile promotion. The failed statement must roll every write back together.
begin;
create function public.riskscape_test_fail_authority_assignment()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Injected assignment failure for rollback test' using errcode = 'P0001';
end;
$$;
create trigger riskscape_test_fail_authority_assignment
before insert on public.authority_assignments
for each row execute function public.riskscape_test_fail_authority_assignment();
do $$
declare
  v_application_id uuid := 'PENDING_APPLICATION_UUID';
  v_expected_auth_user_id uuid := 'EXPECTED_AUTH_USER_UUID';
  v_role text;
  v_status text;
  v_count integer;
begin
  begin
    perform public.owner_approve_authority_application(v_application_id, v_expected_auth_user_id, null);
    raise exception 'Injected assignment failure unexpectedly succeeded';
  exception when sqlstate 'P0001' then
    null;
  end;
  select p.role into v_role from public.profiles p where p.id = v_expected_auth_user_id;
  select a.status into v_status from public.authority_applications a where a.id = v_application_id;
  select count(*) into v_count from public.authority_assignments aa where aa.authority_profile_id = v_expected_auth_user_id;
  if v_role <> 'user' or v_status <> 'pending' or v_count <> 0 then
    raise exception 'Failed assignment did not roll back role and application status';
  end if;
end;
$$;
drop trigger riskscape_test_fail_authority_assignment on public.authority_assignments;
drop function public.riskscape_test_fail_authority_assignment();
rollback;

-- Non-pending applications are covered by the repeated-call assertion in the
-- success case above. All cases roll back so the fixture remains pending.

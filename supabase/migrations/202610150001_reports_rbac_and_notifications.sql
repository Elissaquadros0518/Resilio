-- Initial Riskscape report, review, assignment, and notification schema.
-- Requires the existing profiles migrations (202610140001-003).
-- No demo/live report rows are inserted by this migration.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  title text not null default '',
  category text not null,
  description text not null,
  severity text not null,
  status text not null default 'Under verification',
  location_name text not null,
  latitude double precision,
  longitude double precision,
  -- The current application only covers Vidyavihar. This field is assigned by
  -- the database on insert, never accepted from the public form.
  jurisdiction text not null default 'Vidyavihar, Mumbai',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint reports_category_length check (char_length(btrim(category)) between 1 and 80),
  constraint reports_description_length check (char_length(btrim(description)) between 1 and 5000),
  constraint reports_severity_allowed check (severity in ('LOW', 'MODERATE', 'MEDIUM', 'HIGH', 'CRITICAL')),
  constraint reports_status_allowed check (status in ('Under verification', 'Verified', 'Authority notified', 'Resolved', 'Rejected')),
  constraint reports_location_length check (char_length(btrim(location_name)) between 1 and 240),
  constraint reports_coordinates_pair check ((latitude is null) = (longitude is null)),
  constraint reports_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint reports_longitude_range check (longitude is null or longitude between -180 and 180),
  constraint reports_jurisdiction_length check (char_length(btrim(jurisdiction)) between 1 and 120)
);

create table public.authority_assignments (
  id uuid primary key default gen_random_uuid(),
  authority_profile_id uuid not null references public.profiles(id) on delete cascade,
  jurisdiction text not null,
  active boolean not null default true,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint authority_assignments_jurisdiction_length check (char_length(btrim(jurisdiction)) between 1 and 120),
  constraint authority_assignments_unique_scope unique (authority_profile_id, jurisdiction)
);

create table public.report_status_history (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete restrict,
  previous_status text,
  new_status text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  note text,
  constraint report_history_previous_status_allowed check (
    previous_status is null or previous_status in ('Under verification', 'Verified', 'Authority notified', 'Resolved', 'Rejected')
  ),
  constraint report_history_new_status_allowed check (
    new_status in ('Under verification', 'Verified', 'Authority notified', 'Resolved', 'Rejected')
  ),
  constraint report_history_note_length check (note is null or char_length(note) <= 1000)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  title text not null,
  message text not null,
  related_report_id uuid references public.reports(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_length check (char_length(btrim(notification_type)) between 1 and 50),
  constraint notifications_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint notifications_message_length check (char_length(btrim(message)) between 1 and 2000)
);

create index reports_created_at_idx on public.reports (created_at desc);
create index reports_status_created_at_idx on public.reports (status, created_at desc);
create index reports_category_created_at_idx on public.reports (category, created_at desc);
create index reports_reporter_created_at_idx on public.reports (reporter_id, created_at desc);
create index reports_jurisdiction_idx on public.reports (jurisdiction);
create index authority_assignments_scope_active_idx on public.authority_assignments (jurisdiction, authority_profile_id) where active;
create index report_status_history_report_changed_idx on public.report_status_history (report_id, changed_at desc);
create index notifications_recipient_created_idx on public.notifications (recipient_user_id, created_at desc);
create index notifications_recipient_unread_idx on public.notifications (recipient_user_id, created_at desc) where read_at is null;

alter table public.reports enable row level security;
alter table public.authority_assignments enable row level security;
alter table public.report_status_history enable row level security;
alter table public.notifications enable row level security;

-- Remove any project default grants on these new public-schema tables, then
-- grant only the columns/operations required by the application.
revoke all on table public.reports, public.authority_assignments,
  public.report_status_history, public.notifications
  from public, anon, authenticated;

grant select (id, title, category, description, severity, status, location_name,
  latitude, longitude, created_at, updated_at, reviewed_at, resolved_at)
  on public.reports to anon, authenticated;
grant insert (category, description, severity, location_name, latitude, longitude)
  on public.reports to authenticated;
grant update (status) on public.reports to authenticated;

grant select (id, report_id, previous_status, new_status, changed_at, note)
  on public.report_status_history to anon, authenticated;
grant select (id, notification_type, title, message, related_report_id, read_at, created_at)
  on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

grant select (id, authority_profile_id, jurisdiction, active, assigned_by, created_at, updated_at)
  on public.authority_assignments to authenticated;
grant insert (authority_profile_id, jurisdiction, active)
  on public.authority_assignments to authenticated;
grant update (jurisdiction, active) on public.authority_assignments to authenticated;

-- Private-schema helpers run as the migration owner to avoid recursive RLS
-- lookups across profiles, reports, and assignments. Their inputs are narrowly
-- scoped and every user lookup is anchored to auth.uid(). Keep `private` out of
-- the Supabase Data API's Exposed Schemas list.
create or replace function private.riskscape_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;
revoke all on function private.riskscape_is_admin() from public, anon, authenticated;
grant execute on function private.riskscape_is_admin() to authenticated;

-- The existing profile policy used an RPC-exposed SECURITY DEFINER helper.
-- Keep its admin visibility behavior while moving the policy check into the
-- unexposed private schema, then disable direct calls to the public helper.
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.riskscape_is_admin()));
revoke all on function public.riskscape_has_role(text) from public, anon, authenticated;

create or replace function private.riskscape_owns_report(p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.reports r
    where r.id = p_report_id and r.reporter_id = (select auth.uid())
  );
$$;
revoke all on function private.riskscape_owns_report(uuid) from public, anon, authenticated;
grant execute on function private.riskscape_owns_report(uuid) to authenticated;

create or replace function private.riskscape_can_review_report(p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and (
        p.role = 'admin'
        or (
          p.role = 'authority'
          and exists (
            select 1
            from public.authority_assignments a
            join public.reports r on r.jurisdiction = a.jurisdiction
            where a.authority_profile_id = p.id
              and a.active
              and r.id = p_report_id
          )
        )
      )
  );
$$;
revoke all on function private.riskscape_can_review_report(uuid) from public, anon, authenticated;
grant execute on function private.riskscape_can_review_report(uuid) to authenticated;

create or replace function private.riskscape_can_read_report(p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.reports r
    where r.id = p_report_id
      and (
        r.status <> 'Rejected'
        or r.reporter_id = (select auth.uid())
        or private.riskscape_can_review_report(r.id)
      )
  );
$$;
revoke all on function private.riskscape_can_read_report(uuid) from public, anon, authenticated;
grant execute on function private.riskscape_can_read_report(uuid) to authenticated;

-- Public report fields are readable, but rejected items are visible only to
-- their author and authorized reviewers. Reviewer metadata and reporter IDs
-- are deliberately omitted from client SELECT privileges.
create policy reports_read_public
  on public.reports for select to anon, authenticated
  using (status <> 'Rejected');
create policy reports_read_own
  on public.reports for select to authenticated
  using (private.riskscape_owns_report(id));
create policy reports_read_assigned_review
  on public.reports for select to authenticated
  using (private.riskscape_can_review_report(id));
create policy reports_create_as_self
  on public.reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and status = 'Under verification'
    and jurisdiction = 'Vidyavihar, Mumbai'
  );
create policy reports_review_assigned_status
  on public.reports for update to authenticated
  using (private.riskscape_can_review_report(id))
  with check (private.riskscape_can_review_report(id));

-- Only administrators can manage jurisdiction scopes. The target must already
-- have the trusted `authority` profile role; assignment rows never grant roles.
create policy authority_assignments_admin_read
  on public.authority_assignments for select to authenticated
  using (private.riskscape_is_admin());
create policy authority_assignments_admin_insert
  on public.authority_assignments for insert to authenticated
  with check (
    private.riskscape_is_admin()
    and exists (
      select 1 from public.profiles p
      where p.id = authority_profile_id and p.role = 'authority'
    )
  );
create policy authority_assignments_admin_update
  on public.authority_assignments for update to authenticated
  using (private.riskscape_is_admin())
  with check (
    private.riskscape_is_admin()
    and exists (
      select 1 from public.profiles p
      where p.id = authority_profile_id and p.role = 'authority'
    )
  );

-- Status history is append-only from the client's perspective. Only public
-- status changes are shown to everyone; rejected-report history is private to
-- its reporter and assigned reviewers.
create policy report_history_read_public
  on public.report_status_history for select to anon, authenticated
  using (
    exists (
      select 1 from public.reports r
      where r.id = report_id and r.status <> 'Rejected'
    )
  );
create policy report_history_read_private
  on public.report_status_history for select to authenticated
  using (private.riskscape_can_read_report(report_id));

create policy notifications_read_own
  on public.notifications for select to authenticated
  using (recipient_user_id = (select auth.uid()));
create policy notifications_mark_own_read
  on public.notifications for update to authenticated
  using (recipient_user_id = (select auth.uid()))
  with check (recipient_user_id = (select auth.uid()));

-- Assignment audit fields and scope timestamps are database-owned.
create or replace function private.riskscape_touch_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.assigned_by := (select auth.uid());
    new.created_at := now();
  else
    new.authority_profile_id := old.authority_profile_id;
    new.assigned_by := old.assigned_by;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.riskscape_touch_assignment() from public, anon, authenticated;

create trigger authority_assignments_set_audit
  before insert or update on public.authority_assignments
  for each row execute function private.riskscape_touch_assignment();

-- The trigger sets reporter_id, status, and jurisdiction rather than trusting
-- client fields. Review metadata is only written for valid authorized changes.
create or replace function private.riskscape_prepare_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_actor_role text;
  v_trusted_server boolean;
  v_valid_transition boolean;
begin
  v_actor_id := (select auth.uid());
  v_trusted_server := coalesce((select auth.jwt() ->> 'role'), '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin');

  if tg_op = 'INSERT' then
    if v_actor_id is null or coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') = 'true' then
      raise exception 'A signed-in community account is required to create a report.' using errcode = '42501';
    end if;
    new.reporter_id := v_actor_id;
    new.status := 'Under verification';
    new.jurisdiction := 'Vidyavihar, Mumbai';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.resolved_by := null;
    new.resolved_at := null;
    new.created_at := now();
    new.updated_at := now();
    if char_length(btrim(coalesce(new.title, ''))) = 0 then
      new.title := left(btrim(new.category), 160);
    end if;
    return new;
  end if;

  if new.reporter_id is distinct from old.reporter_id
    or new.jurisdiction is distinct from old.jurisdiction
    or new.created_at is distinct from old.created_at then
    raise exception 'Report ownership, jurisdiction, and creation time are immutable.' using errcode = '42501';
  end if;

  new.reviewed_by := old.reviewed_by;
  new.reviewed_at := old.reviewed_at;
  new.resolved_by := old.resolved_by;
  new.resolved_at := old.resolved_at;
  new.updated_at := now();

  if new.status is distinct from old.status then
    if v_actor_id is null and not v_trusted_server then
      raise exception 'A trusted reviewer is required to change report status.' using errcode = '42501';
    end if;

    if v_actor_id is not null then
      select p.role into v_actor_role from public.profiles p where p.id = v_actor_id;
      if coalesce(v_actor_role, '') not in ('authority', 'admin') then
        raise exception 'Only an assigned authority or administrator can change report status.' using errcode = '42501';
      end if;
      if v_actor_role = 'authority' and not private.riskscape_can_review_report(old.id) then
        raise exception 'This authority account is not assigned to the report jurisdiction.' using errcode = '42501';
      end if;
    end if;

    v_valid_transition :=
      (old.status = 'Under verification' and new.status in ('Verified', 'Authority notified', 'Rejected'))
      or (old.status = 'Verified' and new.status in ('Authority notified', 'Resolved', 'Rejected'))
      or (old.status = 'Authority notified' and new.status in ('Resolved', 'Rejected'));

    if not v_trusted_server and coalesce(v_actor_role, '') <> 'admin' and not v_valid_transition then
      raise exception 'The requested report status transition is not permitted.' using errcode = '23514';
    end if;

    if new.status in ('Verified', 'Authority notified', 'Resolved', 'Rejected') then
      new.reviewed_at := coalesce(old.reviewed_at, now());
      new.reviewed_by := coalesce(old.reviewed_by, v_actor_id);
    end if;
    if new.status = 'Resolved' then
      new.resolved_at := now();
      new.resolved_by := v_actor_id;
    elsif old.status = 'Resolved' then
      new.resolved_at := null;
      new.resolved_by := null;
    end if;
  end if;

  return new;
end;
$$;
revoke all on function private.riskscape_prepare_report() from public, anon, authenticated;

create or replace function private.riskscape_record_report_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.report_status_history (report_id, previous_status, new_status, actor_user_id)
    values (new.id, null, new.status, (select auth.uid()));
  elsif new.status is distinct from old.status then
    insert into public.report_status_history (report_id, previous_status, new_status, actor_user_id)
    values (new.id, old.status, new.status, (select auth.uid()));

    if new.reporter_id is not null and new.reporter_id is distinct from (select auth.uid()) then
      insert into public.notifications (recipient_user_id, notification_type, title, message, related_report_id)
      values (
        new.reporter_id,
        'report_status',
        'Report status updated',
        'Your report status changed to ' || new.status || '.',
        new.id
      );
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.riskscape_record_report_status() from public, anon, authenticated;

create trigger reports_prepare_write
  before insert or update on public.reports
  for each row execute function private.riskscape_prepare_report();
create trigger reports_record_status
  after insert or update on public.reports
  for each row execute function private.riskscape_record_report_status();

-- A reporter can list their own reports without exposing reporter UUIDs on the
-- public reports API. This no-argument RPC can only return rows for auth.uid().
create or replace function public.get_my_reports()
returns table (
  id uuid,
  title text,
  category text,
  description text,
  severity text,
  status text,
  location_name text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz,
  updated_at timestamptz,
  reviewed_at timestamptz,
  resolved_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.title, r.category, r.description, r.severity, r.status,
    r.location_name, r.latitude, r.longitude, r.created_at, r.updated_at,
    r.reviewed_at, r.resolved_at
  from public.reports r
  where (select auth.uid()) is not null
    and r.reporter_id = (select auth.uid())
  order by r.created_at desc;
$$;
revoke all on function public.get_my_reports() from public, anon, authenticated;
grant execute on function public.get_my_reports() to authenticated;

comment on table public.reports is 'Public climate-risk reports; reporter and reviewer identifiers are not selectable by API clients.';
comment on table public.authority_assignments is 'Admin-managed jurisdiction scopes; assignments never grant the authority role.';
comment on table public.report_status_history is 'Append-only status audit events written by database triggers.';
comment on table public.notifications is 'Private per-user notifications; status-change notifications are written by a trusted trigger.';
comment on column public.reports.jurisdiction is 'Database-assigned jurisdiction key used for exact-match authority scope checks.';


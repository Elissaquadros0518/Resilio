-- Private report evidence metadata and Storage authorization.
-- Create the private Storage bucket `riskscape-report-evidence` in the Dashboard
-- before applying this migration; keep private schemas out of exposed API schemas.

create table public.report_media (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete restrict,
  uploader_id uuid references auth.users(id) on delete set null,
  object_path text not null unique,
  media_type text not null,
  uploaded_at timestamptz not null default now(),
  constraint report_media_type_allowed check (media_type in ('image', 'video')),
  constraint report_media_path_shape check (
    object_path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[a-z0-9][a-z0-9._-]{0,119}$'
  )
);

create index report_media_report_uploaded_idx on public.report_media (report_id, uploaded_at desc);
alter table public.report_media enable row level security;
revoke all on table public.report_media from public, anon, authenticated;
grant select (id, report_id, object_path, media_type, uploaded_at) on public.report_media to authenticated;
grant insert (report_id, object_path, media_type) on public.report_media to authenticated;

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
  v_folder := split_part(p_object_path, '/', 1);
  v_report_id := v_folder::uuid;
  return private.riskscape_owns_report(v_report_id)
    or private.riskscape_can_review_report(v_report_id);
end;
$$;
revoke all on function private.riskscape_can_access_report_object(text) from public, anon, authenticated;
grant execute on function private.riskscape_can_access_report_object(text) to authenticated;

create or replace function private.riskscape_can_upload_report_object(p_object_path text)
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
  v_folder := split_part(p_object_path, '/', 1);
  v_report_id := v_folder::uuid;
  return exists (
    select 1 from public.reports r
    where r.id = v_report_id
      and r.reporter_id = (select auth.uid())
      and r.status = 'Under verification'
  );
end;
$$;
revoke all on function private.riskscape_can_upload_report_object(text) from public, anon, authenticated;
grant execute on function private.riskscape_can_upload_report_object(text) to authenticated;

create or replace function private.riskscape_has_owned_report_object(p_object_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from storage.objects o
    where o.bucket_id = 'riskscape-report-evidence'
      and o.name = p_object_path
      and o.owner_id = (select auth.uid())::text
  );
$$;
revoke all on function private.riskscape_has_owned_report_object(text) from public, anon, authenticated;
grant execute on function private.riskscape_has_owned_report_object(text) to authenticated;

create or replace function private.riskscape_prepare_report_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.uploader_id := (select auth.uid());
  new.uploaded_at := now();
  if new.uploader_id is null
    or not private.riskscape_can_upload_report_object(new.object_path)
    or not private.riskscape_has_owned_report_object(new.object_path) then
    raise exception 'Evidence must be uploaded by the report owner to its private report folder.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.riskscape_prepare_report_media() from public, anon, authenticated;

create trigger report_media_prepare_insert
  before insert on public.report_media
  for each row execute function private.riskscape_prepare_report_media();

create policy report_media_read_authorized
  on public.report_media for select to authenticated
  using (
    private.riskscape_owns_report(report_id)
    or private.riskscape_can_review_report(report_id)
  );
create policy report_media_insert_owner
  on public.report_media for insert to authenticated
  with check (
    uploader_id = (select auth.uid())
    and private.riskscape_owns_report(report_id)
    and private.riskscape_can_upload_report_object(object_path)
  );

-- Supabase Storage owns its schema and files. These policies authorize use of
-- the API only; they do not insert, update, or delete storage.objects directly.
create policy riskscape_report_evidence_read_authorized
  on storage.objects for select to authenticated
  using (
    bucket_id = 'riskscape-report-evidence'
    and private.riskscape_can_access_report_object(name)
  );

create policy riskscape_report_evidence_upload_owner
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'riskscape-report-evidence'
    and private.riskscape_can_upload_report_object(name)
  );

comment on table public.report_media is 'Private metadata for evidence stored in the private riskscape-report-evidence bucket.';
comment on column public.report_media.object_path is 'Storage object key in the form <report UUID>/<filename>; use signed URLs for viewing.';


# Supabase setup

## Configuration

1. Create a Supabase project.
2. In **Project Settings → API**, copy the Project URL and publishable key (or legacy `anon` key). Add them to a local `.env` file as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, using `.env.example` as the format. Restart Vite after changing environment values.
3. Never put a `service_role` key or database password in any `VITE_` variable or frontend file. `.env` is ignored by Git.
4. In **Authentication → URL Configuration**, add local and deployed app origins to the allowed redirect URLs. Configure the email provider and confirmation policy as desired. Configure SMTP/email templates for production; Supabase's default mail service is rate-limited and intended for development.

## Weather data

Risk Insights uses the Open-Meteo Forecast API (`https://api.open-meteo.com/v1/forecast`) for modelled current conditions and a 5-day daily forecast. The free endpoint requires no API key, so there is no weather secret to put in the browser or Supabase. `VITE_WEATHER_API_BASE_URL` in `.env` is an optional public endpoint override; it is not a credential. A successful response is cached in memory per rounded location for 10 minutes. Failures do not substitute fabricated readings, and the UI shows the weather-model timestamp separately from retrieval time.

The free API is limited to non-commercial use (currently less than 10,000 calls/day, 5,000/hour, and 600/minute), has no uptime guarantee, and requires Open-Meteo attribution under CC BY 4.0. Review the current [Open-Meteo terms](https://open-meteo.com/en/terms) and [pricing](https://open-meteo.com/en/pricing) before deployment. For commercial use, obtain an Open-Meteo subscription and move its API key to a trusted backend (for example a Supabase Edge Function secret); never add it to a `VITE_` variable. The current implementation intentionally uses the free non-commercial endpoint and does not claim an uptime guarantee.

## Apply database migrations

The Supabase CLI is not installed in this workspace. Use the project's **SQL Editor** and run the migration files in timestamp order. Paste and run each complete file once:

1. `supabase/migrations/202610140001_profiles_auth_rbac.sql`
2. `supabase/migrations/202610140002_profiles_backfill_and_hardening.sql`
3. `supabase/migrations/202610140003_revoke_anon_role_helper.sql`
4. `supabase/migrations/202610150001_reports_rbac_and_notifications.sql`
5. Create the private Storage bucket described below.
6. `supabase/migrations/202610150002_private_report_media.sql`
7. `supabase/migrations/202610150003_reporter_withdrawal.sql`
8. `supabase/migrations/202610150004_harden_report_rpcs.sql`
9. `supabase/migrations/202610150005_authority_review_workflow.sql`
10. `supabase/migrations/202610150006_two_role_manual_authority_approval.sql`
11. `supabase/migrations/202610180001_secure_two_role_authority_applications.sql`
12. `supabase/migrations/202610180002_owner_authority_application_decisions.sql`

Older project notes recorded several migrations and the private evidence bucket as applied, but repository documentation cannot verify the current live database state. Check the Supabase migration history and schema before applying files; apply only missing migrations in order. Apply migrations 005–008 once, in order. For a fresh project, apply every file in timestamp order, creating the private bucket before migration 002. Confirm the existing `riskscape-report-evidence` bucket settings in the dashboard before applying its migration.

### Create the private evidence bucket

In **Storage → New bucket**, create:

- Name/ID: `riskscape-report-evidence`
- Public bucket: **off**
- Maximum file size: **10 MB**
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `video/mp4`

Then apply migration 002. Evidence object keys must have this form: `<report UUID>/<lowercase-filename>`. The owner uploads through the Supabase Storage API, then inserts the matching row into `report_media`. Use authenticated downloads or short-lived signed URLs; never make this bucket public. No SQL in these migrations writes directly to Supabase's managed `storage.objects` table.

## Schema and UI field mapping

- `profiles`: reuses the existing Auth UUID, display name, constrained role, and timestamps. The only application roles are `user` and `authority`; signup always creates `user`. Migration 006 converts old `admin` profile roles to `user` without changing IDs.
- `reports`: UUID `id`; `reporter_id`; `title`; `category`; `description`; `severity`; `status`; `location_name`; nullable latitude/longitude; database-assigned jurisdiction; review/resolution actors and timestamps; created/updated timestamps.
- `report_media`: report UUID, uploader, private object path, `image`/`video` kind, and upload timestamp. No public URL is stored.
- `report_status_history`: append-only old/new status, actor, timestamp, optional note. A trigger writes the initial event and each status transition.
- `notifications`: private recipient, type/title/message, optional related report, read timestamp, and creation timestamp. Status changes create a notification for the report owner.
- `authority_assignments`: authority profile, legacy exact jurisdiction text, stable jurisdiction ID, active flag, assigning user, and audit timestamps. Assignments do not grant the authority role.
- `authority_applications`: applicant-owned application, requested jurisdiction ID and coordinates, status, review note/timestamps. Legacy requested text is retained for existing rows; new requests use a supported locality ID.

The existing UI shape maps as follows: `id` (now UUID string) → `id`; `category` → `category`; `location` → `location_name`; `lat`/`lng` → `latitude`/`longitude`; `severity` → `severity`; `status` → `status`; `description` → `description`. The form's `Moderate` becomes `MODERATE`, and existing mock `MEDIUM` is also accepted. `time` should be formatted from `created_at` by the client; `verified` is derived from status; `evidence` is a private Storage object resolved to a signed URL. Mock `user` names and `upvotes` are not public database fields; current visible pages do not consume `upvotes`. No demo reports are seeded into production.

Coordinates use latitude/longitude only. PostGIS is not required for the current Leaflet map, so this migration does not install an extension. The schema can be extended with a geography point and GiST index later if spatial queries become necessary; ordinary map rendering continues to work without it.

## Access model and policy notes

All tables in the exposed `public` schema have RLS enabled. Grants are narrowed separately from RLS. Report reads expose only public report columns; reporter UUID, jurisdiction, and reviewer/resolver IDs are withheld with column-level grants. Because of that, clients must request explicit columns rather than `select('*')`. `public.get_my_reports()` is a no-argument, authenticated-only RPC that returns only rows whose `reporter_id` equals the caller's `auth.uid()`.

Ordinary signed-in users may create a report as themselves, read public (non-rejected) report fields, and retrieve their own report history. They cannot change report status, ownership, jurisdiction, or review metadata. Status changes go through `public.review_report_status`, which locks the report, checks the authenticated role and active exact-jurisdiction assignment, validates the transition, and requires rejection notes. A trigger writes history and notification atomically. Stored statuses remain compatible with existing values: `Under verification` (new), `Authority notified` (in review), `Verified`, `Resolved`, and `Rejected`. This workflow has no reopen transition.

Applicants can submit one application per Auth account and read only their own application; they cannot change its status, review fields, role, or jurisdiction assignments. Approval and rejection are manual through the Supabase SQL Editor using the owner-only functions in migration 008. Application decisions, profile changes, and any assignment write occur in one database transaction. RLS limits application records to the applicant; database-owner operations bypass RLS as intended. Signup metadata never grants roles. Jurisdiction choices come from the active `public.jurisdictions` table; the current database seeds only the project's existing `Vidyavihar, Mumbai` scope. Both authority assignments and report rows use its stable ID for authorization. The dashboard uses `public.get_authority_reports`, which returns only rows with an active matching authority assignment.

Policy helper functions live in the unexposed `private` schema to avoid calling security-definer helpers through the public Data API. The helpers use a fixed empty `search_path`, fully qualified objects, and `auth.uid()` ownership checks. Keep `private` out of **Project Settings → API → Exposed schemas**. The report migration replaces the existing profile read policy with an equivalent private-helper check, then revokes authenticated/anonymous RPC execution on the old public `riskscape_has_role(text)` helper. The own-profile update policy remains limited by the existing column grant to `display_name`.

Notifications are readable and markable as read only by their recipient. Status history is append-only from client roles. Evidence metadata is readable only by the report owner or an authorized reviewer. The Storage bucket is private; Storage policies permit only the owner to upload into a pending report's UUID folder and permit reads only to the owner or an authorized reviewer. Client deletion and overwrite of report/media audit rows remain unavailable. The authenticated-only `withdraw_my_report(uuid)` RPC allows a reporter to withdraw only their own report while its status remains `Under verification` and `reviewed_at` is null. This is a soft deletion: the report disappears from public and owner-facing report lists, while its audit history and private evidence are retained for authorized reviewers. Reviewed reports cannot be withdrawn by their owner. Deleting the Auth user anonymizes report ownership and removes that user's notifications; history remains.

## Manual owner approval and authority assignment

There is no application `admin` role, admin login, or Admin Dashboard. Sign in to Supabase as the project owner and use Table Editor to find a pending `authority_applications` row. Verify `applicant_id` against the Auth user UUID, review organization/designation, and select an active supported jurisdiction ID. Do not rely on an email or client-entered name as identity proof.

For approval, call the owner-only operation as the Supabase project owner in SQL Editor. Verify the application and Auth UUID independently before running it. The function checks that the application is pending, its profile is linked to the expected `auth.users` UUID and still has role `user`, its requested locality is active, and no assignment already exists for that stable service-area ID. The trigger updates `profiles.role`, inserts the assignment, and records timestamps as part of the same transaction. If any step fails, all changes roll back. `reviewed_by` remains null because SQL Editor has no application-user identity.

Before applying migration 008 or running either operation, check `select session_user;`. It must return `postgres` or `supabase_admin`. The functions use `SECURITY DEFINER` with an empty `search_path`; `EXECUTE` is revoked from `PUBLIC`, `anon`, `authenticated`, and `service_role`. No execution grant is given to browser/API roles; the trusted migration owner retains ownership and can call the functions in SQL Editor.

```sql
select public.owner_approve_authority_application(
  'PENDING_APPLICATION_UUID'::uuid,
  'EXPECTED_AUTH_USER_UUID'::uuid,
  'OWNER_REVIEW_NOTE'
);
```

For rejection, include an optional review note. The profile remains `user` and no assignment is created:

```sql
select public.owner_reject_authority_application(
  'PENDING_APPLICATION_UUID'::uuid,
  'EXPECTED_AUTH_USER_UUID'::uuid,
  'REJECTION_REASON'
);
```

To revoke authority access without deleting audit or report data, change the profile back to `user` and deactivate the scoped assignment in one transaction:

```sql
begin;
do $$
declare
  v_auth_user uuid := 'AUTHORITY_AUTH_USER_UUID';
  v_updated integer;
begin
  update public.profiles set role = 'user' where id = v_auth_user;
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then raise exception 'Expected one authority profile; revocation was not committed'; end if;
  update public.authority_assignments set active = false where authority_profile_id = v_auth_user;
end $$;
commit;
```

This owner-only transaction removes authority access by resetting the trusted role and deactivating every assignment for that profile. It preserves the application, report, and assignment records for audit.

Current reports are database-assigned to `Vidyavihar, Mumbai`; the seeded locality has no centroid coordinates in the existing schema, so requested coordinates are stored as null. New locality rows should be added only after the project owner verifies the locality and configures trusted report-to-jurisdiction mapping. The application selector accepts only database suggestions and stores the stable ID; typed text alone is rejected.

## Checks and remaining verification

The repository contains migrations through 202610180002; their live application state must be verified in Supabase before deployment. The owner-only SQL regression script is `supabase/tests/owner_authority_application_decisions.sql`; it needs a disposable pending application and Auth UUID, and ends every scenario with `ROLLBACK`. No live authenticated role matrix was exercised here; after applying the missing migrations through 008, verify with dedicated test accounts:

1. Confirm Auth signup creates a `user` profile; existing profiles and reports remain intact.
2. Create a report as a signed-in user and confirm reporter ID/status/jurisdiction are database-owned.
3. Confirm anon/authenticated clients can read public report columns but cannot select reporter/reviewer IDs or rejected reports.
4. Confirm `get_my_reports()` returns only the caller's reports, and another user's row is absent.
5. Attempt reporter ID, jurisdiction, and status changes as a normal user; each must fail. Test valid and invalid status transitions as an assigned authority and as an unassigned authority.
6. Confirm only Supabase project-owner SQL operations can create/change assignments; ordinary users and authorities cannot.
7. Upload evidence to a private pending report, attach its metadata, and verify only its owner or assigned authority can download it or create a signed URL. Check that another user's upload and overwrite attempts fail.
8. Confirm status events are append-only and recipient notifications are private and can only be marked read by the recipient.
9. As a reporter, withdraw an `Under verification` report and confirm it disappears from the public map and `get_my_reports()` while its audit history remains; verify an attempted withdrawal of another user's or reviewed report fails and private evidence remains inaccessible to ordinary users after withdrawal.
10. Submit an authority application and confirm its profile remains `user`; the applicant can read only its own pending status.
11. As project owner, run the documented approval and rejection transactions; confirm approval creates the role and exact assignment atomically and rejection leaves a user profile unchanged.
12. As an approved authority, verify only assigned reports are listed. Exercise `Under verification` → `Authority notified` → `Verified` → `Resolved`, rejection with and without a reason, wrong-scope attempts, duplicate/concurrent actions, and direct status/audit writes.

The community report and map pages continue using the existing Supabase flow. Migration 006 enforces the two-role model, canonical jurisdiction IDs, owner-only manual application review, and assigned report review without replacing community authentication.

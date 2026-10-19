-- Allow report submissions to omit the optional description.
-- Keep the column non-null and retain the existing 5,000-character limit.
begin;

alter table public.reports
  drop constraint if exists reports_description_length;

alter table public.reports
  add constraint reports_description_length
  check (char_length(btrim(description)) between 0 and 5000);

comment on constraint reports_description_length on public.reports is
  'Descriptions are optional; when present they are limited to 5,000 characters.';

commit;

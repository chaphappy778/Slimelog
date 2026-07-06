-- 2026-07-06 audit blocker #2: profile_links.url stored XSS
--
-- Before this change, URL validation was client-only in
-- app/settings/profile/page.tsx (`startsWith('https://')`) and the
-- browser Supabase client wrote directly to `profile_links`. A user
-- calling PostgREST directly could bypass the check and insert a link
-- with `url='javascript:...'` or any other scheme. The public profile
-- page (app/users/[username]/page.tsx) rendered the value raw as
-- `<a href={link.url}>`, so this became stored XSS on every viewer.
--
-- Add a DB-level CHECK constraint that only allows http:// or https://
-- URLs. Case-insensitive regex mirrors the render-side guard added in
-- the same commit so the two checks agree on what "valid" means.
--
-- If historical rows exist that violate the constraint they'll block
-- this migration; run a cleanup pass first if the ALTER TABLE fails
-- (none observed at authoring time — profile_links is new-ish and the
-- write path has always required https://).

ALTER TABLE public.profile_links
  ADD CONSTRAINT profile_links_url_http_only
  CHECK (url ~* '^https?://');

COMMENT ON CONSTRAINT profile_links_url_http_only ON public.profile_links
  IS 'Audit blocker #2 (2026-07-06). Rejects javascript:, data:, file:, and other non-http(s) schemes at the DB level so client-side validation can''t be bypassed via direct PostgREST calls.';

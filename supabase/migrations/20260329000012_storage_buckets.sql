-- =============================================================================
-- SlimeLog · Storage Buckets + RLS Policies
-- Migration: 20260329000011_storage_buckets.sql
-- =============================================================================

-- ─── Buckets ──────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'slime-photos',
  'slime-photos',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- RLS POLICIES — slime-photos
-- =============================================================================
-- Path convention: {user_id}/{timestamp}-{random}.webp
-- The first path segment must equal the authenticated user's UUID.
-- This is enforced by splitting storage.filename() on '/' and comparing [1].
-- NOTE: storage.objects RLS uses (bucket_id, name) where `name` is the
-- full object path (e.g. "abc-uuid/1234567890-abcd.webp").
-- =============================================================================

-- Anyone can read public slime photos
CREATE POLICY "slime_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'slime-photos');

-- Authenticated users can upload only into their own folder
-- Path format: {user_id}/{filename}  →  split_part(name, '/', 1) = auth.uid()::text
CREATE POLICY "slime_photos_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'slime-photos'
    AND auth.role() = 'authenticated'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Users can update their own objects (e.g. upsert metadata — rarely needed)
CREATE POLICY "slime_photos_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'slime-photos'
    AND auth.role() = 'authenticated'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Users can delete their own photos
CREATE POLICY "slime_photos_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'slime-photos'
    AND auth.role() = 'authenticated'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- =============================================================================
-- RLS POLICIES — avatars
-- =============================================================================
-- Path convention: {user_id}/{filename}  (same folder-per-user pattern)
-- =============================================================================

-- Anyone can read avatars (they're referenced in public profiles)
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated users can upload only into their own folder
CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Users can update their own avatar objects
CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Users can delete their own avatar
CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- =============================================================================
-- ⚠️  RLS NOTES
-- =============================================================================
-- 1. storage.objects RLS must be ENABLED on the table for these policies to
--    take effect. Supabase does this by default; no manual ALTER TABLE needed.
--
-- 2. split_part(name, '/', 1) extracts the first path segment (the user UUID).
--    This prevents user A from uploading to user B's folder even if they craft
--    a path manually. It also prevents uploads to the bucket root (no slash →
--    split_part returns the whole name, which won't match any UUID).
--
-- 3. The avatars bucket allows only one "active" avatar per user by
--    convention — the app should delete the old object before uploading a new
--    one, or use a fixed filename (e.g. {user_id}/avatar.webp) with upsert.
--
-- 4. Service-role clients (Edge Functions, server actions using the service key)
--    bypass RLS entirely. Never expose the service key to the browser.
-- =============================================================================
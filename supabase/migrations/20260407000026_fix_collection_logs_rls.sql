-- Remove duplicate and overly permissive RLS policies on collection_logs
-- Consolidate to 4 clean authenticated-only policies

-- Drop all existing policies
DROP POLICY IF EXISTS "Public logs are readable by everyone" ON public.collection_logs;
DROP POLICY IF EXISTS "Users can create their own log entries" ON public.collection_logs;
DROP POLICY IF EXISTS "Users can delete their own log entries" ON public.collection_logs;
DROP POLICY IF EXISTS "Users can update their own log entries" ON public.collection_logs;
DROP POLICY IF EXISTS "owners_delete_own_logs" ON public.collection_logs;
DROP POLICY IF EXISTS "owners_insert_own_logs" ON public.collection_logs;
DROP POLICY IF EXISTS "owners_select_own_logs" ON public.collection_logs;
DROP POLICY IF EXISTS "owners_update_own_logs" ON public.collection_logs;

-- Recreate clean, minimal policy set

-- SELECT: authenticated users can read public logs or their own logs
CREATE POLICY "collection_logs_select"
ON public.collection_logs FOR SELECT
TO authenticated
USING ((is_public = true) OR (auth.uid() = user_id));

-- INSERT: authenticated users can only insert their own logs
CREATE POLICY "collection_logs_insert"
ON public.collection_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: authenticated users can only update their own logs
CREATE POLICY "collection_logs_update"
ON public.collection_logs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: authenticated users can only delete their own logs
CREATE POLICY "collection_logs_delete"
ON public.collection_logs FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
-- supabase/migrations/20260502000033_brand_claims.sql
-- Brand claiming flow: enum, brand_claims table, indexes, RLS,
-- and brand-claim-documents storage bucket + policies.

-- ─── Enum ────────────────────────────────────────────────────────────────────

CREATE TYPE brand_claim_status AS ENUM (
  'pending_email_verification',
  'pending_review',
  'approved',
  'rejected',
  'auto_rejected'
);

-- ─── Table ───────────────────────────────────────────────────────────────────

CREATE TABLE brand_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status brand_claim_status NOT NULL DEFAULT 'pending_email_verification',

  -- Claimant info (required)
  full_legal_name text NOT NULL,
  role text NOT NULL,
  business_email text NOT NULL,

  -- Email verification
  email_verification_code text,
  email_verification_sent_at timestamptz,
  email_verification_expires_at timestamptz,
  email_verified_at timestamptz,

  -- Document upload
  document_storage_path text,
  document_filename text,
  document_uploaded_at timestamptz,

  -- Optional fields
  instagram_handle text,
  additional_notes text,

  -- Admin review
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX brand_claims_brand_id_idx ON brand_claims(brand_id);
CREATE INDEX brand_claims_user_id_idx ON brand_claims(user_id);
CREATE INDEX brand_claims_status_idx ON brand_claims(status);
CREATE INDEX brand_claims_pending_review_idx
  ON brand_claims(created_at DESC)
  WHERE status = 'pending_review';

-- ─── updated_at trigger ──────────────────────────────────────────────────────

-- Reuse set_updated_at() if it already exists; create defensively otherwise.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brand_claims_updated_at
  BEFORE UPDATE ON brand_claims
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE brand_claims ENABLE ROW LEVEL SECURITY;

-- Users can read their own claims only
CREATE POLICY "Users read own claims"
  ON brand_claims FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own claims only
CREATE POLICY "Users insert own claims"
  ON brand_claims FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own claims ONLY when status is pending_email_verification
-- (for entering the email code). Once verified, claim is locked.
CREATE POLICY "Users update own pending claims"
  ON brand_claims FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status = 'pending_email_verification'
  )
  WITH CHECK (user_id = auth.uid());

-- Admin operations (approve, reject, list all claims) go through the service
-- role client and bypass RLS — no admin policy required here.

-- ─── Storage bucket ──────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-claim-documents',
  'brand-claim-documents',
  false,
  10485760, -- 10 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
);

-- ─── Storage RLS policies ────────────────────────────────────────────────────

-- Users can upload to their own folder only ({user_id}/...)
CREATE POLICY "Users upload to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'brand-claim-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own files
CREATE POLICY "Users read own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'brand-claim-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- No DELETE policy for users — claim documents are immutable for audit trail.
-- Service role handles any admin-side deletion.
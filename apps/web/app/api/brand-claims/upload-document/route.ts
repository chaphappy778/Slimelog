// apps/web/app/api/brand-claims/upload-document/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"];
const STORAGE_BUCKET = "brand-claim-documents";

export async function POST(req: Request) {
  // 1. Auth.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse form data.
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const claimId = form.get("claim_id");
  const fileEntry = form.get("file");

  if (typeof claimId !== "string" || !claimId) {
    return NextResponse.json(
      { error: "claim_id is required." },
      { status: 400 },
    );
  }
  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }

  const file = fileEntry;

  // 3. Validate file.
  if (file.size <= 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File is too large. Max 10MB." },
      { status: 400 },
    );
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PDF, JPG, or PNG files are allowed." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // 4. Verify claim ownership + state.
  const { data: claim, error: claimErr } = await admin
    .from("brand_claims")
    .select("id, user_id, status")
    .eq("id", claimId)
    .maybeSingle();

  if (claimErr || !claim) {
    return NextResponse.json({ error: "Claim not found." }, { status: 404 });
  }
  if (claim.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (claim.status !== "pending_email_verification") {
    return NextResponse.json(
      { error: "This claim is no longer accepting documents." },
      { status: 409 },
    );
  }

  // 5. Sanitize filename + build storage path.
  const originalName = file.name || "document";
  const sanitized = sanitizeFilename(originalName);
  const timestamp = Date.now();
  const storagePath = `${user.id}/${claimId}/${timestamp}-${sanitized}`;

  // 6. Upload to Storage.
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadErr) {
    return NextResponse.json(
      { error: "Upload failed, please try again." },
      { status: 500 },
    );
  }

  // 7. Update claim row.
  const now = new Date().toISOString();
  const { error: updateErr } = await admin
    .from("brand_claims")
    .update({
      document_storage_path: storagePath,
      document_filename: originalName,
      document_uploaded_at: now,
      updated_at: now,
    })
    .eq("id", claimId);

  if (updateErr) {
    // Best-effort cleanup so we don't leave an orphaned blob.
    await admin.storage.from(STORAGE_BUCKET).remove([storagePath]);
    return NextResponse.json(
      { error: "Upload failed, please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    document_storage_path: storagePath,
    document_filename: originalName,
  });
}

function sanitizeFilename(name: string): string {
  const replaced = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "_")
    .replace(/_+/g, "_");
  return replaced.slice(0, 100) || "document";
}

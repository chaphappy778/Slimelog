// apps/web/app/api/brand-claims/upload-document/route.ts
//
// Audit hp-17 (2026-07-07): the previous implementation trusted the
// client-supplied `file.type` MIME (browsers set this from the file
// extension, so an attacker can lie freely) and used a filename
// sanitizer that didn't strip leading dots or block chained
// extensions like `document.pdf.html`. A polyglot upload — a file
// that's valid PDF at the start but continues with HTML/JS — became
// admin-side XSS when the reviewer opened the signed URL and the
// browser sniffed the tail as HTML.
//
// Three layers of defense here:
//   1. Server-side magic-byte sniff to determine the actual file type
//      from the first bytes. Reject anything that isn't PDF, JPEG, or
//      PNG.
//   2. Store using the sniffed content type — never the client MIME.
//   3. Filename sanitizer that strips leading dots and collapses to a
//      single canonical extension derived from the sniffed type.
//
// The admin download route (/api/admin/brand-claims/document-url)
// separately forces Content-Disposition: attachment so browsers
// download rather than render, closing the XSS surface even if a
// malicious file ever slipped past sniffing.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const STORAGE_BUCKET = "brand-claim-documents";

// Sniffed types + their canonical extensions and content types.
type SniffedKind = "pdf" | "jpeg" | "png";

const KIND_META: Record<
  SniffedKind,
  { contentType: string; extension: string }
> = {
  pdf: { contentType: "application/pdf", extension: "pdf" },
  jpeg: { contentType: "image/jpeg", extension: "jpg" },
  png: { contentType: "image/png", extension: "png" },
};

/** Sniff the first bytes of the buffer. Returns null for anything
 *  that isn't a recognized PDF / JPEG / PNG header. */
function sniffKind(buffer: Buffer): SniffedKind | null {
  if (buffer.length < 4) return null;

  // PDF: 25 50 44 46  ('%PDF')
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return "pdf";
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }
  return null;
}

/** Produce a safe filename with a single canonical extension.
 *
 *  - Strips any leading dots (rejects `.htaccess`-style hidden files).
 *  - Removes path separators (/, \) entirely.
 *  - Collapses non-alphanumeric-safe chars to underscore.
 *  - Drops any extension the caller included and appends the canonical
 *    one derived from the sniffed kind. This means `document.pdf.html`
 *    becomes `document_pdf.pdf`.
 *  - Caps the base at 80 chars.
 */
function safeFilename(originalName: string, kind: SniffedKind): string {
  // Remove path separators before anything else so we can't be tricked
  // into writing outside our namespace via a filename with slashes.
  const noPath = originalName.replace(/[/\\]/g, "_");

  // Strip leading dots — no hidden files. Repeat to catch `..hidden`.
  const noLeadingDots = noPath.replace(/^\.+/, "");

  // Split on the last dot to strip the caller's extension. If there's
  // no dot, treat the whole thing as base.
  const lastDot = noLeadingDots.lastIndexOf(".");
  const rawBase =
    lastDot > 0 ? noLeadingDots.slice(0, lastDot) : noLeadingDots;

  // Canonicalize: lowercase, only safe chars, single underscores.
  const base = rawBase
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);

  const canonical = base.length > 0 ? base : "document";
  return `${canonical}.${KIND_META[kind].extension}`;
}

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

  // 3. Size guards. MIME is checked AFTER reading the buffer via
  // magic-byte sniff — file.type is client-controlled and cannot be
  // trusted.
  if (file.size <= 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File is too large. Max 10MB." },
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

  // 5. Read buffer and sniff type. This is the load-bearing check.
  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = sniffKind(buffer);
  if (!kind) {
    return NextResponse.json(
      {
        error:
          "Only PDF, JPG, or PNG files are allowed. Please re-upload with a supported file.",
      },
      { status: 400 },
    );
  }

  const { contentType: sniffedContentType } = KIND_META[kind];

  // 6. Safe filename + storage path.
  const originalName = file.name || "document";
  const sanitized = safeFilename(originalName, kind);
  const timestamp = Date.now();
  const storagePath = `${user.id}/${claimId}/${timestamp}-${sanitized}`;

  // 7. Upload with the SNIFFED contentType so future signed URLs
  // don't inherit an attacker-supplied MIME.
  const { error: uploadErr } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: sniffedContentType,
      upsert: false,
    });

  if (uploadErr) {
    return NextResponse.json(
      { error: "Upload failed, please try again." },
      { status: 500 },
    );
  }

  // 8. Update claim row. Store the SANITIZED filename so any UI that
  // displays it doesn't render the original attacker-crafted string.
  const now = new Date().toISOString();
  const { error: updateErr } = await admin
    .from("brand_claims")
    .update({
      document_storage_path: storagePath,
      document_filename: sanitized,
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
    document_filename: sanitized,
  });
}

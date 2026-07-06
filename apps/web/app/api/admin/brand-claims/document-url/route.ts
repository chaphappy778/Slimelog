// apps/web/app/api/admin/brand-claims/document-url/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/is-admin-check";

export const runtime = "nodejs";

const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

function inferMimeType(filename: string | null, storagePath: string): string {
  const target = (filename ?? storagePath).toLowerCase();
  if (target.endsWith(".pdf")) return "application/pdf";
  if (target.endsWith(".png")) return "image/png";
  if (target.endsWith(".jpg") || target.endsWith(".jpeg")) return "image/jpeg";
  if (target.endsWith(".webp")) return "image/webp";
  if (target.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}

export async function GET(req: Request) {
  // Auth gate
  const authClient = await createClient();
  const {
    data: { user: adminUser },
  } = await authClient.auth.getUser();

  // Audit hp-9 (2026-07-06): role-based admin check.
  if (!(await isAdminUser(authClient, adminUser))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse query
  const url = new URL(req.url);
  const claimId = url.searchParams.get("claim_id");
  if (!claimId) {
    return NextResponse.json(
      { error: "claim_id is required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: claim, error: claimErr } = await admin
    .from("brand_claims")
    .select("id, document_storage_path, document_filename")
    .eq("id", claimId)
    .maybeSingle();

  if (claimErr || !claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  if (!claim.document_storage_path) {
    return NextResponse.json(
      { error: "No document attached to this claim." },
      { status: 400 },
    );
  }

  const { data, error: signedErr } = await admin.storage
    .from("brand-claim-documents")
    .createSignedUrl(
      claim.document_storage_path as string,
      SIGNED_URL_EXPIRY_SECONDS,
    );

  if (signedErr || !data?.signedUrl) {
    return NextResponse.json(
      {
        error: `Failed to generate signed URL: ${
          signedErr?.message ?? "unknown error"
        }`,
      },
      { status: 500 },
    );
  }

  const mime_type = inferMimeType(
    claim.document_filename as string | null,
    claim.document_storage_path as string,
  );

  return NextResponse.json({
    signed_url: data.signedUrl,
    mime_type,
    filename: claim.document_filename as string | null,
  });
}

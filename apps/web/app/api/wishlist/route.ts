// apps/web/app/api/wishlist/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ValidationError,
  optionalEnum,
  optionalString,
  optionalUuid,
  requireString,
} from "@/lib/api-validation";

// Audit hp-15 (2026-07-07): the same slime_base_type ENUM defined in
// migration 20260509000037. Duplicated here so the validator can
// reject bad values at the API boundary before hitting Postgres. Keep
// in sync if the enum ever grows a new value.
// 2026-07-16 taxonomy Phase 2 (mig 077): +basic, cloud_cream renamed to
// snowbutter. Net 20 base types.
const BASE_TYPES = [
  "avalanche",
  "basic",
  "beaded",
  "butter",
  "clear",
  "cloud",
  "floam",
  "fluffy",
  "hybrid",
  "icee",
  "jelly",
  "magnetic",
  "sand",
  "slay",
  "snow_fizz",
  "snowbutter",
  "sugar_scrub",
  "thick_and_glossy",
  "water",
  "wax_and_wax_cracking",
] as const;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  // Audit hp-15 (2026-07-07): validate every field before insert.
  // Previously accepted unbounded strings for slime_name/brand_name_raw
  // and any string for subtype_id — attackers could poison the public
  // catalog with junk data or store 10MB-strings that landed in
  // downstream feeds.
  let slime_name: string;
  let brand_name_raw: string | null;
  let base_type: (typeof BASE_TYPES)[number] | null;
  let subtype_id: string | null;
  try {
    slime_name = requireString(body.slime_name, "slime_name", {
      maxLength: 200,
    });
    brand_name_raw = optionalString(body.brand_name_raw, "brand_name_raw", {
      maxLength: 200,
    });
    base_type = optionalEnum(body.base_type, "base_type", BASE_TYPES);
    subtype_id = optionalUuid(body.subtype_id, "subtype_id");
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  // Audit hp-15 (2026-07-07): FK existence check on subtype_id. The
  // DB FK would eventually catch this (and RLS on subtypes would deny
  // reads on non-approved ones), but returning 400 at the API layer
  // is cleaner UX and shields us from any future RLS relaxation.
  if (subtype_id) {
    const admin = createAdminClient();
    const { data: subtype, error: subtypeErr } = await admin
      .from("subtypes")
      .select("id")
      .eq("id", subtype_id)
      .maybeSingle();
    if (subtypeErr) {
      console.error("Wishlist subtype lookup error:", subtypeErr);
      return NextResponse.json(
        { error: "Failed to verify subtype" },
        { status: 500 },
      );
    }
    if (!subtype) {
      return NextResponse.json(
        { error: "subtype_id: does not reference an existing subtype" },
        { status: 400 },
      );
    }
  }

  const { error } = await supabase.from("collection_logs").insert({
    user_id: user.id,
    slime_name,
    brand_name_raw,
    base_type,
    subtype_id,
    in_wishlist: true,
    in_collection: false,
    is_public: true,
  });

  if (error) {
    console.error("Wishlist insert error:", error);
    return NextResponse.json(
      { error: error.message, details: error },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}

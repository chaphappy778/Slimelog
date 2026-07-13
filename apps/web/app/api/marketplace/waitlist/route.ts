// apps/web/app/api/marketplace/waitlist/route.ts
//
// T113 (2026-07-12): create or update the current user's marketplace
// waitlist entry.
//
// Flow
// ----
//   1. Auth gate.
//   2. Validate body: intent enum required, everything else optional.
//   3. Moderate trust_need free-text via the shared moderation gate.
//   4. UPSERT through the anon-key client so RLS runs. `on_conflict`
//      on user_id lets a returning user layer their research answers
//      on top of their original intent-only submission.
//   5. Compute position (COUNT of rows with created_at <= my row's
//      created_at) + total. Runs through the admin client because a
//      plain user cannot read anyone else's rows under RLS.
//
// Response: `{ ok, position, total, is_new, entry }`.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  optionalEnum,
  optionalString,
  requireEnum,
  requireUuid,
  ValidationError,
} from "@/lib/api-validation";
import { moderateText } from "@/lib/moderation";
import type {
  MarketplaceWaitlistEntry,
  WaitlistIntent,
  WaitlistSellVolume,
  WaitlistSpendBand,
} from "@/lib/types";

const INTENTS: readonly WaitlistIntent[] = ["sell", "buy", "both"];
const SPEND_BANDS: readonly WaitlistSpendBand[] = [
  "10-25",
  "25-50",
  "50-100",
  "100+",
];
const SELL_VOLUMES: readonly WaitlistSellVolume[] = [
  "1-5",
  "6-20",
  "21-50",
  "50+",
];

// Hard cap on the brand_ids array to keep bad input out of the DB
// without needing a DB-level constraint. The design surfaces the top
// 12 brands, so 30 is a comfortable ceiling.
const MAX_BRAND_IDS = 30;

interface SubmitBody {
  intent?: unknown;
  brand_ids?: unknown;
  spend_band?: unknown;
  sell_volume?: unknown;
  trust_need?: unknown;
}

interface PositionResult {
  position: number;
  total: number;
}

/**
 * Compute the user's rank in the waitlist by created_at ascending, plus
 * the current total. Uses the admin client because plain users cannot
 * read other users' rows under RLS (COUNT would silently return only
 * their own row otherwise).
 */
async function computePosition(
  userCreatedAt: string,
): Promise<PositionResult> {
  const admin = createAdminClient();

  const [aheadResult, totalResult] = await Promise.all([
    admin
      .from("marketplace_waitlist")
      .select("id", { count: "exact", head: true })
      .lte("created_at", userCreatedAt),
    admin
      .from("marketplace_waitlist")
      .select("id", { count: "exact", head: true }),
  ]);

  if (aheadResult.error) {
    console.error(
      "[marketplace/waitlist] position count failed:",
      aheadResult.error.message,
    );
  }
  if (totalResult.error) {
    console.error(
      "[marketplace/waitlist] total count failed:",
      totalResult.error.message,
    );
  }

  return {
    position: aheadResult.count ?? 1,
    total: totalResult.count ?? 1,
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr) {
    console.error("[marketplace/waitlist] auth check failed:", authErr.message);
  }
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse + validate
  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let intent: WaitlistIntent;
  let spendBand: WaitlistSpendBand | null;
  let sellVolume: WaitlistSellVolume | null;
  let trustNeedRaw: string | null;
  let brandIds: string[] | null;

  try {
    intent = requireEnum(body.intent, "intent", INTENTS);
    spendBand = optionalEnum(body.spend_band, "spend_band", SPEND_BANDS);
    sellVolume = optionalEnum(body.sell_volume, "sell_volume", SELL_VOLUMES);
    trustNeedRaw = optionalString(body.trust_need, "trust_need", {
      maxLength: 200,
    });

    // brand_ids: undefined/null → null; array → validate each is a UUID.
    if (body.brand_ids === undefined || body.brand_ids === null) {
      brandIds = null;
    } else if (!Array.isArray(body.brand_ids)) {
      throw new ValidationError("brand_ids", "must be an array");
    } else if (body.brand_ids.length === 0) {
      brandIds = null;
    } else if (body.brand_ids.length > MAX_BRAND_IDS) {
      throw new ValidationError(
        "brand_ids",
        `too many ids (max ${MAX_BRAND_IDS})`,
      );
    } else {
      brandIds = body.brand_ids.map((raw, idx) =>
        requireUuid(raw, `brand_ids[${idx}]`),
      );
      // De-dup — clients occasionally send the same id twice on rapid
      // toggle. Cheaper here than a DB-level constraint.
      brandIds = Array.from(new Set(brandIds));
    }
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // 3. Moderate free-text. `report_reason` reuses the closest existing
  // rule (short single-line free-text, <=200 chars, profanity-gated).
  let trustNeed: string | null = null;
  if (trustNeedRaw) {
    const check = moderateText(trustNeedRaw, "report_reason");
    if (!check.ok) {
      return NextResponse.json(
        { error: check.message, field: "trust_need" },
        { status: 400 },
      );
    }
    trustNeed = check.cleaned === "" ? null : check.cleaned;
  }

  // 4. Check whether they already have a row so we can surface `is_new`.
  // The upsert-then-check-created_at approach can't distinguish an
  // insert from a no-op update, so we look first.
  const {
    data: existing,
    error: existingErr,
  } = await supabase
    .from("marketplace_waitlist")
    .select("id, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingErr) {
    console.error(
      "[marketplace/waitlist] existing lookup failed:",
      existingErr.message,
    );
    // Fall through — the upsert below still works. is_new will just
    // default to false, which is the conservative choice.
  }

  const isNew = !existing;

  // 5. Upsert. Anon-key client so RLS runs — INSERT policy requires
  // user_id = auth.uid(), UPDATE policy requires the same on both
  // sides of the check.
  const { data: upserted, error: upsertErr } = await supabase
    .from("marketplace_waitlist")
    .upsert(
      {
        user_id: user.id,
        intent,
        brand_ids: brandIds,
        spend_band: spendBand,
        sell_volume: sellVolume,
        trust_need: trustNeed,
      },
      { onConflict: "user_id" },
    )
    .select("id, user_id, intent, brand_ids, spend_band, sell_volume, trust_need, created_at, updated_at")
    .single();

  if (upsertErr || !upserted) {
    console.error(
      "[marketplace/waitlist] upsert failed:",
      upsertErr?.message ?? "no row returned",
    );
    return NextResponse.json(
      { error: "Could not save your spot. Try again shortly." },
      { status: 500 },
    );
  }

  const entry = upserted as MarketplaceWaitlistEntry;

  // 6. Position + total. Both counts pass through the admin client
  // because the anon-key client would see only the caller's own row
  // under RLS.
  const { position, total } = await computePosition(entry.created_at);

  return NextResponse.json(
    {
      ok: true,
      position,
      total,
      is_new: isNew,
      entry,
    },
    { status: 200 },
  );
}

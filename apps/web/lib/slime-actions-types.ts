// apps/web/lib/slime-actions-types.ts
//
// Shared input shape for the collection-logging server actions.
//
// This lives OUTSIDE lib/slime-actions.ts on purpose: that file is a
// "use server" module, and Next.js only permits async-function exports
// from a "use server" file. Exporting an interface from it corrupts the
// server-actions loader's introspection pass and blows up at runtime
// (see docs/error-tracker.md — "use server files may only export async
// functions", the T192 debug). The log + edit pages import LogSlimeInput
// from here; slime-actions.ts imports it back via `import type`.

import type {
  SlimeBaseType,
  ScentStrength,
  SlimeCondition,
  SlimeSkillLevel,
} from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LogSlimeInput {
  // Catalog references — both optional for free-form entry
  slime_id?: string;
  brand_id?: string;

  // Free-form fallbacks (used before catalog matching)
  slime_name?: string;
  brand_name_raw?: string;
  collection_name?: string;

  // [G2] Hierarchical taxonomy: base_type is required, subtype_id is optional
  base_type: SlimeBaseType;
  subtype_id?: string | null;

  // Status flags
  in_collection?: boolean;
  in_wishlist?: boolean;
  is_public?: boolean;

  // [Change 2 — T98] Ratings — all optional, numeric 0–5 in 0.25 increments
  rating_texture?: number;
  rating_sound?: number;
  rating_drizzle?: number;
  rating_creativity?: number;
  rating_sensory_fit?: number;
  rating_overall?: number;

  // Details
  scent_strength?: ScentStrength | null;
  // [Change 1 — scent_notes]
  scent_notes?: string | null;
  // 2026-07-12: physical condition of the slime. Optional. Serves
  // personal-shelf tracking today; feeds marketplace listing form later.
  condition?: SlimeCondition | null;
  // T158 (2026-07-16): per-log user assessment of difficulty. Optional
  // at every layer — users who don't want to track it just skip it.
  // Migration 20260716000079_skill_level_attribute.sql.
  skill_level?: SlimeSkillLevel | null;
  keywords?: string[];
  colors?: string[];
  image_url?: string;

  // Free-form notes
  notes?: string;
  purchase_price?: number;

  // T125 (2026-07-20) — where this slime lives in the user's
  // collection. Drives aging reminders (only `on_shelf` gets pinged)
  // + feeds the future marketplace listing UI (`for_sale`) +
  // supports archival record-keeping (`archived`). Defaults to
  // `on_shelf` via the DB column default when omitted.
  shelf_state?: "on_shelf" | "for_sale" | "archived";
}

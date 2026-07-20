// apps/web/lib/types.ts
// Aligned to SlimeLog schema v1.0 — Migration 20260324000001
// Updated: Migration 20260404000017_add_slime_types — 35 new types added
// Updated: Migration 20260502000033_brand_claims — brand claim types appended
// Updated: Bundle C (chat 10) — rejection reason types appended
// Updated: Migration 20260509000037_t71_base_type_taxonomy — 51 flat types replaced with 20 base types + extensible subtypes
// Updated: Bundle T72+T73+T75 — ScentStrength added; scent + rating_scent removed; keywords added to LogFormData
// Updated: Migration 20260515000040 — Brand interface extended (Brands Redesign D1)

export type ActivityType =
  | "log_created"
  | "rating_added"
  | "wishlist_added"
  | "collection_added"
  | "drop_announced"
  | "drop_live"
  | "drop_sold_out"
  | "user_followed";

export type NotificationType =
  | "drop_announced"
  | "drop_live"
  | "drop_sold_out"
  | "new_follower"
  | "friend_log"
  | "friend_rating"
  | "comment_on_log"
  | "like_on_log"
  // T110 (2026-07-11): brand suggestion outcomes.
  | "brand_suggestion_approved"
  | "brand_suggestion_rejected"
  // T158 (2026-07-16): variant suggestion outcomes.
  | "variant_suggestion_approved"
  | "variant_suggestion_rejected"
  // T167 (2026-07-17): brand owner is notified when a user logs a slime
  // tagged to their claimed brand. See migration 0080.
  | "brand_log_received"
  // T125 (2026-07-20): nightly aging cron fires this summary
  // notification when at least one of the user's on-shelf slimes
  // enters the warning or overdue state. See migration 0081.
  | "slime_needs_attention";

export type DropStatus =
  | "announced"
  | "live"
  | "sold_out"
  | "restocked"
  | "cancelled";

export type RatingDimension =
  | "texture"
  | "scent"
  | "sound"
  | "drizzle"
  | "creativity"
  | "sensory_fit"
  | "overall";

// ─── Scent Strength ───────────────────────────────────────────────────────────

export type ScentStrength = "unscented" | "weak" | "medium" | "strong";

export const SCENT_STRENGTH_LABELS: Record<ScentStrength, string> = {
  unscented: "Unscented",
  weak: "Weak",
  medium: "Medium",
  strong: "Strong",
};

// ─── SlimeSkillLevel (T158 2026-07-16) ───────────────────────────────────
// Optional maker-declared (or user-overridden) difficulty for a slime.
// Mirrors the SlimeBaseType label/color pattern so wizard chips and
// detail-page badges pull consistent copy + tint from one source.
// Migration: 20260716000079_skill_level_attribute.sql adds the enum on
// public.slimes and public.collection_logs (both nullable). Some users
// find a slime harder than the maker labeled it, so both layers get it.

export type SlimeSkillLevel = "beginner" | "intermediate" | "advanced";

export const SLIME_SKILL_LEVEL_LABELS: Record<SlimeSkillLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

// Signature tints per level. Consistent with the neon palette but muted
// enough that the badge reads as informational not celebratory.
export const SLIME_SKILL_LEVEL_COLORS: Record<
  SlimeSkillLevel,
  { bg: string; text: string; border: string }
> = {
  beginner: {
    bg: "rgba(57,255,20,0.10)",
    text: "#39FF14",
    border: "rgba(57,255,20,0.35)",
  },
  intermediate: {
    bg: "rgba(0,240,255,0.10)",
    text: "#00F0FF",
    border: "rgba(0,240,255,0.35)",
  },
  advanced: {
    bg: "rgba(255,0,229,0.10)",
    text: "#FF00E5",
    border: "rgba(255,0,229,0.35)",
  },
};

// ─── SlimeCondition (2026-07-12) ─────────────────────────────────────────
// Physical condition of a logged slime. Serves personal-shelf tracking
// today (so users can note a slime that's dried out or is still sealed).
// Also feeds the marketplace resale flow later: sellers list a slime
// with its logged condition, buyers know what they're getting.

export type SlimeCondition =
  | "sealed"
  | "new"
  | "like_new"
  | "used"
  | "well_loved";

export const SLIME_CONDITION_LABELS: Record<SlimeCondition, string> = {
  sealed: "Sealed",
  new: "New",
  like_new: "Like new",
  used: "Used",
  well_loved: "Well-loved",
};

export const SLIME_CONDITION_DESCRIPTIONS: Record<SlimeCondition, string> = {
  sealed: "Never opened",
  new: "Opened, barely played with",
  like_new: "Played with a few times, still fresh",
  used: "Regular play, still in good shape",
  well_loved: "Heavily played, may need revival",
};

// ─── Labels & Colors ──────────────────────────────────────────────────────────

// 2026-07-16: taxonomy Phase 2 (mig 077). Changes vs Phase 1:
//   - 'clay' removed (Phase 1, mig 075)
//   - 'cloud_cream' renamed to 'snowbutter' per Section 5.1 (Cloud Cream
//     spelling stays a searchable alias on the subtypes.aliases column)
//   - 'basic' added as new base type per Section 5.7 (3 shops elevate
//     Basic/Base as a top-level texture — Glitter Slimes, Slimeatory,
//     Avocadoslimeez)
// Net: 20 base types (19 - clay + snowbutter + basic - cloud_cream = 20).
// See docs/handoffs/2026-07-15-taxonomy-rework-plan.md Sections 5.1 + 5.7.
export type SlimeBaseType =
  | "avalanche"
  | "basic"
  | "beaded"
  | "butter"
  | "clear"
  | "cloud"
  | "floam"
  | "fluffy"
  | "hybrid"
  | "icee"
  | "jelly"
  | "magnetic"
  | "sand"
  | "slay"
  | "snow_fizz"
  | "snowbutter"
  | "sugar_scrub"
  | "thick_and_glossy"
  | "water"
  | "wax_and_wax_cracking";

export const SLIME_BASE_TYPE_LABELS: Record<SlimeBaseType, string> = {
  avalanche: "Avalanche",
  basic: "Basic",
  beaded: "Beaded",
  butter: "Butter",
  clear: "Clear",
  cloud: "Cloud",
  floam: "Floam",
  fluffy: "Fluffy",
  hybrid: "Hybrid",
  icee: "Icee",
  jelly: "Jelly",
  magnetic: "Magnetic",
  sand: "Sand",
  slay: "Slay",
  snow_fizz: "Snow Fizz",
  snowbutter: "Snowbutter",
  sugar_scrub: "Sugar Scrub",
  thick_and_glossy: "Thick & Glossy",
  water: "Water",
  wax_and_wax_cracking: "Wax & Wax Cracking",
};

export const SLIME_BASE_TYPE_COLORS: Record<
  SlimeBaseType,
  { bg: string; text: string }
> = {
  avalanche: { bg: "rgba(248,250,252,0.08)", text: "#94a3b8" },
  // Basic: neutral cool-white — signals "default / starter" without competing
  // with any other base type's saturated color. Slightly warmer than avalanche
  // so they read as distinct on adjacent chips.
  basic: { bg: "rgba(241,245,249,0.10)", text: "#cbd5e1" },
  beaded: { bg: "rgba(254,228,230,0.12)", text: "#fda4af" },
  butter: { bg: "rgba(255,243,205,0.12)", text: "#fde68a" },
  clear: { bg: "rgba(224,247,250,0.10)", text: "#67e8f9" },
  cloud: { bg: "rgba(243,232,255,0.12)", text: "#d8b4fe" },
  floam: { bg: "rgba(209,250,229,0.12)", text: "#6ee7b7" },
  fluffy: { bg: "rgba(252,231,243,0.12)", text: "#f9a8d4" },
  hybrid: { bg: "rgba(150,100,255,0.12)", text: "#c4b5fd" },
  icee: { bg: "rgba(219,234,254,0.12)", text: "#93c5fd" },
  jelly: { bg: "rgba(254,243,199,0.12)", text: "#fcd34d" },
  magnetic: { bg: "rgba(241,245,249,0.10)", text: "#94a3b8" },
  sand: { bg: "rgba(210,180,140,0.12)", text: "#d4a96a" },
  slay: { bg: "rgba(253,242,248,0.12)", text: "#f0abfc" },
  snow_fizz: { bg: "rgba(240,249,255,0.10)", text: "#bae6fd" },
  // Snowbutter: inherits the palette formerly used for cloud_cream (same
  // texture, new canonical name).
  snowbutter: { bg: "rgba(253,244,255,0.12)", text: "#e879f9" },
  sugar_scrub: { bg: "rgba(255,220,180,0.12)", text: "#fed7aa" },
  thick_and_glossy: { bg: "rgba(237,233,254,0.12)", text: "#c4b5fd" },
  water: { bg: "rgba(50,150,255,0.12)", text: "#93c5fd" },
  wax_and_wax_cracking: { bg: "rgba(255,240,200,0.12)", text: "#fef08a" },
};

export interface Subtype {
  id: string;
  base_type: SlimeBaseType;
  name: string;
  slug: string;
  created_by: string | null;
  created_by_brand_id: string | null;
  is_admin_approved: boolean;
  created_at: string;
}

// NOTE: DB column names (rating_drizzle, rating_sensory_fit) are unchanged.
// Display labels updated: drizzle → Aesthetic, sensory_fit → Quality, sound → Sound / ASMR
// Do not rename DB columns — existing log data would be orphaned.
export const RATING_DIMENSIONS: {
  key: RatingDimension;
  label: string;
  emoji: string;
  description: string;
}[] = [
  {
    key: "texture",
    label: "Texture",
    emoji: "",
    description: "How does it feel?",
  },
  {
    key: "scent",
    label: "Scent Throw",
    emoji: "",
    description: "Scent accuracy & strength",
  },
  {
    key: "sound",
    label: "Sound / ASMR",
    emoji: "",
    description: "Click, crunch, bubble pop",
  },
  {
    key: "drizzle",
    label: "Aesthetic",
    emoji: "",
    description: "Visual appeal & presentation",
  },
  {
    key: "creativity",
    label: "Creativity",
    emoji: "",
    description: "Concept & execution",
  },
  {
    key: "sensory_fit",
    label: "Quality",
    emoji: "",
    description: "Overall build and finish quality",
  },
  {
    key: "overall",
    label: "Overall",
    emoji: "",
    description: "Your final verdict",
  },
];

// ─── Core entities ────────────────────────────────────────────────────────────

// [Change 1 — Brands Redesign D1] Extended with is_featured, avg_slime_rating, total_slime_ratings, and missing display fields
export interface Brand {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  bio: string | null;
  logo_url: string | null;
  shop_url: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  is_verified: boolean;
  is_featured: boolean;
  owner_id: string | null;
  owner_name: string | null;
  location: string | null;
  restock_schedule: string | null;
  follower_count: number;
  total_logs: number;
  avg_shipping: number | null;
  avg_customer_service: number | null;
  avg_slime_rating: number | null;
  total_slime_ratings: number;
  total_brand_ratings: number;
  verification_tier: string | null;
  verified_at: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface Slime {
  id: string;
  brand_id: string;
  name: string;
  base_type: SlimeBaseType;
  subtype_id: string | null;
  colors: string[];
  collection_name: string | null;
  is_limited: boolean;
  image_url: string | null;
  avg_overall: number | null;
  total_ratings: number;
  created_at: string;
  updated_at: string;
  brand?: Brand;
  subtype?: Subtype | null;
}

export interface Drop {
  id: string;
  brand_id: string;
  title: string;
  description: string | null;
  status: DropStatus;
  drop_at: string | null;
  announced_by: string;
  created_at: string;
  updated_at: string;
  brand?: Brand | null;
  slimes?: Slime[];
}

// ─── collection_logs ──────────────────────────────────────────────────────────

export interface CollectionLog {
  id: string;
  user_id: string | null;
  slime_id: string | null;
  brand_id: string | null;
  slime_name: string | null;
  brand_name_raw: string | null;
  collection_name: string | null;
  base_type: SlimeBaseType | null;
  subtype_id: string | null;
  colors: string[] | null;
  scent_strength: ScentStrength | null;
  // T-condition (2026-07-12) — physical state of the slime; feeds
  // future marketplace resale flow. See migration 20260712000067.
  condition: SlimeCondition | null;
  // T158 (2026-07-16) — per-log user override of the maker-declared
  // difficulty. Both this and slimes.skill_level (brand-catalog) are
  // optional. See migration 20260716000079_skill_level_attribute.sql.
  skill_level: SlimeSkillLevel | null;
  cost_paid: number | null;
  purchase_price: number | null;
  purchased_from: string | null;
  purchased_at: string | null;
  likes: string | null;
  dislikes: string | null;
  notes: string | null;
  in_collection: boolean;
  in_wishlist: boolean;
  rating_texture: number | null;
  rating_sound: number | null;
  rating_drizzle: number | null;
  rating_creativity: number | null;
  rating_sensory_fit: number | null;
  rating_overall: number | null;
  is_public: boolean;
  // T125 (2026-07-20) — shelf state gates aging reminders. Only
  // `on_shelf` slimes fire reminders; `for_sale` ties into future
  // marketplace listing UI; `archived` is a historical record with
  // no reminders. See migration 20260720000081.
  shelf_state: ShelfState;
  // T125 (2026-07-20) — per-log aging reminder controls. Nightly
  // cron flips aging_state; UI reads it to bucket into fresh /
  // warning / overdue sections on /collection/aging.
  aging_enabled: boolean;
  aging_interval_days: number | null;
  last_checked_at: string | null;
  aging_state: AgingState;
  created_at: string;
  updated_at: string;
  // Joined relations
  slime?: Slime | null;
  brand?: Brand | null;
  subtype?: Subtype | null;
  user?: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

// T125 (2026-07-20) — where a slime lives in the user's collection.
export type ShelfState = "on_shelf" | "for_sale" | "archived";

// T125 (2026-07-20) — aging state, maintained by the nightly cron.
export type AgingState = "fresh" | "warning" | "overdue";

// User-facing labels for shelf state, used across the log wizard
// chips, feed pill copy, and settings surfaces.
export const SHELF_STATE_LABELS: Record<ShelfState, string> = {
  on_shelf: "On my shelf",
  for_sale: "Listed for sale",
  archived: "Archived",
};

// Short badge copy for feed cards + compact UI.
export const SHELF_STATE_BADGE: Record<ShelfState, string> = {
  on_shelf: "",
  for_sale: "For Sale",
  archived: "Archived",
};

// ─── Insert payload ───────────────────────────────────────────────────────────

export interface CollectionLogInsert {
  user_id?: string | null;
  slime_id?: string | null;
  brand_id?: string | null;
  slime_name?: string | null;
  brand_name_raw?: string | null;
  collection_name?: string | null;
  base_type?: SlimeBaseType | null;
  subtype_id?: string | null;
  colors?: string[] | null;
  scent_strength?: ScentStrength | null;
  condition?: SlimeCondition | null;
  // T158 (2026-07-16) — see CollectionLog.skill_level.
  skill_level?: SlimeSkillLevel | null;
  cost_paid?: number | null;
  purchased_from?: string | null;
  purchased_at?: string | null;
  likes?: string | null;
  dislikes?: string | null;
  notes?: string | null;
  in_collection?: boolean;
  in_wishlist?: boolean;
  rating_texture?: number | null;
  rating_sound?: number | null;
  rating_drizzle?: number | null;
  rating_creativity?: number | null;
  rating_sensory_fit?: number | null;
  rating_overall?: number | null;
  is_public?: boolean;
  // T125 (2026-07-20) — shelf state + aging controls, optional on
  // insert (DB defaults kick in for `shelf_state`, `aging_enabled`,
  // and `aging_state`; user-set values override).
  shelf_state?: ShelfState;
  aging_enabled?: boolean;
  aging_interval_days?: number | null;
}

// ─── Activity feed ────────────────────────────────────────────────────────────

export interface ActivityFeedItem {
  id: string;
  actor_id: string;
  activity_type: ActivityType;
  log_id: string | null;
  slime_id: string | null;
  brand_id: string | null;
  drop_id: string | null;
  target_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
  log?: CollectionLog | null;
  slime?: Slime | null;
  brand?: Brand | null;
  drop?: Drop | null;
}

// ─── Log form state (4-step wizard) ──────────────────────────────────────────

export interface LogFormData {
  slime_name: string;
  brand_name_raw: string;
  base_type: SlimeBaseType | "";
  subtype_id: string | null;
  colors: string[];
  scent_strength: ScentStrength | null;
  keywords: string[];
  cost_paid: string;
  rating_texture: number | null;
  rating_sound: number | null;
  rating_drizzle: number | null;
  rating_creativity: number | null;
  rating_sensory_fit: number | null;
  rating_overall: number | null;
  notes: string;
  in_wishlist: boolean;
  in_collection: boolean;
}

export const EMPTY_LOG_FORM: LogFormData = {
  slime_name: "",
  brand_name_raw: "",
  base_type: "",
  subtype_id: null,
  colors: [],
  scent_strength: null,
  keywords: [],
  cost_paid: "",
  rating_texture: null,
  rating_sound: null,
  rating_drizzle: null,
  rating_creativity: null,
  rating_sensory_fit: null,
  rating_overall: null,
  notes: "",
  in_wishlist: false,
  in_collection: true,
};

// ─── Brand claiming ───────────────────────────────────────────────────────────

export type BrandClaimStatus =
  | "pending_email_verification"
  | "pending_review"
  | "approved"
  | "rejected"
  | "auto_rejected";

export type BrandClaimRole = "owner" | "authorized_representative";

export const BRAND_CLAIM_STATUS_LABELS: Record<BrandClaimStatus, string> = {
  pending_email_verification: "Awaiting Email Verification",
  pending_review: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  auto_rejected: "Auto-Rejected",
};

export const BRAND_CLAIM_ROLE_LABELS: Record<BrandClaimRole, string> = {
  owner: "Owner",
  authorized_representative: "Authorized Representative",
};

export interface BrandClaim {
  id: string;
  brand_id: string;
  user_id: string;
  status: BrandClaimStatus;

  full_legal_name: string;
  role: BrandClaimRole;
  business_email: string;

  email_verification_code: string | null;
  email_verification_sent_at: string | null;
  email_verification_expires_at: string | null;
  email_verified_at: string | null;

  document_storage_path: string | null;
  document_filename: string | null;
  document_uploaded_at: string | null;

  instagram_handle: string | null;
  additional_notes: string | null;

  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;

  created_at: string;
  updated_at: string;
}

// ─── Brand claim rejection reasons (Bundle C) ─────────────────────────────────

export type RejectionReasonCode =
  | "documentation_insufficient"
  | "email_unverified"
  | "role_unconfirmed"
  | "suspected_fraud"
  | "different_owner_indicated"
  | "other";

export const REJECTION_REASON_LABELS: Record<RejectionReasonCode, string> = {
  documentation_insufficient: "Documentation insufficient or unclear",
  email_unverified:
    "Business email could not be verified as belonging to the brand",
  role_unconfirmed:
    "Claimant role or relationship to brand could not be confirmed",
  suspected_fraud: "Suspected fraudulent or duplicate claim",
  different_owner_indicated: "Brand has indicated a different owner",
  other: "Other",
};

// All standardized codes (excludes 'other' which always requires free-text)
export const STANDARDIZED_REJECTION_CODES: ReadonlyArray<RejectionReasonCode> =
  [
    "documentation_insufficient",
    "email_unverified",
    "role_unconfirmed",
    "suspected_fraud",
    "different_owner_indicated",
  ];

// ─── Brand suggestions (T110 mig 66 follow-up) ────────────────────────────────

// Row shape returned by the find_potential_brand_duplicates RPC. Used
// by the admin queue to show reviewers a "did you mean" list before
// they approve a suggestion.
export type BrandSuggestionPotentialDuplicate = {
  id: string;
  slug: string;
  name: string;
};

// ─── Notifications (T29 2026-07-12) ───────────────────────────────────────────
//
// Shape returned by GET /api/notifications for a single row. All four
// polymorphic joins are nullable because (a) the corresponding foreign
// key is nullable on the notifications row, and (b) the target may have
// been deleted after the notification landed (brand deleted, log
// deleted, actor deleted, etc.). Renderers must handle every
// combination gracefully — see NotificationRow.

export interface NotificationActor {
  username: string;
  avatar_url: string | null;
}

export interface NotificationBrand {
  slug: string;
  name: string;
  logo_url: string | null;
}

export interface NotificationDrop {
  id: string;
  name: string;
  cover_image_url: string | null;
}

export interface NotificationLog {
  id: string;
  slime_name: string | null;
  image_url: string | null;
}

export interface Notification {
  id: string;
  type: NotificationType;
  created_at: string;
  is_read: boolean;
  actor: NotificationActor | null;
  brand: NotificationBrand | null;
  drop: NotificationDrop | null;
  log: NotificationLog | null;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
}

// ─── Marketplace waitlist (T113 2026-07-12) ───────────────────────────────────
//
// See migration 20260712000068_marketplace_waitlist.sql. One row per
// user; POST /api/marketplace/waitlist upserts on conflict so users
// can add or update their research answers after the initial intent tap.

export type WaitlistIntent = "sell" | "buy" | "both";

export type WaitlistSpendBand = "10-25" | "25-50" | "50-100" | "100+";

export type WaitlistSellVolume = "1-5" | "6-20" | "21-50" | "50+";

export interface MarketplaceWaitlistEntry {
  id: string;
  user_id: string;
  intent: WaitlistIntent;
  brand_ids: string[] | null;
  // 2026-07-12: freeform brand names entered via the "Other" chip.
  brand_names_other: string[] | null;
  spend_band: WaitlistSpendBand | null;
  sell_volume: WaitlistSellVolume | null;
  trust_need: string | null;
  created_at: string;
  updated_at: string;
}

// apps/web/lib/types.ts
// Aligned to SlimeLog schema v1.0 — Migration 20260324000001
// Updated: Migration 20260404000017_add_slime_types — 35 new types added
// Updated: Migration 20260502000033_brand_claims — brand claim types appended
// Updated: Bundle C (chat 10) — rejection reason types appended
// Updated: Migration 20260509000037_t71_base_type_taxonomy — 51 flat types replaced with 20 base types + extensible subtypes
// Updated: Bundle T72+T73+T75 — ScentStrength added; scent + rating_scent removed; keywords added to LogFormData

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
  | "like_on_log";

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

// ─── Labels & Colors ──────────────────────────────────────────────────────────

export type SlimeBaseType =
  | "avalanche"
  | "beaded"
  | "butter"
  | "clay"
  | "clear"
  | "cloud"
  | "cloud_cream"
  | "floam"
  | "fluffy"
  | "hybrid"
  | "icee"
  | "jelly"
  | "magnetic"
  | "sand"
  | "slay"
  | "snow_fizz"
  | "sugar_scrub"
  | "thick_and_glossy"
  | "water"
  | "wax_and_wax_cracking";

export const SLIME_BASE_TYPE_LABELS: Record<SlimeBaseType, string> = {
  avalanche: "Avalanche",
  beaded: "Beaded",
  butter: "Butter",
  clay: "Clay",
  clear: "Clear",
  cloud: "Cloud",
  cloud_cream: "Cloud Cream",
  floam: "Floam",
  fluffy: "Fluffy",
  hybrid: "Hybrid",
  icee: "Icee",
  jelly: "Jelly",
  magnetic: "Magnetic",
  sand: "Sand",
  slay: "Slay",
  snow_fizz: "Snow Fizz",
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
  beaded: { bg: "rgba(254,228,230,0.12)", text: "#fda4af" },
  butter: { bg: "rgba(255,243,205,0.12)", text: "#fde68a" },
  clay: { bg: "rgba(254,249,195,0.12)", text: "#fef08a" },
  clear: { bg: "rgba(224,247,250,0.10)", text: "#67e8f9" },
  cloud: { bg: "rgba(243,232,255,0.12)", text: "#d8b4fe" },
  cloud_cream: { bg: "rgba(253,244,255,0.12)", text: "#e879f9" },
  floam: { bg: "rgba(209,250,229,0.12)", text: "#6ee7b7" },
  fluffy: { bg: "rgba(252,231,243,0.12)", text: "#f9a8d4" },
  hybrid: { bg: "rgba(150,100,255,0.12)", text: "#c4b5fd" },
  icee: { bg: "rgba(219,234,254,0.12)", text: "#93c5fd" },
  jelly: { bg: "rgba(254,243,199,0.12)", text: "#fcd34d" },
  magnetic: { bg: "rgba(241,245,249,0.10)", text: "#94a3b8" },
  sand: { bg: "rgba(210,180,140,0.12)", text: "#d4a96a" },
  slay: { bg: "rgba(253,242,248,0.12)", text: "#f0abfc" },
  snow_fizz: { bg: "rgba(240,249,255,0.10)", text: "#bae6fd" },
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

export interface Brand {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  shop_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  is_verified: boolean;
  owner_id: string | null;
  avg_shipping: number | null;
  avg_customer_service: number | null;
  total_brand_ratings: number;
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
  cost_paid: number | null;
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

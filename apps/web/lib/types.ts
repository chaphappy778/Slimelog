// apps/web/lib/types.ts
// Aligned to SlimeLog schema v1.0 — Migration 20260324000001

export type SlimeType =
  | "butter"
  | "clear"
  | "cloud"
  | "icee"
  | "fluffy"
  | "floam"
  | "snow_fizz"
  | "thick_and_glossy"
  | "jelly"
  | "beaded"
  | "clay"
  | "cloud_cream"
  | "magnetic"
  | "thermochromic"
  | "avalanche"
  | "slay";

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

// ─── Labels & Colors ──────────────────────────────────────────────────────────

export const SLIME_TYPE_LABELS: Record<SlimeType, string> = {
  butter: "Butter",
  clear: "Clear",
  cloud: "Cloud",
  icee: "Icee",
  fluffy: "Fluffy",
  floam: "Floam",
  snow_fizz: "Snow Fizz",
  thick_and_glossy: "Thick & Glossy",
  jelly: "Jelly",
  beaded: "Beaded",
  clay: "Clay",
  cloud_cream: "Cloud Cream",
  magnetic: "Magnetic",
  thermochromic: "Thermochromic",
  avalanche: "Avalanche",
  slay: "Slay",
};

export const SLIME_TYPE_COLORS: Record<
  SlimeType,
  { bg: string; text: string }
> = {
  butter: { bg: "#FFF3CD", text: "#92660A" },
  clear: { bg: "#E0F7FA", text: "#00696B" },
  cloud: { bg: "#F3E8FF", text: "#6B21A8" },
  icee: { bg: "#DBEAFE", text: "#1D4ED8" },
  fluffy: { bg: "#FCE7F3", text: "#9D174D" },
  floam: { bg: "#D1FAE5", text: "#065F46" },
  snow_fizz: { bg: "#F0F9FF", text: "#075985" },
  thick_and_glossy: { bg: "#EDE9FE", text: "#4C1D95" },
  jelly: { bg: "#FEF3C7", text: "#92400E" },
  beaded: { bg: "#FFE4E6", text: "#9F1239" },
  clay: { bg: "#FEF9C3", text: "#713F12" },
  cloud_cream: { bg: "#FDF4FF", text: "#701A75" },
  magnetic: { bg: "#F1F5F9", text: "#334155" },
  thermochromic: { bg: "#FFF1F2", text: "#BE123C" },
  avalanche: { bg: "#F8FAFC", text: "#1E3A5F" },
  slay: { bg: "#FDF2F8", text: "#86198F" },
};

export const RATING_DIMENSIONS: {
  key: RatingDimension;
  label: string;
  emoji: string;
  description: string;
}[] = [
  {
    key: "texture",
    label: "Texture",
    emoji: "🤌",
    description: "How does it feel?",
  },
  {
    key: "scent",
    label: "Scent Throw",
    emoji: "🌸",
    description: "Scent accuracy & strength",
  },
  {
    key: "sound",
    label: "Sound / ASMR",
    emoji: "🎧",
    description: "Click, crunch, bubble pop",
  },
  {
    key: "drizzle",
    label: "Drizzle",
    emoji: "💧",
    description: "Consistency & flow",
  },
  {
    key: "creativity",
    label: "Creativity",
    emoji: "✨",
    description: "Concept & execution",
  },
  {
    key: "sensory_fit",
    label: "Sensory Fit",
    emoji: "🧠",
    description: "Activation satisfaction",
  },
  {
    key: "overall",
    label: "Overall",
    emoji: "⭐",
    description: "Your final verdict",
  },
];

// ─── collection_logs ──────────────────────────────────────────────────────────

export interface CollectionLog {
  id: string;
  user_id: string | null;
  slime_id: string | null;
  brand_id: string | null;
  slime_name: string | null;
  brand_name_raw: string | null;
  collection_name: string | null;
  slime_type: SlimeType | null;
  colors: string[] | null;
  scent: string | null;
  cost_paid: number | null;
  purchased_from: string | null;
  purchased_at: string | null;
  likes: string | null;
  dislikes: string | null;
  notes: string | null;
  in_collection: boolean;
  in_wishlist: boolean;
  rating_texture: number | null;
  rating_scent: number | null;
  rating_sound: number | null;
  rating_drizzle: number | null;
  rating_creativity: number | null;
  rating_sensory_fit: number | null;
  rating_overall: number | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Insert payload ───────────────────────────────────────────────────────────

export interface CollectionLogInsert {
  user_id?: string | null;
  slime_id?: string | null;
  brand_id?: string | null;
  slime_name?: string | null;
  brand_name_raw?: string | null;
  collection_name?: string | null;
  slime_type?: SlimeType | null;
  colors?: string[] | null;
  scent?: string | null;
  cost_paid?: number | null;
  purchased_from?: string | null;
  purchased_at?: string | null;
  likes?: string | null;
  dislikes?: string | null;
  notes?: string | null;
  in_collection?: boolean;
  in_wishlist?: boolean;
  rating_texture?: number | null;
  rating_scent?: number | null;
  rating_sound?: number | null;
  rating_drizzle?: number | null;
  rating_creativity?: number | null;
  rating_sensory_fit?: number | null;
  rating_overall?: number | null;
  is_public?: boolean;
}

// ─── Log form state (4-step wizard) ──────────────────────────────────────────

export interface LogFormData {
  // Step 1 — Identity
  slime_name: string;
  brand_name_raw: string;
  slime_type: SlimeType | "";

  // Step 2 — Details
  colors: string[];
  scent: string;
  cost_paid: string;

  // Step 3 — Ratings
  rating_texture: number | null;
  rating_scent: number | null;
  rating_sound: number | null;
  rating_drizzle: number | null;
  rating_creativity: number | null;
  rating_sensory_fit: number | null;
  rating_overall: number | null;

  // Step 4 — Notes
  notes: string;
  in_wishlist: boolean;
  in_collection: boolean;
}

export const EMPTY_LOG_FORM: LogFormData = {
  slime_name: "",
  brand_name_raw: "",
  slime_type: "",
  colors: [],
  scent: "",
  cost_paid: "",
  rating_texture: null,
  rating_scent: null,
  rating_sound: null,
  rating_drizzle: null,
  rating_creativity: null,
  rating_sensory_fit: null,
  rating_overall: null,
  notes: "",
  in_wishlist: false,
  in_collection: true,
};

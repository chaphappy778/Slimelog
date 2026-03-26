// ─── Enums ────────────────────────────────────────────────────────────────────

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

// ─── Core Tables ──────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_premium: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

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
  slime_type: SlimeType;
  colors: string[];
  scent: string | null;
  collection_name: string | null;
  is_limited: boolean;
  image_url: string | null;
  created_by: string;
  // Rolling avg columns
  avg_texture: number | null;
  avg_scent: number | null;
  avg_sound: number | null;
  avg_drizzle: number | null;
  avg_creativity: number | null;
  avg_sensory_fit: number | null;
  avg_overall: number | null;
  total_ratings: number;
  created_at: string;
  updated_at: string;
  // Joined
  brand?: Brand;
}

export interface CollectionLog {
  id: string;
  user_id: string;
  slime_id: string | null;
  brand_id: string | null;
  slime_type: SlimeType;
  // Free-form fields for pre-catalog entry
  slime_name?: string;
  brand_name_raw?: string;
  // Status
  in_collection: boolean;
  in_wishlist: boolean;
  // Ratings (1–5)
  rating_texture: number | null;
  rating_scent: number | null;
  rating_sound: number | null;
  rating_drizzle: number | null;
  rating_creativity: number | null;
  rating_sensory_fit: number | null;
  rating_overall: number | null;
  notes: string | null;
  logged_at: string;
  created_at: string;
  updated_at: string;
  // Joined
  slime?: Slime;
  brand?: Brand;
  user?: Profile;
}

export interface BrandRating {
  id: string;
  user_id: string;
  brand_id: string;
  rating_shipping: number;
  rating_customer_service: number;
  created_at: string;
  updated_at: string;
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
  // Joined
  brand?: Brand;
  slimes?: Slime[];
}

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
  // Joined
  actor?: Profile;
  log?: CollectionLog;
  slime?: Slime;
  brand?: Brand;
  drop?: Drop;
  target_user?: Profile;
}

export interface LogLike {
  user_id: string;
  log_id: string;
  created_at: string;
}

export interface LogComment {
  id: string;
  log_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  user?: Profile;
}

export interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  notification_type: NotificationType;
  log_id: string | null;
  drop_id: string | null;
  brand_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface SlimeTypeReference {
  slime_type: SlimeType;
  display_name: string;
  made_with: string;
  key_characteristics: string;
  what_to_rate: string;
  sort_order: number;
}

// ─── Views ────────────────────────────────────────────────────────────────────

export interface ProfileFollowCounts {
  user_id: string;
  follower_count: number;
  following_count: number;
  brand_follow_count: number;
}

export interface UserCollectionSummary {
  user_id: string;
  total_in_collection: number;
  total_in_wishlist: number;
  total_rated: number;
  avg_overall_given: number | null;
  distinct_brands_tried: number;
  distinct_types_tried: number;
}

export interface TopRatedSlime extends Slime {
  brand_name: string;
}

export interface UpcomingDrop extends Drop {
  brand_logo: string | null;
  follower_count: number;
}

// ─── UI / Form helpers ────────────────────────────────────────────────────────

export interface NewLogFormData {
  slime_name: string;
  brand_name_raw: string;
  slime_type: SlimeType | "";
  rating_texture: number;
  rating_scent: number;
  rating_sound: number;
  rating_drizzle: number;
  rating_creativity: number;
  rating_sensory_fit: number;
  rating_overall: number;
  notes: string;
  in_collection: boolean;
  in_wishlist: boolean;
}

export type RatingDimension =
  | "texture"
  | "scent"
  | "sound"
  | "drizzle"
  | "creativity"
  | "sensory_fit"
  | "overall";

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

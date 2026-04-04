// apps/web/lib/types.ts
// Aligned to SlimeLog schema v1.0 — Migration 20260324000001
// Updated: Migration 20260404000017_add_slime_types — 35 new types added

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
  | "slay"
  | "micro_dough"
  | "sally_butter"
  | "nougat"
  | "jelly_cube"
  | "hybrid"
  | "fishbowl_beads"
  | "bead_bomb"
  | "bingsu"
  | "cloud_dough"
  | "float"
  | "slushee"
  | "wax_cracking"
  | "glossy"
  | "crunchy"
  | "thicky"
  | "water"
  | "cream_cheese"
  | "mochi"
  | "jelly_puff"
  | "cloud_fizz"
  | "sugar_scrub"
  | "glow_in_the_dark"
  | "metallic"
  | "glitter"
  | "galaxy"
  | "jiggly"
  | "wax"
  | "sand"
  | "mousse_fizz"
  | "chiffon_fizz"
  | "putty_puff"
  | "custard"
  | "holographic"
  | "pearl"
  | "thiggly";

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
  micro_dough: "Micro Dough",
  sally_butter: "Sally Butter",
  nougat: "Nougat",
  jelly_cube: "Jelly Cube",
  hybrid: "Hybrid",
  fishbowl_beads: "Fishbowl Beads",
  bead_bomb: "Bead Bomb",
  bingsu: "Bingsu",
  cloud_dough: "Cloud Dough",
  float: "Float",
  slushee: "Slushee",
  wax_cracking: "Wax Cracking",
  glossy: "Glossy",
  crunchy: "Crunchy",
  thicky: "Thicky",
  water: "Water",
  cream_cheese: "Cream Cheese",
  mochi: "Mochi",
  jelly_puff: "Jelly Puff",
  cloud_fizz: "Cloud Fizz",
  sugar_scrub: "Sugar Scrub",
  glow_in_the_dark: "Glow in the Dark",
  metallic: "Metallic",
  glitter: "Glitter",
  galaxy: "Galaxy",
  jiggly: "Jiggly",
  wax: "Wax",
  sand: "Sand",
  mousse_fizz: "Mousse Fizz",
  chiffon_fizz: "Chiffon Fizz",
  putty_puff: "Putty Puff",
  custard: "Custard",
  holographic: "Holographic",
  pearl: "Pearl",
  thiggly: "Thiggly",
};

export const SLIME_TYPE_COLORS: Record<
  SlimeType,
  { bg: string; text: string }
> = {
  // Original types — dark-theme aware
  butter: { bg: "rgba(255,243,205,0.12)", text: "#fde68a" },
  clear: { bg: "rgba(224,247,250,0.10)", text: "#67e8f9" },
  cloud: { bg: "rgba(243,232,255,0.12)", text: "#d8b4fe" },
  icee: { bg: "rgba(219,234,254,0.12)", text: "#93c5fd" },
  fluffy: { bg: "rgba(252,231,243,0.12)", text: "#f9a8d4" },
  floam: { bg: "rgba(209,250,229,0.12)", text: "#6ee7b7" },
  snow_fizz: { bg: "rgba(240,249,255,0.10)", text: "#bae6fd" },
  thick_and_glossy: { bg: "rgba(237,233,254,0.12)", text: "#c4b5fd" },
  jelly: { bg: "rgba(254,243,199,0.12)", text: "#fcd34d" },
  beaded: { bg: "rgba(254,228,230,0.12)", text: "#fda4af" },
  clay: { bg: "rgba(254,249,195,0.12)", text: "#fef08a" },
  cloud_cream: { bg: "rgba(253,244,255,0.12)", text: "#e879f9" },
  magnetic: { bg: "rgba(241,245,249,0.10)", text: "#94a3b8" },
  thermochromic: { bg: "rgba(255,241,242,0.12)", text: "#fda4af" },
  avalanche: { bg: "rgba(248,250,252,0.08)", text: "#94a3b8" },
  slay: { bg: "rgba(253,242,248,0.12)", text: "#f0abfc" },
  // New types
  micro_dough: { bg: "rgba(255,200,100,0.12)", text: "#fcd34d" },
  sally_butter: { bg: "rgba(255,220,150,0.12)", text: "#fde68a" },
  nougat: { bg: "rgba(210,170,120,0.12)", text: "#d4a96a" },
  jelly_cube: { bg: "rgba(100,220,200,0.12)", text: "#6ee7b7" },
  hybrid: { bg: "rgba(150,100,255,0.12)", text: "#c4b5fd" },
  fishbowl_beads: { bg: "rgba(0,240,255,0.10)", text: "#67e8f9" },
  bead_bomb: { bg: "rgba(255,150,50,0.12)", text: "#fdba74" },
  bingsu: { bg: "rgba(200,230,255,0.12)", text: "#bae6fd" },
  cloud_dough: { bg: "rgba(230,220,255,0.12)", text: "#ddd6fe" },
  float: { bg: "rgba(200,255,200,0.10)", text: "#86efac" },
  slushee: { bg: "rgba(100,200,255,0.12)", text: "#7dd3fc" },
  wax_cracking: { bg: "rgba(255,240,200,0.12)", text: "#fef08a" },
  glossy: { bg: "rgba(0,240,255,0.08)", text: "#a5f3fc" },
  crunchy: { bg: "rgba(255,200,50,0.12)", text: "#fde047" },
  thicky: { bg: "rgba(180,100,255,0.12)", text: "#d8b4fe" },
  water: { bg: "rgba(50,150,255,0.12)", text: "#93c5fd" },
  cream_cheese: { bg: "rgba(255,245,220,0.12)", text: "#fef3c7" },
  mochi: { bg: "rgba(255,180,200,0.12)", text: "#fda4af" },
  jelly_puff: { bg: "rgba(150,255,200,0.10)", text: "#6ee7b7" },
  cloud_fizz: { bg: "rgba(200,240,255,0.12)", text: "#e0f2fe" },
  sugar_scrub: { bg: "rgba(255,220,180,0.12)", text: "#fed7aa" },
  glow_in_the_dark: { bg: "rgba(57,255,20,0.12)", text: "#86efac" },
  metallic: { bg: "rgba(180,180,200,0.12)", text: "#e2e8f0" },
  glitter: { bg: "rgba(255,150,255,0.12)", text: "#f0abfc" },
  galaxy: { bg: "rgba(80,0,120,0.25)", text: "#c084fc" },
  jiggly: { bg: "rgba(100,255,200,0.10)", text: "#5eead4" },
  wax: { bg: "rgba(255,230,150,0.12)", text: "#fde68a" },
  sand: { bg: "rgba(210,180,140,0.12)", text: "#d4a96a" },
  mousse_fizz: { bg: "rgba(255,200,230,0.12)", text: "#fbcfe8" },
  chiffon_fizz: { bg: "rgba(240,220,255,0.12)", text: "#e9d5ff" },
  putty_puff: { bg: "rgba(200,255,220,0.10)", text: "#bbf7d0" },
  custard: { bg: "rgba(255,240,150,0.12)", text: "#fef08a" },
  holographic: { bg: "rgba(200,100,255,0.12)", text: "#e879f9" },
  pearl: { bg: "rgba(230,230,255,0.12)", text: "#e0e7ff" },
  thiggly: { bg: "rgba(100,200,150,0.12)", text: "#6ee7b7" },
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
    label: "Drizzle",
    emoji: "",
    description: "Consistency & flow",
  },
  {
    key: "creativity",
    label: "Creativity",
    emoji: "",
    description: "Concept & execution",
  },
  {
    key: "sensory_fit",
    label: "Sensory Fit",
    emoji: "",
    description: "Activation satisfaction",
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
  slime_type: SlimeType;
  colors: string[];
  scent: string | null;
  collection_name: string | null;
  is_limited: boolean;
  image_url: string | null;
  avg_overall: number | null;
  total_ratings: number;
  created_at: string;
  updated_at: string;
  brand?: Brand;
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
  // Joined relations
  slime?: Slime | null;
  brand?: Brand | null;
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
  slime_type: SlimeType | "";
  colors: string[];
  scent: string;
  cost_paid: string;
  rating_texture: number | null;
  rating_scent: number | null;
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

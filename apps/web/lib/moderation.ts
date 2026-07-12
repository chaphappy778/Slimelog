// apps/web/lib/moderation.ts
//
// T111 (2026-07-12): shared content-moderation gate for user-authored text.
//
// SERVER-ONLY. Do not import from client components. The `obscenity`
// dataset builds a fairly large RegExp graph on first construction and
// blows up client bundle size. Callers are: profile-actions (server
// action), slime-actions (server action), api/brand-suggestions
// (route handler), api/report (route handler), api/comments (route
// handler shipped alongside this file).
//
// What this does
// --------------
// One entry point, `moderateText`, takes raw user input and a `field`
// tag telling the moderator which rule set to apply. On success it
// returns `{ ok: true, cleaned }` where `cleaned` is the trimmed input
// safe to hand to the INSERT. On failure it returns `{ ok: false,
// reason, message }` with copy the caller can surface verbatim.
//
// The profanity check uses `obscenity` — RegExpMatcher over the
// English dataset with the recommended transformer stack (handles
// leet, spacing, mixed case, common obfuscations). A small whitelist
// of slime-adjacent phrases the dataset would false-positive on is
// stripped from the dataset at module load.
//
// Admin-authored fields (admin_notes on brand_suggestions, admin_notes
// on brand_claims, etc.) do NOT go through this module. Admins are
// trusted with their own text. See the T111 notes in the tracker.
//
// If a false positive lands in production, add the offending phrase to
// PROFANITY_WHITELIST below. See docs/error-tracker.md "known potential
// issues" for the pattern.

import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ModerationOk = { ok: true; cleaned: string };

export type ModerationFail = {
  ok: false;
  reason:
    | "profanity"
    | "reserved"
    | "format"
    | "too_short"
    | "too_long"
    | "empty";
  message: string;
};

export type ModerationResult = ModerationOk | ModerationFail;

export type ModerationField =
  | "username"
  | "brand_name"
  | "brand_note"
  | "slime_name"
  | "collection_name"
  | "slime_notes"
  | "comment_body"
  | "report_reason"
  | "profile_bio"
  | "profile_location"
  | "brand_bio"
  | "keyword";

// ---------------------------------------------------------------------------
// Profanity matcher
// ---------------------------------------------------------------------------

// Slime-adjacent words the English dataset flags but we want to allow.
// Add to this list when a false positive lands in prod. Keep entries
// lowercase and matching the dataset's originalWord metadata exactly.
const PROFANITY_WHITELIST: readonly string[] = [
  // No known false-positives yet. First real hit gets appended here.
];

const moderationDataset = englishDataset.removePhrasesIf((phrase) =>
  PROFANITY_WHITELIST.includes(phrase.metadata?.originalWord ?? ""),
);

const profanityMatcher = new RegExpMatcher({
  ...moderationDataset.build(),
  ...englishRecommendedTransformers,
});

// Supplementary patterns for words the `obscenity` English dataset
// intentionally omits because of ambiguous stems (e.g. `cock` collides
// with cockpit, peacock, rooster). We block the common compound forms
// explicitly rather than adding the standalone word and dealing with
// legit-word false positives everywhere. Add more here as they surface
// in smoke testing.
const CUSTOM_PROFANITY_PATTERNS: readonly RegExp[] = [
  /horsecock/i,
  /dogcock/i,
  /bigcock/i,
  /monstercock/i,
  /suckcock|cocksuck/i,
  /cockhead/i,
  // Standalone `cock` / `cocks` only when NOT preceded by common legit
  // stems (peacock, cockpit, cocktail, hancock, shuttlecock).
  /(?<!pea|hancock|shuttle)(?<!cockpi|cocktai)\bcocks?\b/i,
];

function containsProfanity(text: string): boolean {
  if (!text) return false;
  if (profanityMatcher.hasMatch(text)) return true;
  for (const pattern of CUSTOM_PROFANITY_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Reserved usernames
// ---------------------------------------------------------------------------

// Case-insensitive match against the normalized (lowercased) username.
// Grows over time. Add anything role-sounding, brand-owned, or that
// would misrepresent the app if a rando grabbed it.
const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  "admin",
  "administrator",
  "root",
  "official",
  "slimelog",
  "slime_log",
  "help",
  "support",
  "staff",
  "mod",
  "moderator",
  "system",
  "null",
  "undefined",
  "anonymous",
  "api",
  "auth",
  "login",
  "logout",
  "signup",
  "register",
  "settings",
  "profile",
  "user",
  "users",
  "brand",
  "brands",
  "drop",
  "drops",
  "leaderboard",
  "discover",
  "feed",
  "home",
  "welcome",
  "about",
  "terms",
  "privacy",
  "contact",
  "jennifer",
  "jenn",
  "jenn_slimelogapp",
  "jenniferchapman",
  "slimequeen",
  "slimeking",
]);

// ---------------------------------------------------------------------------
// Regex patterns for format-strict fields
// ---------------------------------------------------------------------------

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const KEYWORD_RE = /^[a-z0-9_ -]{1,30}$/i;

// ---------------------------------------------------------------------------
// Copy — no em-dashes. Slime-flavored where fun, direct where not.
// ---------------------------------------------------------------------------

const COPY = {
  profanity: "That word doesn't fit the vibe here. Try another.",
  reserved: "That name is reserved. Try another.",
  emptyRequired: "Required.",
} as const;

function tooShort(min: number): string {
  return `Too short. Minimum ${min} characters.`;
}

function tooLong(max: number): string {
  return `Too long. Maximum ${max} characters.`;
}

// ---------------------------------------------------------------------------
// Per-field rule table
// ---------------------------------------------------------------------------

type FieldRule = {
  minLength: number;
  maxLength: number;
  /** If false, allow an empty (post-trim) input and return cleaned: "". */
  required: boolean;
  /** Human-readable field-specific format hint used on format failures. */
  formatHint?: string;
};

const RULES: Record<ModerationField, FieldRule> = {
  username: {
    minLength: 3,
    maxLength: 20,
    required: true,
    formatHint:
      "Usernames are 3 to 20 characters: lowercase letters, numbers, and underscores only.",
  },
  brand_name: {
    minLength: 2,
    maxLength: 60,
    required: true,
    formatHint: "Brand names are 2 to 60 characters.",
  },
  brand_note: {
    minLength: 0,
    maxLength: 200,
    required: false,
  },
  slime_name: {
    minLength: 1,
    maxLength: 80,
    required: true,
    formatHint: "Slime names are 1 to 80 characters.",
  },
  collection_name: {
    minLength: 0,
    maxLength: 80,
    required: false,
  },
  slime_notes: {
    minLength: 0,
    maxLength: 2000,
    required: false,
  },
  comment_body: {
    minLength: 1,
    maxLength: 500,
    required: true,
  },
  report_reason: {
    minLength: 1,
    maxLength: 200,
    required: true,
  },
  profile_bio: {
    minLength: 0,
    maxLength: 150,
    required: false,
  },
  profile_location: {
    minLength: 0,
    maxLength: 80,
    required: false,
  },
  brand_bio: {
    minLength: 0,
    maxLength: 280,
    required: false,
  },
  keyword: {
    minLength: 1,
    maxLength: 30,
    required: true,
    formatHint:
      "Keywords are 1 to 30 characters: letters, numbers, spaces, hyphens, and underscores only.",
  },
};

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

/**
 * Moderate a user-authored string against the rules for `field`.
 *
 * Returns `{ ok: true, cleaned }` where `cleaned` is the trimmed input
 * ready for INSERT, or `{ ok: false, reason, message }` where `message`
 * is user-facing copy safe to surface directly.
 *
 * For optional fields (see RULES), a null/undefined/empty input returns
 * `{ ok: true, cleaned: "" }` — callers can coerce that to null before
 * writing.
 */
export function moderateText(
  input: string | null | undefined,
  field: ModerationField,
): ModerationResult {
  const rule = RULES[field];

  // Coerce non-strings and null-ish inputs to "".
  const raw = typeof input === "string" ? input : "";
  const trimmed = raw.trim();

  // Empty handling
  if (trimmed.length === 0) {
    if (rule.required) {
      return { ok: false, reason: "empty", message: COPY.emptyRequired };
    }
    return { ok: true, cleaned: "" };
  }

  // Length bounds
  if (trimmed.length < rule.minLength) {
    return {
      ok: false,
      reason: "too_short",
      message: tooShort(rule.minLength),
    };
  }
  if (trimmed.length > rule.maxLength) {
    return {
      ok: false,
      reason: "too_long",
      message: tooLong(rule.maxLength),
    };
  }

  // Field-specific format checks (before profanity — cheaper).
  if (field === "username") {
    const lowered = trimmed.toLowerCase();
    if (!USERNAME_RE.test(lowered)) {
      return {
        ok: false,
        reason: "format",
        message: rule.formatHint ?? "Invalid format.",
      };
    }
    // T111 2026-07-12 hotfix: reserved-name bypass with numeric suffix.
    // `admin1`, `admin_2`, `admin123` all read as impersonation attempts
    // and used to slip through the exact-match Set.has() check. Strip
    // trailing digits and underscores before comparing, so the "root"
    // gets caught. `admin_slime` still passes because slime is not
    // digits/underscores.
    const usernameRoot = lowered.replace(/[_\d]+$/, "");
    if (
      RESERVED_USERNAMES.has(lowered) ||
      (usernameRoot.length > 0 && RESERVED_USERNAMES.has(usernameRoot))
    ) {
      return { ok: false, reason: "reserved", message: COPY.reserved };
    }
    if (containsProfanity(lowered)) {
      return { ok: false, reason: "profanity", message: COPY.profanity };
    }
    return { ok: true, cleaned: lowered };
  }

  if (field === "keyword") {
    if (!KEYWORD_RE.test(trimmed)) {
      return {
        ok: false,
        reason: "format",
        message: rule.formatHint ?? "Invalid format.",
      };
    }
    if (containsProfanity(trimmed)) {
      return { ok: false, reason: "profanity", message: COPY.profanity };
    }
    return { ok: true, cleaned: trimmed };
  }

  // Everything else: profanity gate only.
  if (containsProfanity(trimmed)) {
    return { ok: false, reason: "profanity", message: COPY.profanity };
  }

  return { ok: true, cleaned: trimmed };
}

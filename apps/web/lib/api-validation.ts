// apps/web/lib/api-validation.ts
//
// Audit high-priority #15 (2026-07-07). Small shared validation
// primitives for API route bodies. Deliberately not using Zod — the
// two endpoints that need this today can be covered by ~40 lines and
// avoiding a new runtime dep keeps the bundle lean. If future
// endpoints need discriminated-union / deeply nested validation, this
// helper can be swapped for Zod without changing call sites much.
//
// Every validator returns a normalized value or throws a
// `ValidationError`. Handlers should catch and return 400.
//
// Usage:
//   const slime_name = requireString(body.slime_name, 'slime_name', { maxLength: 200 });
//   const subtype_id = optionalUuid(body.subtype_id, 'subtype_id');

export class ValidationError extends Error {
  constructor(
    public readonly field: string,
    message: string,
  ) {
    super(`${field}: ${message}`);
    this.name = "ValidationError";
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireString(
  raw: unknown,
  field: string,
  opts: { maxLength?: number; minLength?: number } = {},
): string {
  if (typeof raw !== "string") {
    throw new ValidationError(field, "must be a string");
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new ValidationError(field, "is required");
  }
  const min = opts.minLength ?? 1;
  const max = opts.maxLength ?? 200;
  if (trimmed.length < min) {
    throw new ValidationError(field, `must be at least ${min} characters`);
  }
  if (trimmed.length > max) {
    throw new ValidationError(field, `must be at most ${max} characters`);
  }
  return trimmed;
}

export function optionalString(
  raw: unknown,
  field: string,
  opts: { maxLength?: number } = {},
): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string") {
    throw new ValidationError(field, "must be a string");
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const max = opts.maxLength ?? 200;
  if (trimmed.length > max) {
    throw new ValidationError(field, `must be at most ${max} characters`);
  }
  return trimmed;
}

export function requireUuid(raw: unknown, field: string): string {
  if (typeof raw !== "string" || !UUID_RE.test(raw)) {
    throw new ValidationError(field, "must be a valid UUID");
  }
  return raw.toLowerCase();
}

export function optionalUuid(raw: unknown, field: string): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  return requireUuid(raw, field);
}

export function requireEnum<T extends string>(
  raw: unknown,
  field: string,
  allowed: readonly T[],
): T {
  if (typeof raw !== "string" || !allowed.includes(raw as T)) {
    throw new ValidationError(field, `must be one of: ${allowed.join(", ")}`);
  }
  return raw as T;
}

export function optionalEnum<T extends string>(
  raw: unknown,
  field: string,
  allowed: readonly T[],
): T | null {
  if (raw === undefined || raw === null || raw === "") return null;
  return requireEnum(raw, field, allowed);
}

// ---------------------------------------------------------------------------
// URL validation (audit hp-16 2026-07-07)
// ---------------------------------------------------------------------------
//
// Two flavors:
//   - assertHttpUrl:      any http(s)://... URL. For user-facing website
//                         and shop links.
//   - assertSupabaseUrl:  URL must be hosted on the Supabase Storage endpoint
//                         (NEXT_PUBLIC_SUPABASE_URL prefix). For avatar,
//                         background, logo, banner — anything expected to
//                         come from our own Storage upload flow.
//
// Both trim, reject empty, reject anything with a null byte or backslash
// (defense in depth against smuggling). Returned strings are the trimmed
// input.

const HTTP_URL_RE = /^https?:\/\//i;

function stripDangerousChars(raw: string): string {
  return raw.trim();
}

function rejectDangerous(raw: string, field: string): void {
  if (raw.includes("\0") || raw.toLowerCase().includes("%00")) {
    throw new ValidationError(field, "contains null byte");
  }
  if (raw.includes("\\")) {
    throw new ValidationError(field, "contains backslash");
  }
}

export function requireHttpUrl(
  raw: unknown,
  field: string,
  opts: { maxLength?: number } = {},
): string {
  if (typeof raw !== "string") {
    throw new ValidationError(field, "must be a string");
  }
  const trimmed = stripDangerousChars(raw);
  if (trimmed.length === 0) {
    throw new ValidationError(field, "is required");
  }
  const max = opts.maxLength ?? 2000;
  if (trimmed.length > max) {
    throw new ValidationError(field, `must be at most ${max} characters`);
  }
  rejectDangerous(trimmed, field);
  if (!HTTP_URL_RE.test(trimmed)) {
    throw new ValidationError(field, "must start with http:// or https://");
  }
  return trimmed;
}

export function optionalHttpUrl(
  raw: unknown,
  field: string,
  opts: { maxLength?: number } = {},
): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "string" && raw.trim().length === 0) return null;
  return requireHttpUrl(raw, field, opts);
}

/** Require a Supabase-Storage-hosted URL. `supabaseUrl` is typically
 *  `process.env.NEXT_PUBLIC_SUPABASE_URL`. Comparison is case-insensitive on
 *  the prefix. */
export function optionalSupabaseUrl(
  raw: unknown,
  field: string,
  supabaseUrl: string | undefined,
  opts: { maxLength?: number } = {},
): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "string" && raw.trim().length === 0) return null;
  if (typeof raw !== "string") {
    throw new ValidationError(field, "must be a string");
  }
  const trimmed = stripDangerousChars(raw);
  const max = opts.maxLength ?? 2000;
  if (trimmed.length > max) {
    throw new ValidationError(field, `must be at most ${max} characters`);
  }
  rejectDangerous(trimmed, field);
  if (!HTTP_URL_RE.test(trimmed)) {
    throw new ValidationError(field, "must start with http:// or https://");
  }
  if (!supabaseUrl) {
    // Env not configured — fall back to just requiring https(:). Log so
    // the operator notices the misconfiguration.
    console.warn(
      "[api-validation] optionalSupabaseUrl called without a supabaseUrl. " +
        "Falling back to http(s) check only.",
    );
    return trimmed;
  }
  const normalizedSupabase = supabaseUrl.replace(/\/+$/, "").toLowerCase();
  if (!trimmed.toLowerCase().startsWith(normalizedSupabase)) {
    throw new ValidationError(
      field,
      "must be hosted on this site's Supabase Storage",
    );
  }
  return trimmed;
}

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

// Industry-standard minimal normalization for slime name dedup. Lowercase,
// trim, collapse internal whitespace. NO punctuation stripping — "Cloud 9"
// vs "Cloud9" are legitimately different products in this domain.
// Mirrors the SQL used to backfill and the semantics of the (brand_id,
// name_normalized) unique index in migration 20260723000088.
export function normalizeSlimeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

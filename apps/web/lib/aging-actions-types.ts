// apps/web/lib/aging-actions-types.ts
//
// Shared type shapes for the T125 aging / care-action server actions.
//
// These live OUTSIDE lib/aging-actions.ts on purpose: that file is a
// "use server" module, and Next.js only permits async-function exports
// from a "use server" file. Exporting a type/interface from it corrupts
// the server-actions loader's introspection pass and blows up at runtime
// (see docs/error-tracker.md — "use server files may only export async
// functions", the T192 debug). Callers that need CareActionInput import
// it from here; aging-actions.ts imports it back via `import type`.

// ─── Care action shape ────────────────────────────────────────────────

/**
 * One care action reported during a check-in. Matches the shape of
 * slime_care_actions rows minus the auto-set id/user_id/log_id.
 * Callers construct these client-side from the check-in modal
 * selections; the server inserts them alongside the aging update.
 *
 * `product_key` must be a valid key from `care_products`. Server
 * doesn't currently validate the FK before insert — Postgres does
 * that atomically via the FK constraint (bad keys just fail the
 * insert, which we surface as the whole markLogChecked failing).
 */
export interface CareActionInput {
  action_type:
    | "activator"
    | "softener"
    | "additive"
    | "physical"
    | "storage"
    | "other";
  // Nullable: a quick category re-log from the /collection/care
  // "Recent care" strip records that the category was performed
  // again without naming a product. slime_care_actions.product_key
  // is nullable in the schema (20260720000082_t125_care_actions.sql).
  product_key: string | null;
  quantity_type?:
    | "drops"
    | "pumps"
    | "tsp"
    | "tbsp"
    | "ml"
    | "oz"
    | "pinch"
    | "squirt"
    | null;
  quantity_amount?: number | null;
  notes?: string | null;
}

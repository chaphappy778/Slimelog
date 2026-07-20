// apps/web/components/collection/CareCheckinModal.tsx
//
// T125 phase 2 — the structured check-in modal that opens whenever
// a user taps "Mark as checked" on a slime.
//
// Data-collection lane for BOTH free and Pro users. Every check-in
// yields 1..N rows in slime_care_actions with canonical product
// keys, powering per-user product profiles + aggregate market intel
// (see monetization plan Phase 2 shop).
//
// UX design:
//   - Kneaded is auto-checked on open — single-tap "Save" works for
//     a quick check-in.
//   - Each category (Activator / Softener / Additive / Storage) is
//     a collapsible section. User expands the ones they used.
//   - Selecting a product in a category reveals an optional
//     quantity input (drops / pumps / tsp / etc).
//   - Notes textarea at the bottom for anything the catalog misses.
//   - "Save" fires markLogChecked(logId, careActions) — server logs
//     actions + resets the log's aging_state to 'fresh'.
//
// Design will polish visual language later (T188 Part 4). Layout
// here is functional: bottom-sheet on mobile, centered on desktop,
// section-based accordion so the initial view isn't overwhelming.

"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  markLogChecked,
  type CareActionInput,
} from "@/lib/aging-actions";

const supabase = createClient();

// ─── Types ────────────────────────────────────────────────────────────

type CategoryKey =
  | "activator"
  | "softener"
  | "additive"
  | "storage"
  | "physical";

type QuantityUnit =
  | "drops"
  | "pumps"
  | "tsp"
  | "tbsp"
  | "ml"
  | "oz"
  | "pinch"
  | "squirt";

// One selected product in the check-in. Self-describing so the save
// payload can be built from selection state alone.
interface Selection {
  action_type: CareActionInput["action_type"];
  quantity_type: QuantityUnit | null;
  quantity_amount: number | null;
}

interface CareProduct {
  key: string;
  category: CategoryKey | "other";
  display_name: string;
  description: string | null;
  sort_order: number;
}

interface Props {
  logId: string;
  slimeName: string | null;
  onClose: () => void;
  // Fired after a successful save so the parent can update its local
  // state (e.g., move the row from Overdue -> Fresh on
  // /collection/aging).
  onSaved?: () => void;
}

// Category display metadata — accent colors match T188 spec so the
// modal doesn't need to be redesigned when Design lands the pass.
const CATEGORY_META: Record<
  CategoryKey,
  {
    label: string;
    accent: string;
    prompt: string;
  }
> = {
  activator: {
    label: "Activator",
    accent: "#00F0FF",
    prompt: "Add an activator?",
  },
  softener: {
    label: "Softener",
    accent: "#FF00E5",
    prompt: "Add a softener?",
  },
  additive: {
    label: "Additive",
    accent: "#39FF14",
    prompt: "Add a texture booster?",
  },
  storage: {
    label: "Storage change",
    accent: "#CC44FF",
    prompt: "Changed where it's stored?",
  },
  physical: {
    // Orange (same hex as the Aging state pill in AgingListClient).
    // Was #3DF2FF, which read as identical to activator's #00F0FF.
    label: "Handling",
    accent: "#FFAE3B",
    prompt: "How did you handle it?",
  },
};

// Section order in the modal — physical first because Kneaded is
// auto-checked, then activator / softener / additive / storage as
// they're the most common product-attached actions.
const CATEGORY_ORDER: CategoryKey[] = [
  "physical",
  "activator",
  "softener",
  "additive",
  "storage",
];

const QUANTITY_UNITS: QuantityUnit[] = [
  "drops",
  "pumps",
  "tsp",
  "tbsp",
  "ml",
  "oz",
  "pinch",
  "squirt",
];

// ─── Modal component ──────────────────────────────────────────────────

export default function CareCheckinModal({
  logId,
  slimeName,
  onClose,
  onSaved,
}: Props) {
  const [products, setProducts] = useState<CareProduct[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Selection state — product_key → selection. Keyed by product key
  // ONLY, so it is completely independent of which category happens
  // to be expanded (collapsing a section never touches it).
  //
  // Each entry carries its own action_type. That matters: handleSave
  // used to re-derive action_type by looking the key up in the loaded
  // `products` catalog and silently `continue`-ing on a miss, so any
  // selection made before (or without) a successful catalog load was
  // dropped from the payload. The check-in then "succeeded" while
  // writing zero slime_care_actions rows, which is why no care icons
  // ever appeared on /care. Selections are now self-describing and
  // the save path never consults the catalog.
  const [selections, setSelections] = useState<
    Record<string, Selection>
  >({
    knead: {
      action_type: "physical",
      quantity_type: null,
      quantity_amount: null,
    },
  });

  const [notes, setNotes] = useState("");
  // Has the user actually interacted with the sheet? Gates auto-save
  // on dismiss. `knead` is pre-selected, so without this flag every
  // stray backdrop tap (the /care modal opens from a photo tap) would
  // write a phantom "kneaded" row, and the insert is not idempotent.
  // The explicit Save button ignores this and still saves the default
  // single-tap check-in.
  const [touched, setTouched] = useState(false);
  const [saving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] =
    useState<CategoryKey | null>("physical");

  // ─── Load product catalog ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function loadProducts() {
      const { data, error } = await supabase
        .from("care_products")
        .select("key, category, display_name, description, sort_order")
        .order("category")
        .order("sort_order");
      if (cancelled) return;
      if (error) {
        console.error("[CareCheckinModal] catalog load failed:", error);
        setLoadError(
          "Couldn't load care products. Save works — you'll still get credit for checking.",
        );
      } else {
        setProducts((data ?? []) as CareProduct[]);
      }
      setLoading(false);
    }
    loadProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Escape dismisses (which saves first — see `dismiss`) ──────────
  //
  // Held in a ref so the listener always calls the CURRENT dismiss,
  // which closes over live selection/notes/saving state. Binding
  // dismiss directly would freeze a stale closure from first render
  // and every Escape would save an empty payload.
  const dismissRef = useRef<() => void>(() => {});
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismissRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ─── Group products by category ────────────────────────────────────
  const productsByCategory = new Map<CategoryKey, CareProduct[]>();
  for (const cat of CATEGORY_ORDER) {
    productsByCategory.set(cat, []);
  }
  for (const p of products) {
    if (p.category === "other") continue; // handled via notes
    const bucket = productsByCategory.get(p.category as CategoryKey);
    if (bucket) bucket.push(p);
  }

  function toggleProduct(
    productKey: string,
    actionType: CareActionInput["action_type"],
  ) {
    setTouched(true);
    setSelections((prev) => {
      const next = { ...prev };
      if (next[productKey]) {
        delete next[productKey];
      } else {
        next[productKey] = {
          action_type: actionType,
          quantity_type: null,
          quantity_amount: null,
        };
      }
      return next;
    });
  }

  function setQty(
    productKey: string,
    unit: QuantityUnit | null,
    amount: number | null,
  ) {
    setTouched(true);
    setSelections((prev) => {
      const existing = prev[productKey];
      // Quantity inputs only render for already-selected products;
      // bail rather than resurrect a deselected one. Spread preserves
      // action_type, which a bare object literal would drop.
      if (!existing) return prev;
      return {
        ...prev,
        [productKey]: {
          ...existing,
          quantity_type: unit,
          quantity_amount: amount,
        },
      };
    });
  }

  function handleSave() {
    setSaveError(null);
    // Build the payload straight from selection state — no catalog
    // lookup, so nothing can be silently dropped (see the note on
    // `selections`). Shape matches CareActionInput in
    // lib/aging-actions.ts.
    const careActions: CareActionInput[] = [];
    for (const [productKey, sel] of Object.entries(selections)) {
      const action: CareActionInput = {
        action_type: sel.action_type,
        product_key: productKey,
      };
      if (sel.quantity_type !== null) {
        action.quantity_type = sel.quantity_type;
      }
      if (sel.quantity_amount !== null) {
        action.quantity_amount = sel.quantity_amount;
      }
      careActions.push(action);
    }

    // Notes go on the LAST action if any, or as a lone 'other' row.
    const trimmedNotes = notes.trim();
    if (trimmedNotes) {
      if (careActions.length > 0) {
        careActions[careActions.length - 1].notes = trimmedNotes;
      } else {
        careActions.push({
          action_type: "other",
          product_key: "other",
          notes: trimmedNotes,
        });
      }
    }

    startSaving(async () => {
      const result = await markLogChecked(logId, careActions);
      if (result.ok) {
        onSaved?.();
        onClose();
      } else {
        setSaveError(result.error);
      }
    });
  }

  const selectionCount = Object.keys(selections).length;
  const hasSomethingToSave =
    selectionCount > 0 || notes.trim().length > 0;

  // ─── Single dismiss path: save-then-close ──────────────────────────
  //
  // Jennifer 2026-07-20: "i select the care option pills i want and
  // then to close out the card i click out of the space and it
  // minimizes i just assumed it was saving the state there." Dismiss
  // WAS a pure close, so every selection was silently discarded.
  // Backdrop click, Escape, and the header X all route here now, so
  // "click out to close" means what she expects it to mean.
  //
  //   - Save in flight  → ignore the dismiss, let it settle. handleSave
  //                       closes the modal itself on success.
  //   - Save error up   → close without retrying. The user already saw
  //                       the failure; silently re-firing a write that
  //                       may have partially landed would double-log.
  //   - Nothing picked  → plain close (saving an empty check-in is a
  //                       no-op the user didn't ask for).
  //   - Otherwise       → handleSave, which closes on success and
  //                       keeps the sheet open on failure.
  function dismiss() {
    if (saving) return;
    if (saveError || !touched || !hasSomethingToSave) {
      onClose();
      return;
    }
    handleSave();
  }

  // Refresh every render (no dep array) so the Escape listener never
  // fires a stale dismiss. Assigned in an effect, not during render.
  useEffect(() => {
    dismissRef.current = dismiss;
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{
        background: "rgba(6,0,14,0.75)",
        backdropFilter: "blur(6px)",
      }}
      onClick={dismiss}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{
          background:
            "linear-gradient(180deg, rgba(45,10,78,0.95), rgba(20,5,40,0.95))",
          border: "1px solid rgba(0,240,255,0.35)",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.6)",
          maxHeight: "90vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-3 border-b border-white/10 relative">
          {/* Close routes through dismiss() too, so tapping X after
              picking pills saves rather than discards. */}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close check-in"
            className="absolute right-3 top-3 flex items-center justify-center rounded-full"
            style={{
              width: 36,
              height: 36,
              background: "rgba(45,10,78,0.6)",
              border: "1px solid rgba(45,10,78,0.9)",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(245,245,245,0.7)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <p
            className="text-[11px] font-black tracking-widest uppercase mb-1"
            style={{ color: "#00F0FF" }}
          >
            Check-in
          </p>
          <h2
            className="pr-10"
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 900,
              fontSize: 22,
              color: "#FFFFFF",
              letterSpacing: "-0.01em",
            }}
          >
            What did you do to{" "}
            <span style={{ color: "#FF7BEB" }}>
              {slimeName || "your slime"}
            </span>
            ?
          </h2>
          <p
            className="mt-1 text-xs"
            style={{ color: "rgba(245,245,245,0.55)" }}
          >
            Kneaded is on by default. Add anything else you used.
          </p>
        </div>

        {/* Scrollable body */}
        <div
          className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3"
          style={{ overscrollBehavior: "contain" }}
        >
          {loading && (
            <p
              className="text-sm text-center py-4"
              style={{ color: "rgba(245,245,245,0.55)" }}
            >
              Loading care catalog…
            </p>
          )}

          {loadError && (
            <div
              className="rounded-xl px-3 py-2 text-xs"
              style={{
                background: "rgba(255,174,59,0.08)",
                border: "1px solid rgba(255,174,59,0.35)",
                color: "rgba(255,174,59,0.85)",
              }}
            >
              {loadError}
            </div>
          )}

          {!loading &&
            CATEGORY_ORDER.map((cat) => {
              const meta = CATEGORY_META[cat];
              const catProducts = productsByCategory.get(cat) ?? [];
              const isExpanded = expandedCategory === cat;
              const selectedInCategory = catProducts.filter(
                (p) => selections[p.key],
              ).length;

              return (
                <div
                  key={cat}
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: "rgba(45,10,78,0.35)",
                    border: `1px solid ${meta.accent}44`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedCategory(isExpanded ? null : cat)
                    }
                    className="w-full flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          background: meta.accent,
                          boxShadow: `0 0 8px ${meta.accent}88`,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "Montserrat, sans-serif",
                          fontWeight: 800,
                          fontSize: 13,
                          color: meta.accent,
                          letterSpacing: "0.02em",
                        }}
                      >
                        {meta.label}
                      </span>
                      {selectedInCategory > 0 && (
                        <span
                          className="text-[11px] tabular-nums"
                          style={{
                            color: "#FFFFFF",
                            background: meta.accent,
                            borderRadius: 999,
                            padding: "1px 8px",
                            fontWeight: 800,
                          }}
                        >
                          {selectedInCategory}
                        </span>
                      )}
                    </div>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="rgba(245,245,245,0.55)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: isExpanded
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                        transition: "transform 0.15s ease",
                      }}
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 space-y-2">
                      <p
                        className="text-xs mb-2"
                        style={{ color: "rgba(245,245,245,0.65)" }}
                      >
                        {meta.prompt}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {catProducts.map((p) => {
                          const selected = Boolean(selections[p.key]);
                          return (
                            <button
                              key={p.key}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => toggleProduct(p.key, cat)}
                              className="rounded-full transition-all inline-flex items-center gap-1.5"
                              style={{
                                padding: "6px 12px",
                                fontFamily: "Montserrat, sans-serif",
                                fontWeight: 700,
                                fontSize: 12,
                                color: selected ? "#0A0A0A" : meta.accent,
                                background: selected
                                  ? meta.accent
                                  : "rgba(45,10,78,0.5)",
                                border: `1px solid ${
                                  selected ? meta.accent : `${meta.accent}55`
                                }`,
                                boxShadow: selected
                                  ? `0 0 10px ${meta.accent}55`
                                  : "none",
                              }}
                            >
                              {/* Explicit check glyph — the fill
                                  change alone read as ambiguous. */}
                              <svg
                                width="11"
                                height="11"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{
                                  opacity: selected ? 1 : 0.35,
                                  flexShrink: 0,
                                }}
                                aria-hidden="true"
                              >
                                {selected ? (
                                  <path d="M20 6 9 17l-5-5" />
                                ) : (
                                  <path d="M12 5v14M5 12h14" />
                                )}
                              </svg>
                              {p.display_name}
                            </button>
                          );
                        })}
                      </div>
                      {/* Quantity row for selected products in this
                          category. Small inline inputs — Design will
                          polish. */}
                      {catProducts
                        .filter((p) => selections[p.key])
                        .map((p) => {
                          const sel = selections[p.key];
                          // Physical actions don't need quantities —
                          // skip the input row for them.
                          if (cat === "physical" || cat === "storage") {
                            return null;
                          }
                          return (
                            <div
                              key={`${p.key}-qty`}
                              className="flex items-center gap-2 pt-1"
                            >
                              <span
                                className="text-[11px] shrink-0"
                                style={{
                                  color: "rgba(245,245,245,0.55)",
                                  minWidth: 80,
                                }}
                              >
                                {p.display_name}
                              </span>
                              <input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.5"
                                placeholder="Amount"
                                value={sel.quantity_amount ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setQty(
                                    p.key,
                                    sel.quantity_type,
                                    v === "" ? null : parseFloat(v),
                                  );
                                }}
                                className="rounded-lg bg-transparent text-white text-xs px-2 py-1 outline-none"
                                style={{
                                  border: "1px solid rgba(45,10,78,0.7)",
                                  width: 80,
                                }}
                              />
                              <select
                                value={sel.quantity_type ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value as
                                    | QuantityUnit
                                    | "";
                                  setQty(
                                    p.key,
                                    v === "" ? null : v,
                                    sel.quantity_amount,
                                  );
                                }}
                                className="rounded-lg bg-transparent text-white text-xs px-2 py-1 outline-none"
                                style={{
                                  border: "1px solid rgba(45,10,78,0.7)",
                                }}
                              >
                                <option value="">unit</option>
                                {QUANTITY_UNITS.map((u) => (
                                  <option key={u} value={u}>
                                    {u}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}

          {/* Free-form notes */}
          <div className="pt-2">
            <p
              className="text-[11px] font-black tracking-widest uppercase mb-2"
              style={{ color: "rgba(180,169,196,0.75)" }}
            >
              Notes (optional)
            </p>
            <textarea
              rows={2}
              maxLength={500}
              placeholder="Anything else? e.g. 'added a drop of vanilla oil'"
              value={notes}
              onChange={(e) => {
                setTouched(true);
                setNotes(e.target.value);
              }}
              className="w-full rounded-xl bg-transparent text-white text-sm px-3 py-2 outline-none resize-none"
              style={{
                border: "1px solid rgba(45,10,78,0.7)",
              }}
            />
          </div>

          {saveError && (
            <div
              className="rounded-xl px-3 py-2 text-xs"
              style={{
                background: "rgba(255,61,110,0.10)",
                border: "1px solid rgba(255,61,110,0.35)",
                color: "#FF7BEB",
              }}
            >
              {saveError}
            </div>
          )}
        </div>

        {/* Footer: sticky full-width Save.
            The sheet is a flex column with a scrolling body, so this
            sits outside the scroll area and stays pinned no matter how
            far the catalog is scrolled. Cancel is gone: the header X
            (and backdrop, and Escape) all save-then-close now, so a
            second "discard" control would contradict that. */}
        <div
          className="shrink-0 px-5 pt-4"
          style={{
            borderTop: "1px solid rgba(45,10,78,0.7)",
            background: "rgba(20,5,40,0.98)",
            // Jennifer 2026-07-20: safe-area alone wasn't enough. The
            // fixed BottomNav (h-16 = 64px, see BottomNav.tsx) sits
            // above the inset and was covering the Save button at max
            // sheet expansion. Clear the nav height too.
            paddingBottom:
              "calc(1rem + 64px + env(safe-area-inset-bottom))",
          }}
        >
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-full transition-all"
            style={{
              minHeight: 48,
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 900,
              fontSize: 15,
              letterSpacing: "0.01em",
              color: "#0A0A0A",
              background: saving
                ? "rgba(57,255,20,0.5)"
                : "linear-gradient(135deg, #39FF14, #00F0FF)",
              boxShadow: saving
                ? "none"
                : "0 0 20px rgba(57,255,20,0.35)",
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving
              ? "Saving…"
              : `Save check-in (${selectionCount} action${selectionCount === 1 ? "" : "s"})`}
          </button>
          <p
            className="mt-2 text-center text-[11px]"
            style={{ color: "rgba(245,245,245,0.45)" }}
          >
            Closing this sheet saves your picks too.
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

// apps/web/components/log/BrandVariantPicker.tsx
//
// 2026-07-16 Commit B-wizard (Phase 2 taxonomy rework). Renders the
// variant picker for a specific brand + base_type combo. Three states:
//
//   1. Loading — small spinner + "Checking [Brand] variants..." while the
//      brand_variants query is in flight.
//
//   2. Variants known — chip row of brand_variants JOIN subtypes for the
//      selected (brand, subtype.base_type) pair. Each chip shows the
//      brand_display_name (fall back to subtype.name). Tap to select.
//
//   3. No variants known — magenta ghost "Suggest a variant" card. Tap
//      to expand into an inline mini form (name input + submit + cancel).
//      POSTs to /api/variant-suggestions. On success shows a green
//      confirmation for ~4s then collapses back to the CTA (in case the
//      user has more variants to submit).
//
// This component is ONLY rendered when brand_id is a real catalog brand
// (not free-text). The log wizard falls back to SubtypeAutocomplete when
// brand_id is null. Wired into both /log and /log/edit/[id].

import { useState, useEffect, useCallback } from "react";
import type { SlimeBaseType } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { PickChip, fieldInputStyle } from "./LogWizardShared";

const supabase = createClient();

// ─── Types ───────────────────────────────────────────────────────────────

interface BrandVariantRow {
  subtype_id: string;
  brand_display_name: string | null;
  subtype_name: string;
  subtype_slug: string;
}

interface Props {
  brandId: string;
  brandName: string;
  baseType: SlimeBaseType | "";
  /** Currently-selected subtype name (display). Empty string if none. */
  value: string;
  /** Currently-selected subtype id. Null if none. */
  subtypeId: string | null;
  onChange: (subtypeId: string | null, subtypeName: string) => void;
}

type SubmitStatus =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; suggestedName: string }
  | { kind: "duplicate_subtype"; existingSubtypeId: string; existingName: string }
  | { kind: "already_pending" }
  | { kind: "error"; message: string };

// ─── Component ───────────────────────────────────────────────────────────

export default function BrandVariantPicker({
  brandId,
  brandName,
  baseType,
  value,
  subtypeId,
  onChange,
}: Props) {
  const [variants, setVariants] = useState<BrandVariantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [proposedName, setProposedName] = useState("");
  const [proposedNote, setProposedNote] = useState("");
  const [submitState, setSubmitState] = useState<SubmitStatus>({ kind: "idle" });

  // ── Fetch brand_variants whenever brand+base changes ───────────────────

  const fetchBrandVariants = useCallback(async () => {
    if (!brandId || baseType === "") {
      setVariants([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Join brand_variants → subtypes, filter by brand_id + base_type match
    // on the joined subtypes row. Anon RLS lets us read approved rows.
    const { data, error } = await supabase
      .from("brand_variants")
      .select(
        "subtype_id, brand_display_name, subtypes!inner (name, slug, base_type)",
      )
      .eq("brand_id", brandId)
      .eq("is_admin_approved", true)
      .eq("subtypes.base_type", baseType);

    if (error) {
      // Silent-fail loudly per CLAUDE.md rule — log, render empty state.
      console.warn(
        "[BrandVariantPicker] brand_variants fetch failed:",
        error.message,
      );
      setVariants([]);
      setLoading(false);
      return;
    }

    // Supabase's typegen returns the joined table as an array; normalize.
    type JoinedRow = {
      subtype_id: string;
      brand_display_name: string | null;
      subtypes:
        | { name: string; slug: string; base_type: string }
        | { name: string; slug: string; base_type: string }[]
        | null;
    };
    const normalized: BrandVariantRow[] = (data as JoinedRow[] | null ?? [])
      .map((row) => {
        const subtypeRow = Array.isArray(row.subtypes)
          ? row.subtypes[0]
          : row.subtypes;
        if (!subtypeRow) return null;
        return {
          subtype_id: row.subtype_id,
          brand_display_name: row.brand_display_name,
          subtype_name: subtypeRow.name,
          subtype_slug: subtypeRow.slug,
        };
      })
      .filter((r): r is BrandVariantRow => r !== null)
      // Sort alphabetically by displayed label
      .sort((a, b) =>
        (a.brand_display_name ?? a.subtype_name).localeCompare(
          b.brand_display_name ?? b.subtype_name,
        ),
      );

    setVariants(normalized);
    setLoading(false);
  }, [brandId, baseType]);

  useEffect(() => {
    fetchBrandVariants();
    // When brand or base changes, close any open suggestion form + reset
    // its state so the user isn't left mid-typing on a stale context.
    setFormOpen(false);
    setProposedName("");
    setProposedNote("");
    setSubmitState({ kind: "idle" });
    // If the currently-selected subtype came from a previous brand+base
    // combo, clear it — the log wizard will restore whatever the user
    // picks next.
    if (subtypeId !== null || value !== "") {
      onChange(null, "");
    }
    // Intentionally exclude subtypeId/value/onChange from deps to avoid
    // clearing on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, baseType]);

  // Auto-collapse success message after 4s so the user can suggest more
  // variants without dismissing manually.
  useEffect(() => {
    if (submitState.kind !== "success") return;
    const t = setTimeout(() => {
      setSubmitState({ kind: "idle" });
      setFormOpen(false);
      setProposedName("");
      setProposedNote("");
    }, 4000);
    return () => clearTimeout(t);
  }, [submitState]);

  // ── Submit handler ────────────────────────────────────────────────────

  async function handleSubmit() {
    const trimmed = proposedName.trim();
    if (trimmed.length < 2 || trimmed.length > 60) {
      setSubmitState({
        kind: "error",
        message: "Variant name must be between 2 and 60 characters.",
      });
      return;
    }
    setSubmitState({ kind: "submitting" });

    try {
      const res = await fetch("/api/variant-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: brandId,
          base_type: baseType,
          proposed_name: trimmed,
          note: proposedNote.trim() || undefined,
        }),
      });

      // 200 = accepted (or already-pending duplicate — silent success)
      if (res.ok) {
        const data = (await res.json()) as {
          ok: boolean;
          already_pending?: boolean;
        };
        if (data.already_pending) {
          setSubmitState({ kind: "already_pending" });
          setTimeout(() => setSubmitState({ kind: "idle" }), 4000);
        } else {
          setSubmitState({ kind: "success", suggestedName: trimmed });
        }
        return;
      }

      // 409 = duplicate subtype (variant name already canonical). Show
      // the user + let them pick it directly by refreshing the picker
      // (they'll see the existing subtype in the chip row after refetch —
      // but ONLY if the brand_variants join has it; otherwise the subtype
      // exists globally but this brand hasn't been linked. Still useful
      // info.).
      if (res.status === 409) {
        const data = (await res.json()) as {
          error: string;
          duplicate: { id: string; name: string; slug: string };
        };
        setSubmitState({
          kind: "duplicate_subtype",
          existingSubtypeId: data.duplicate.id,
          existingName: data.duplicate.name,
        });
        return;
      }

      // 429 rate limit or 400 validation — surface the message
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      setSubmitState({
        kind: "error",
        message:
          data.error ??
          `Could not submit (${res.status}). Try again in a moment.`,
      });
    } catch (err) {
      console.error("[BrandVariantPicker] submit failed:", err);
      setSubmitState({
        kind: "error",
        message: "Network hiccup. Try again in a moment.",
      });
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────

  // Waiting on base type — hidden entirely (base type step comes first)
  if (baseType === "") {
    return null;
  }

  if (loading) {
    return (
      <div className="text-xs text-slime-muted italic py-2" aria-live="polite">
        Checking {brandName} variants…
      </div>
    );
  }

  // ── State 1: variants known — render chip picker ──────────────────────

  if (variants.length > 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => {
            const label = v.brand_display_name ?? v.subtype_name;
            const isSelected = subtypeId === v.subtype_id;
            return (
              <PickChip
                key={v.subtype_id}
                selected={isSelected}
                selectedTint="#00F0FF"
                onClick={() => {
                  if (isSelected) {
                    onChange(null, "");
                  } else {
                    onChange(v.subtype_id, label);
                  }
                }}
              >
                {label}
              </PickChip>
            );
          })}
        </div>
        <p
          className="text-[11px] text-slime-muted"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          {variants.length} variant{variants.length === 1 ? "" : "s"} tracked for{" "}
          {brandName}. Tap to select, or leave blank to skip.
        </p>
      </div>
    );
  }

  // ── State 2: no variants known — CTA + form ───────────────────────────

  return (
    <div className="flex flex-col gap-3">
      {!formOpen && submitState.kind !== "success" && (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="w-full rounded-2xl px-4 py-3 text-sm font-bold transition-all active:scale-[0.98]"
          style={{
            background: "rgba(255,0,229,0.08)",
            border: "1px solid rgba(255,0,229,0.35)",
            color: "#FF00E5",
            fontFamily: "'Montserrat', sans-serif",
            textAlign: "left",
          }}
        >
          <span style={{ letterSpacing: "0.02em" }}>
            Suggest a variant for {brandName} →
          </span>
          <span
            className="block text-[11px] mt-1"
            style={{ color: "rgba(255,0,229,0.7)", fontWeight: 500 }}
          >
            We haven&apos;t tracked any {brandName} variants for this texture
            yet. Help us complete the guide.
          </span>
        </button>
      )}

      {formOpen && submitState.kind !== "success" && (
        <div
          className="rounded-2xl p-4 flex flex-col gap-3"
          style={{
            background: "rgba(45,10,78,0.35)",
            border: "1px solid rgba(255,0,229,0.4)",
            backdropFilter: "blur(6px)",
          }}
        >
          <label
            htmlFor="variant_name"
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: "#FF00E5" }}
          >
            Variant name
          </label>
          <input
            id="variant_name"
            type="text"
            maxLength={60}
            placeholder="e.g. Whipped Butter, Cloud Puff"
            value={proposedName}
            onChange={(e) => setProposedName(e.target.value)}
            style={fieldInputStyle}
            autoFocus
          />
          <label
            htmlFor="variant_note"
            className="text-[11px] font-bold uppercase tracking-widest mt-1"
            style={{ color: "rgba(245,245,245,0.55)" }}
          >
            Note (optional)
          </label>
          <textarea
            id="variant_note"
            maxLength={300}
            rows={2}
            placeholder="Where you've seen it, why it's distinct, etc."
            value={proposedNote}
            onChange={(e) => setProposedNote(e.target.value)}
            style={{
              ...fieldInputStyle,
              resize: "vertical",
              fontFamily: "'Montserrat', sans-serif",
            }}
          />

          {submitState.kind === "error" && (
            <p className="text-xs" style={{ color: "rgba(255,80,80,0.9)" }}>
              {submitState.message}
            </p>
          )}

          {submitState.kind === "duplicate_subtype" && (
            <p className="text-xs" style={{ color: "#FFD24A" }}>
              &quot;{submitState.existingName}&quot; already exists as a
              variant for this base type. If this brand actually sells it, an
              admin will link it here on approval.
            </p>
          )}

          {submitState.kind === "already_pending" && (
            <p className="text-xs" style={{ color: "#39FF14" }}>
              That variant is already in the review queue. Thanks for the
              nudge!
            </p>
          )}

          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitState.kind === "submitting"}
              className="flex-1 rounded-xl py-2.5 text-sm font-bold transition-transform active:scale-[0.97] disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #FF00E5, #00F0FF)",
                color: "#0A0A0A",
                fontFamily: "'Montserrat', sans-serif",
              }}
            >
              {submitState.kind === "submitting" ? "Sending…" : "Submit"}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setProposedName("");
                setProposedNote("");
                setSubmitState({ kind: "idle" });
              }}
              className="rounded-xl py-2.5 px-4 text-sm font-bold transition-transform active:scale-[0.97]"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(245,245,245,0.7)",
                fontFamily: "'Montserrat', sans-serif",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {submitState.kind === "success" && (
        <div
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{
            background: "rgba(57,255,20,0.08)",
            border: "1px solid rgba(57,255,20,0.3)",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#39FF14"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0, marginTop: 2 }}
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <div>
            <p
              className="text-sm font-bold"
              style={{
                color: "#39FF14",
                fontFamily: "'Montserrat', sans-serif",
              }}
            >
              Thanks — sent to review
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "rgba(245,245,245,0.6)" }}
            >
              We&apos;ll add &quot;{submitState.suggestedName}&quot; to{" "}
              {brandName} once an admin (or the brand owner) approves it.
              You&apos;ll get a notification.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

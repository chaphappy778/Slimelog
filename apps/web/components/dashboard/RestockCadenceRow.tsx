// apps/web/components/dashboard/RestockCadenceRow.tsx
//
// T137 Batch 6b (2026-07-23): `brands.restock_schedule` used to live in a
// "Restocks and availability" section on the Settings page, which is the wrong
// home: it is a drops-cadence fact, and the owner is thinking about cadence on
// the Drops page, not while editing their bio. It moved here as one subtle
// editable caption line above the drops list.
//
// The column did not change. Settings still reads it for its live preview, the
// public brand page still renders it next to the calendar icon. Only the write
// moved, and this component is the only writer now.
//
// ── T137 Batch 6c (2026-07-23): the expander ────────────────────────────────
// Jenn's 6b smoke test #6: tapping the row appeared to show a label and
// nothing else. Every element (input, placeholder, helper copy, Save, Cancel)
// was in fact present in 6b, so this is not a restore. What was missing was
// the *affordance*: the expanded panel used the same near-black surface and
// the same faint 18%-alpha border as the collapsed row, its input border sat
// at 24% alpha over a 4%-alpha fill, and nothing about the row visibly changed
// state when it opened. On a phone in daylight there was nothing to see.
//
// It now mirrors BrandSettingsForm's FieldRow exactly: expanded means a cyan
// tint plus a 2px cyan left border, a cyan section label with a rotated
// chevron, a full-contrast input, helper copy, then the button row. The input
// also autofocuses, so the keyboard comes up and the state change is
// unmistakable even if the tint is missed.
//
// Deliberately unchanged: the save path (one `.update()` scoped by id +
// owner_id), the toast copy, and this component's home on the Drops page.
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

const supabase = createClient();

// Batch 6c: the settings palette, so the expanded panel reads as the same
// control as every FieldRow on /brand-dashboard/<slug>/settings.
const CYAN = "#00F0FF";
const MAGENTA = "#FF00E5";
const TEXT_STRONG = "rgba(245,245,245,0.9)";
const MUTED = "#8f83b0";
const FAINT = "#6b6180";
const HAIRLINE = "rgba(150,110,240,0.18)";

const MAX_LENGTH = 120;

interface RestockCadenceRowProps {
  brandId: string;
  userId: string;
  initialSchedule: string | null;
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{
        flexShrink: 0,
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s",
        color: FAINT,
      }}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export default function RestockCadenceRow({
  brandId,
  userId,
  initialSchedule,
}: RestockCadenceRowProps) {
  const { showToast } = useToast();
  const [saved, setSaved] = useState((initialSchedule ?? "").trim());
  const [draft, setDraft] = useState((initialSchedule ?? "").trim());
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const isSet = saved.length > 0;

  const handleCancel = () => {
    setDraft(saved);
    setOpen(false);
  };

  const handleSave = async () => {
    const next = draft.trim();
    setSaving(true);
    const { error } = await supabase
      .from("brands")
      .update({ restock_schedule: next || null })
      .eq("id", brandId)
      .eq("owner_id", userId);
    setSaving(false);
    if (error) {
      console.error("[RestockCadenceRow] save failed", error);
      showToast("Could not save your restock cadence", "error");
      return;
    }
    setSaved(next);
    setDraft(next);
    setOpen(false);
    showToast("Restock cadence saved. Live on your brand page.", "success");
  };

  return (
    <div
      className="rounded-xl mb-4 overflow-hidden"
      style={{
        background: open ? "rgba(0,240,255,0.04)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${open ? "rgba(0,240,255,0.35)" : HAIRLINE}`,
        borderLeft: open ? `2px solid ${CYAN}` : `1px solid ${HAIRLINE}`,
      }}
    >
      {open ? (
        <div className="px-4 py-4">
          {/* Header: same cyan label + rotated chevron as an expanded FieldRow */}
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <label
              className="text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: CYAN, fontFamily: "Montserrat, sans-serif" }}
              htmlFor="restock-cadence"
            >
              Restock cadence
            </label>
            <ChevronDown open />
          </div>

          <input
            id="restock-cadence"
            type="text"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
            placeholder="Every other Friday, 6pm PST"
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-[#00F0FF]/50 placeholder:text-[#6b6180]"
            style={{
              background: "rgba(45,10,78,0.4)",
              border: "1px solid rgba(45,10,78,0.9)",
              fontFamily: "system-ui, sans-serif",
            }}
          />

          <p className="text-[11px] mt-2 leading-relaxed" style={{ color: FAINT }}>
            Shown on your public brand page so collectors know when to check
            back. Plain language works best. Leave it empty to hide the line.
          </p>

          <div className="flex gap-2.5 mt-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50 transition-opacity"
              style={{
                background: `linear-gradient(135deg, ${MAGENTA}, #CC44FF)`,
                fontFamily: "Montserrat, sans-serif",
                boxShadow: "0 0 18px rgba(255,0,229,0.3)",
              }}
            >
              {saving ? "Saving..." : "Save cadence"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50"
              style={{
                background: "transparent",
                border: "1px solid rgba(245,245,245,0.14)",
                color: MUTED,
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2.5 min-w-0 flex-1">
            <span style={{ color: MUTED, display: "flex" }}>
              <CalendarIcon />
            </span>
            <span
              className="text-[11px] font-bold uppercase tracking-[0.14em] flex-shrink-0"
              style={{ color: MUTED, fontFamily: "Montserrat, sans-serif" }}
            >
              Restock cadence
            </span>
            {/* min-w-0 so `truncate` can actually shrink this span on a narrow
                phone instead of pushing the Edit pill off the row. */}
            <span
              className="text-sm truncate min-w-0"
              style={{ color: isSet ? TEXT_STRONG : FAINT }}
            >
              {isSet ? saved : "Not set"}
            </span>
          </span>
          <span
            className="flex-shrink-0 rounded-full px-3 py-1 text-[11px] font-bold"
            style={
              isSet
                ? {
                    color: CYAN,
                    background: "rgba(0,240,255,0.08)",
                    border: "1px solid rgba(0,240,255,0.28)",
                  }
                : {
                    color: MAGENTA,
                    background: "rgba(255,0,229,0.08)",
                    border: "1px solid rgba(255,0,229,0.3)",
                  }
            }
          >
            {isSet ? "Edit" : "Add"}
          </span>
        </button>
      )}
    </div>
  );
}

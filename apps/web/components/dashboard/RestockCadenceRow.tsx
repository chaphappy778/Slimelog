// apps/web/components/dashboard/RestockCadenceRow.tsx
//
// T137 Batch 6b (2026-07-23): `brands.restock_schedule` used to live in a
// "Restocks and availability" section on the Settings page, which is the wrong
// home: it is a drops-cadence fact, and the owner is thinking about cadence on
// the Drops page, not while editing their bio. It moved here.
//
// The column did not change. Settings still reads it for its live preview, the
// public brand page still renders it next to the calendar icon. Only the write
// moved, and this component is the only writer now.
//
// ── T137 Batch 6d (2026-07-23): flat inline row ─────────────────────────────
// 6b shipped this as a collapsed row you tapped to open, and 6c tried to fix
// the affordance by tinting the opened panel. Both kept the same underlying
// mistake: the value was one tap away instead of on screen. An expander is the
// wrong control for a single short string the owner reads far more often than
// they change.
//
// It is now a subtitle strip. The caption and the saved value are always
// visible; "Edit" swaps the value slot for an input in place. No collapse
// animation, no chevron, no hidden state. Two lines at most, and only while
// editing.
//
// Deliberately unchanged: the save path (one `.update()` scoped by id +
// owner_id), the toast copy, and this component's home on the Drops page.
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

const supabase = createClient();

// Drops-page palette. The cyan is the same one the "Drops" section label and
// the catalog header use, so the strip reads as part of this page and not as a
// transplant from the violet settings surface.
const CYAN = "#22d3ee";
const MAGENTA = "#ff2bd6";
const TEXT_STRONG = "rgba(245,245,245,0.92)";
const MUTED = "#8f83b0";
const FAINT = "#6b6180";
const HAIRLINE = "rgba(150,110,240,0.14)";

const MAX_LENGTH = 120;

interface RestockCadenceRowProps {
  brandId: string;
  userId: string;
  initialSchedule: string | null;
}

const captionStyle: React.CSSProperties = {
  color: CYAN,
  fontFamily: "Montserrat, sans-serif",
};

export default function RestockCadenceRow({
  brandId,
  userId,
  initialSchedule,
}: RestockCadenceRowProps) {
  const { showToast } = useToast();
  const [saved, setSaved] = useState((initialSchedule ?? "").trim());
  const [draft, setDraft] = useState((initialSchedule ?? "").trim());
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const isSet = saved.length > 0;
  const isDirty = draft.trim() !== saved;

  const startEdit = () => {
    // Baseline for Cancel is whatever is persisted right now.
    setDraft(saved);
    setEditing(true);
  };

  const handleCancel = () => {
    setDraft(saved);
    setEditing(false);
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
    setEditing(false);
    showToast("Restock cadence saved. Live on your brand page.", "success");
  };

  return (
    <div
      className="mb-4 pb-3"
      style={{ borderBottom: `1px solid ${HAIRLINE}` }}
    >
      {editing ? (
        <div className="flex flex-col gap-2">
          {/* Row: caption + input + actions. Stacks on a narrow phone so the
              Save button never gets squeezed off the edge by the input. */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <label
              htmlFor="restock-cadence"
              className="text-[10px] font-bold uppercase tracking-[0.14em] flex-shrink-0"
              style={captionStyle}
            >
              Restock cadence
            </label>
            <input
              id="restock-cadence"
              type="text"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isDirty && !saving) {
                  e.preventDefault();
                  void handleSave();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  handleCancel();
                }
              }}
              placeholder="Every other Friday, 6pm PST"
              className="flex-1 min-w-0 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-[#22d3ee]/50 placeholder:text-[#6b6180]"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(34,211,238,0.35)",
                fontFamily: "Inter, sans-serif",
              }}
            />
            <div className="flex gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !isDirty}
                className="rounded-lg px-3.5 py-2 text-xs font-bold text-white disabled:opacity-40 transition-opacity"
                style={{
                  background: `linear-gradient(135deg, ${MAGENTA}, #a855f7)`,
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="rounded-lg px-3.5 py-2 text-xs font-bold disabled:opacity-40"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(150,110,240,0.24)",
                  color: MUTED,
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
          <p
            className="text-[11px]"
            style={{ color: FAINT, fontFamily: "Inter, sans-serif" }}
          >
            Shown on your public brand page so shoppers know when to check back.
          </p>
        </div>
      ) : (
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.14em] flex-shrink-0"
            style={captionStyle}
          >
            Restock cadence
          </span>
          <span
            className="text-sm min-w-0 flex-1 break-words"
            style={{
              color: isSet ? TEXT_STRONG : MUTED,
              fontFamily: "Inter, sans-serif",
            }}
          >
            {isSet ? saved : "Not set"}
          </span>
          <button
            type="button"
            onClick={startEdit}
            className="flex-shrink-0 text-xs font-bold py-1 hover:opacity-80 transition-opacity"
            style={{ color: CYAN, fontFamily: "Montserrat, sans-serif" }}
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}

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
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

const supabase = createClient();

const CYAN = "#22d3ee";
const MAGENTA = "#ff2bd6";
const MUTED = "#8f83b0";
const FAINT = "#6b6180";

interface RestockCadenceRowProps {
  brandId: string;
  userId: string;
  initialSchedule: string | null;
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
      className="rounded-xl mb-4 px-4 py-3"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(150,110,240,0.18)",
      }}
    >
      {open ? (
        <div>
          <label
            className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-2"
            style={{ color: CYAN, fontFamily: "Montserrat, sans-serif" }}
            htmlFor="restock-cadence"
          >
            Brand restock cadence
          </label>
          <input
            id="restock-cadence"
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 120))}
            placeholder="Every other Friday, 6pm PST"
            className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#ff2bd6]/40 placeholder:text-[#6b6180]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(150,110,240,0.24)",
              fontFamily: "Inter, sans-serif",
            }}
          />
          <p className="text-[11px] mt-2" style={{ color: FAINT }}>
            Shown on your public brand page so collectors know when to check
            back. Leave it empty to hide it.
          </p>
          <div className="flex gap-2.5 mt-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50 transition-opacity"
              style={{
                background: "linear-gradient(135deg, #ff2bd6, #a855f7)",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-xs font-bold"
              style={{
                background: "transparent",
                border: "1px solid rgba(150,110,240,0.18)",
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
          className="w-full flex items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-2.5 min-w-0">
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
              style={{ color: MUTED, flexShrink: 0 }}
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <span
              className="text-[11px] font-bold uppercase tracking-[0.14em] flex-shrink-0"
              style={{ color: MUTED, fontFamily: "Montserrat, sans-serif" }}
            >
              Restock cadence
            </span>
            <span
              className="text-sm truncate"
              style={{
                color: isSet ? "rgba(245,245,245,0.85)" : FAINT,
                fontFamily: "Inter, sans-serif",
              }}
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
                    background: "rgba(34,211,238,0.1)",
                    border: "1px solid rgba(34,211,238,0.3)",
                  }
                : {
                    color: MAGENTA,
                    background: "rgba(255,43,214,0.08)",
                    border: "1px solid rgba(255,43,214,0.25)",
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

// apps/web/components/admin/BrandOwnershipActions.tsx
"use client";

import { useState } from "react";

// One <BrandOwnershipActions> renders per brand row in /admin/brands.
//
// States:
//   - Unclaimed (ownerId == null): one green "Claim to me" button.
//   - Owned by current admin: one red "Unclaim (release ownership)" button.
//   - Owned by someone else: a red "Force unclaim" button AND a cyan
//     "Take over" button.
//
// Every action expands to an inline "Are you sure?" pill (no browser
// confirm()) before firing its POST. On success we show a short success
// state and reload the page after 800ms so the whole table re-renders from
// fresh DB state. Errors surface as an inline red pill.

type Action = "claim" | "unclaim" | "take-over";

interface Props {
  brandId: string;
  ownerId: string | null;
  currentAdminId: string;
}

const ENDPOINT: Record<Action, string> = {
  claim: "claim",
  unclaim: "unclaim",
  "take-over": "take-over",
};

const SUCCESS_LABEL: Record<Action, string> = {
  claim: "Claimed",
  unclaim: "Unclaimed",
  "take-over": "Taken over",
};

export default function BrandOwnershipActions({
  brandId,
  ownerId,
  currentAdminId,
}: Props) {
  // Which action is currently awaiting confirmation (null = show the base
  // button row).
  const [confirming, setConfirming] = useState<Action | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Action | null>(null);

  const ownedByMe = ownerId !== null && ownerId === currentAdminId;
  const ownedByOther = ownerId !== null && ownerId !== currentAdminId;

  async function run(action: Action) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/brands/${brandId}/${ENDPOINT[action]}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (json && typeof json.error === "string" ? json.error : null) ??
            "Something went wrong. Please try again.",
        );
        setSubmitting(false);
        setConfirming(null);
        return;
      }
      setDone(action);
      // Reload so the table reflects the new ownership everywhere.
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
      setConfirming(null);
    }
  }

  if (done) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full whitespace-nowrap"
        style={{
          background: "rgba(57,255,20,0.15)",
          border: "1px solid rgba(57,255,20,0.5)",
          color: "#39FF14",
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        {SUCCESS_LABEL[done]}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      {error && (
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg text-right"
          style={{
            background: "rgba(255,61,110,0.12)",
            border: "1px solid rgba(255,61,110,0.45)",
            color: "#FF3D6E",
            maxWidth: 260,
          }}
        >
          {error}
        </span>
      )}

      {confirming ? (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-[11px] font-semibold text-slime-muted mr-1">
            Are you sure?
          </span>
          <button
            type="button"
            disabled={submitting}
            onClick={() => run(confirming)}
            className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-transform active:scale-[0.97] disabled:opacity-60"
            style={{
              background: "#39FF14",
              color: "#0A0A0A",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            {submitting ? "Working" : "Yes"}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              setConfirming(null);
              setError(null);
            }}
            className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
            style={{
              background: "rgba(10,0,20,0.55)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#FFFFFF",
            }}
          >
            No
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          {ownerId === null && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setConfirming("claim");
              }}
              className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-transform active:scale-[0.97]"
              style={{
                background: "#39FF14",
                color: "#0A0A0A",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              Claim to me
            </button>
          )}

          {ownedByMe && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setConfirming("unclaim");
              }}
              className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-transform active:scale-[0.97]"
              style={{
                background: "rgba(255,61,110,0.15)",
                border: "1px solid rgba(255,61,110,0.6)",
                color: "#FF3D6E",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              Unclaim (release ownership)
            </button>
          )}

          {ownedByOther && (
            <>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setConfirming("unclaim");
                }}
                className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-transform active:scale-[0.97]"
                style={{
                  background: "rgba(255,61,110,0.15)",
                  border: "1px solid rgba(255,61,110,0.6)",
                  color: "#FF3D6E",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                Force unclaim
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setConfirming("take-over");
                }}
                className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-transform active:scale-[0.97]"
                style={{
                  background: "rgba(0,240,255,0.15)",
                  border: "1px solid rgba(0,240,255,0.6)",
                  color: "#00F0FF",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                Take over
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

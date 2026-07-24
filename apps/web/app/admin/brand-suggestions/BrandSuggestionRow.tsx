"use client";
// apps/web/app/admin/brand-suggestions/BrandSuggestionRow.tsx
//
// T110 (2026-07-11): interactive row for the admin brand-suggestion
// queue. Renders the suggestion details plus three actions on pending
// rows:
//
//   * Approve — inline form: editable slug + admin notes.
//   * Reject  — inline form: notes textarea.
//   * Mark duplicate — inline form: optional linked brand UUID +
//     notes. Empty UUID means "duplicate of another pending suggestion"
//     (silent — no notification fired).
//
// Non-pending rows just display the resolved status pill + admin notes
// preview.

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BrandSuggestionPotentialDuplicate } from "@/lib/types";

type BrandSuggestionStatus = "pending" | "approved" | "rejected" | "duplicate";

interface Suggestion {
  id: string;
  name: string;
  website_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  note: string | null;
  status: BrandSuggestionStatus;
  admin_notes: string | null;
  resolved_brand_id: string | null;
  resolved_at: string | null;
  createdAtRelative: string;
  createdAtIso: string;
}

interface Submitter {
  id: string;
  username: string | null;
  display_name: string | null;
}

interface Props {
  suggestion: Suggestion;
  submitter: Submitter | null;
  defaultSlug: string;
  // Populated by the server component for pending rows only. Empty
  // array for non-pending statuses.
  potentialDuplicates: BrandSuggestionPotentialDuplicate[];
}

type Mode =
  | { kind: "idle" }
  | { kind: "approve"; slug: string; notes: string }
  | { kind: "reject"; notes: string }
  | { kind: "duplicate"; resolvedBrandId: string; notes: string };

const STATUS_COLORS: Record<BrandSuggestionStatus, string> = {
  pending: "#00F0FF",
  approved: "#39FF14",
  rejected: "#FF00E5",
  duplicate: "#FFB800",
};

const STATUS_LABELS: Record<BrandSuggestionStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  duplicate: "Duplicate",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const inlineInputStyle = {
  width: "100%",
  borderRadius: 10,
  background: "rgba(10,0,20,0.55)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "white",
  padding: "10px 12px",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box" as const,
};

function StatusPill({ status }: { status: BrandSuggestionStatus }) {
  const color = STATUS_COLORS[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full whitespace-nowrap"
      style={{
        background: `${color}1F`,
        border: `1px solid ${color}66`,
        color,
        fontFamily: "Montserrat, sans-serif",
      }}
    >
      <svg width="6" height="6" viewBox="0 0 6 6" aria-hidden="true">
        <circle cx="3" cy="3" r="3" fill={color} />
      </svg>
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function BrandSuggestionRow({
  suggestion,
  submitter,
  defaultSlug,
  potentialDuplicates,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isPending = suggestion.status === "pending";

  async function callAction(
    endpoint: "approve" | "reject" | "mark-duplicate",
    body: Record<string, unknown>,
  ): Promise<void> {
    setSubmitting(true);
    setError(null);
    setNotice(null);
    let res: Response;
    try {
      res = await fetch(
        `/api/admin/brand-suggestions/${suggestion.id}/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
      return;
    }

    const json: unknown = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Safety-net auto-reject on approve (mig 66): the endpoint found
      // an existing brand with an exact case-insensitive name match,
      // auto-rejected the suggestion, and notified the submitter.
      // Show that as a friendly note (not a red error banner) and
      // refresh the queue — the row will drop out of Pending on its
      // own.
      const payload = json as {
        error?: string;
        code?: string;
        existing_brand?: { id: string; slug: string; name: string };
      };
      if (
        res.status === 409 &&
        payload.code === "exact_duplicate" &&
        payload.existing_brand
      ) {
        const b = payload.existing_brand;
        setNotice(
          `Auto-rejected: "${b.name}" is already in the catalog at /brands/${b.slug}. The submitter was notified.`,
        );
        router.refresh();
        setSubmitting(false);
        setMode({ kind: "idle" });
        return;
      }
      const message =
        payload.error ?? "Action failed. Check server logs.";
      setError(message);
      setSubmitting(false);
      return;
    }
    router.refresh();
    setSubmitting(false);
    setMode({ kind: "idle" });
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "rgba(45,10,78,0.25)",
        border: "1px solid rgba(45,10,78,0.7)",
      }}
    >
      {/* Top row: name + status pill */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p
            className="text-lg font-bold text-white truncate"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            {suggestion.name}
          </p>
          <p className="text-xs mt-0.5">
            <span style={{ color: "#888888" }}>Submitted by </span>
            <span style={{ color: "#FF00E5", fontWeight: 600 }}>
              @{submitter?.username ?? "unknown"}
            </span>
            <span style={{ color: "#888888" }}>
              {" "}
              &middot; {suggestion.createdAtRelative}
            </span>
          </p>
        </div>
        <StatusPill status={suggestion.status} />
      </div>

      {/* Details */}
      <div className="flex flex-col gap-1.5 text-xs mb-3">
        {suggestion.website_url && (
          <p>
            <span className="text-slime-muted">Website: </span>
            <a
              href={suggestion.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: "#00F0FF" }}
            >
              {suggestion.website_url}
            </a>
          </p>
        )}
        {suggestion.instagram_handle && (
          <p>
            <span className="text-slime-muted">Instagram: </span>
            <a
              href={`https://instagram.com/${suggestion.instagram_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: "#FF00E5" }}
            >
              @{suggestion.instagram_handle}
            </a>
          </p>
        )}
        {suggestion.tiktok_handle && (
          <p>
            <span className="text-slime-muted">TikTok: </span>
            <a
              href={`https://tiktok.com/@${suggestion.tiktok_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: "#00F0FF" }}
            >
              @{suggestion.tiktok_handle}
            </a>
          </p>
        )}
        {suggestion.note && (
          <p className="mt-1">
            <span className="text-slime-muted">Note: </span>
            <span className="text-slime-text">{suggestion.note}</span>
          </p>
        )}
      </div>

      {/* Resolved-state admin notes preview */}
      {!isPending && suggestion.admin_notes && (
        <div
          className="rounded-lg px-3 py-2 mt-2 mb-2 text-xs"
          style={{
            background: "rgba(10,0,20,0.4)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <p className="text-[10px] uppercase tracking-widest text-slime-muted font-semibold mb-1">
            Admin notes (private)
          </p>
          <p className="text-slime-text whitespace-pre-wrap">
            {suggestion.admin_notes}
          </p>
        </div>
      )}

      {/* Potential-duplicate hints — pending rows only. Assisted-review
          from mig 66. If any brand names overlap in either direction,
          show them as amber chips plus a Quick action to pre-fill the
          Mark-duplicate form. If none, show the green all-clear line so
          the admin can approve with confidence. */}
      {isPending && (
        <div className="mt-3 mb-2">
          {potentialDuplicates.length > 0 ? (
            <div>
              <p
                className="text-[11px] font-semibold mb-1.5"
                style={{ color: "#FFAE3B" }}
              >
                {"⚠"} Potential duplicates:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {potentialDuplicates.map((dupe) => (
                  <div
                    key={dupe.id}
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px]"
                    style={{
                      background: "rgba(255,174,59,0.10)",
                      border: "1px solid rgba(255,174,59,0.45)",
                    }}
                  >
                    <a
                      href={`/brands/${dupe.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                      style={{ color: "#FFAE3B", fontWeight: 600 }}
                    >
                      {dupe.name}
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        setMode({
                          kind: "duplicate",
                          resolvedBrandId: dupe.id,
                          notes: `Duplicate of "${dupe.name}"`,
                        })
                      }
                      disabled={submitting}
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold disabled:opacity-60"
                      style={{
                        background: "rgba(255,174,59,0.25)",
                        color: "#FFAE3B",
                        border: "1px solid rgba(255,174,59,0.55)",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                      title="Pre-fill the mark-duplicate form with this brand"
                    >
                      Mark as duplicate
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[11px]" style={{ color: "#39FF14" }}>
              No potential duplicates found {"✓"}
            </p>
          )}
        </div>
      )}

      {/* Notice banner — used for the safety-net auto-reject on approve. */}
      {notice && (
        <div
          className="rounded-lg px-3 py-2 mt-2 mb-2 text-xs"
          style={{
            background: "rgba(255,184,0,0.10)",
            border: "1px solid rgba(255,184,0,0.45)",
            color: "#FFD98A",
          }}
        >
          {notice}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          className="rounded-lg px-3 py-2 mt-2 mb-2 text-xs"
          style={{
            background: "rgba(255,120,120,0.10)",
            border: "1px solid rgba(255,120,120,0.4)",
            color: "#FFB3B3",
          }}
        >
          {error}
        </div>
      )}

      {/* Action buttons — only on pending rows */}
      {isPending && mode.kind === "idle" && (
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            onClick={() =>
              setMode({ kind: "approve", slug: defaultSlug, notes: "" })
            }
            className="px-4 py-2 rounded-full text-xs font-bold text-slime-bg transition-transform active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => setMode({ kind: "reject", notes: "" })}
            className="px-4 py-2 rounded-full text-xs font-bold text-white transition-colors"
            style={{
              background: "rgba(255,0,229,0.2)",
              border: "1px solid rgba(255,0,229,0.5)",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() =>
              setMode({ kind: "duplicate", resolvedBrandId: "", notes: "" })
            }
            className="px-4 py-2 rounded-full text-xs font-bold transition-colors"
            style={{
              background: "rgba(255,184,0,0.15)",
              border: "1px solid rgba(255,184,0,0.45)",
              color: "#FFB800",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            Mark duplicate
          </button>
        </div>
      )}

      {/* Approve inline form */}
      {isPending && mode.kind === "approve" && (
        <div
          className="rounded-xl p-3 mt-3"
          style={{
            background: "rgba(57,255,20,0.06)",
            border: "1px solid rgba(57,255,20,0.35)",
          }}
        >
          <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: "#39FF14" }}>
            Approve
          </p>
          <label className="block text-xs text-slime-muted mb-1">
            Brand slug
          </label>
          <input
            type="text"
            value={mode.slug}
            onChange={(e) =>
              setMode({ ...mode, slug: e.target.value.toLowerCase() })
            }
            placeholder="cloud-nine"
            disabled={submitting}
            style={inlineInputStyle}
          />
          <label className="block text-xs text-slime-muted mt-3 mb-1">
            Admin notes (optional, private)
          </label>
          <textarea
            value={mode.notes}
            onChange={(e) => setMode({ ...mode, notes: e.target.value })}
            rows={2}
            maxLength={500}
            disabled={submitting}
            style={{ ...inlineInputStyle, resize: "vertical" }}
          />
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setMode({ kind: "idle" })}
              className="px-4 py-2 rounded-full text-xs font-semibold text-white transition-colors disabled:opacity-60"
              style={{
                background: "rgba(10,0,20,0.55)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting || mode.slug.trim().length < 2}
              onClick={() =>
                callAction("approve", {
                  slug: mode.slug.trim(),
                  notes: mode.notes.trim() || null,
                })
              }
              className="px-4 py-2 rounded-full text-xs font-bold text-slime-bg transition-transform active:scale-[0.97] disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              {submitting ? "Approving..." : "Confirm approve"}
            </button>
          </div>
        </div>
      )}

      {/* Reject inline form */}
      {isPending && mode.kind === "reject" && (
        <div
          className="rounded-xl p-3 mt-3"
          style={{
            background: "rgba(255,0,229,0.06)",
            border: "1px solid rgba(255,0,229,0.4)",
          }}
        >
          <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: "#FF00E5" }}>
            Reject
          </p>
          <label className="block text-xs text-slime-muted mb-1">
            Admin notes (optional, private)
          </label>
          <textarea
            value={mode.notes}
            onChange={(e) => setMode({ ...mode, notes: e.target.value })}
            rows={2}
            maxLength={500}
            placeholder="Why this doesn't fit the catalog."
            disabled={submitting}
            style={{ ...inlineInputStyle, resize: "vertical" }}
          />
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setMode({ kind: "idle" })}
              className="px-4 py-2 rounded-full text-xs font-semibold text-white transition-colors disabled:opacity-60"
              style={{
                background: "rgba(10,0,20,0.55)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() =>
                callAction("reject", {
                  notes: mode.notes.trim() || null,
                })
              }
              className="px-4 py-2 rounded-full text-xs font-bold text-white transition-transform active:scale-[0.97] disabled:opacity-60"
              style={{
                background: "rgba(255,0,229,0.9)",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              {submitting ? "Rejecting..." : "Confirm reject"}
            </button>
          </div>
        </div>
      )}

      {/* Mark-duplicate inline form */}
      {isPending && mode.kind === "duplicate" && (
        <div
          className="rounded-xl p-3 mt-3"
          style={{
            background: "rgba(255,184,0,0.06)",
            border: "1px solid rgba(255,184,0,0.35)",
          }}
        >
          <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: "#FFB800" }}>
            Mark duplicate
          </p>
          <label className="block text-xs text-slime-muted mb-1">
            Existing brand UUID (optional)
          </label>
          <input
            type="text"
            value={mode.resolvedBrandId}
            onChange={(e) =>
              setMode({ ...mode, resolvedBrandId: e.target.value })
            }
            placeholder="Paste brand UUID to link (leave blank for silent dedupe)"
            disabled={submitting}
            style={{ ...inlineInputStyle, fontFamily: "monospace" }}
          />
          <p className="text-[11px] text-slime-muted/70 mt-1">
            With a UUID: fires an &quot;already in catalog&quot; notification linked to
            that brand. Blank: silent dedupe, no notification.
          </p>
          <label className="block text-xs text-slime-muted mt-3 mb-1">
            Admin notes (optional, private)
          </label>
          <textarea
            value={mode.notes}
            onChange={(e) => setMode({ ...mode, notes: e.target.value })}
            rows={2}
            maxLength={500}
            disabled={submitting}
            style={{ ...inlineInputStyle, resize: "vertical" }}
          />
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setMode({ kind: "idle" })}
              className="px-4 py-2 rounded-full text-xs font-semibold text-white transition-colors disabled:opacity-60"
              style={{
                background: "rgba(10,0,20,0.55)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={
                submitting ||
                (mode.resolvedBrandId.trim().length > 0 &&
                  !UUID_RE.test(mode.resolvedBrandId.trim()))
              }
              onClick={() =>
                callAction("mark-duplicate", {
                  resolved_brand_id:
                    mode.resolvedBrandId.trim().length > 0
                      ? mode.resolvedBrandId.trim()
                      : null,
                  notes: mode.notes.trim() || null,
                })
              }
              className="px-4 py-2 rounded-full text-xs font-bold transition-transform active:scale-[0.97] disabled:opacity-60"
              style={{
                background: "rgba(255,184,0,0.9)",
                color: "#0A0A0A",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              {submitting ? "Saving..." : "Confirm duplicate"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

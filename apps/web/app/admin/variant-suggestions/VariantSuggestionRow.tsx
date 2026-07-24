"use client";
// apps/web/app/admin/variant-suggestions/VariantSuggestionRow.tsx
//
// T158 (2026-07-16) Commit B-admin: interactive row for the admin
// variant-suggestion queue. Mirrors the brand-suggestions row (T110).
//
// Pending-row actions:
//  * Approve - two modes selected via segmented control:
//    (A) Link to existing subtype - dropdown of subtypes for this
//      base_type. Optional brand_display_name (defaults to the
//      proposed name) + admin notes.
//    (B) Create a new subtype - text inputs for name, auto-suggested
//      slug, optional comma-separated aliases. Optional
//      brand_display_name + admin notes.
//   POSTs to /api/admin/variant-suggestions/{id}/approve.
//
//  * Reject - inline notes textarea. POST to .../reject.
//
//  * Mark duplicate - dropdown of other pending suggestions for the
//   same brand + base_type combo, optional notes. Blank selection
//   means silent dedupe (no notification, no linked peer id).
//   POST to .../mark-duplicate.
//
// Non-pending rows just show the status pill + admin notes preview.
// Reuses the same neon accent palette as BrandSuggestionRow:
//  approve = green (#39FF14), reject = magenta (#FF00E5),
//  duplicate = amber (#FFB800).

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SlimeBaseType } from "@/lib/types";
import type {
 SubtypeOption,
 BrandVariantSummary,
 PendingPeer,
} from "./page";

type VariantSuggestionStatus =
 | "pending"
 | "approved"
 | "rejected"
 | "duplicate";

interface Suggestion {
 id: string;
 proposed_name: string;
 base_type: SlimeBaseType;
 base_type_label: string;
 note: string | null;
 status: VariantSuggestionStatus;
 admin_notes: string | null;
 resolved_subtype_id: string | null;
 resolved_brand_variant_id: string | null;
 resolved_at: string | null;
 createdAtRelative: string;
 createdAtIso: string;
}

interface BrandLite {
 id: string;
 name: string;
 slug: string;
}

interface Submitter {
 id: string;
 username: string | null;
 display_name: string | null;
}

interface Props {
 suggestion: Suggestion;
 brand: BrandLite | null;
 submitter: Submitter | null;
 defaultSubtypeSlug: string;
 // All subtypes for this row's base_type. Feeds the "link existing"
 // mode's dropdown. Empty array means we only have the "create new"
 // mode meaningful (rare - every base has at least one canonical
 // subtype except brand-new bases like 'basic').
 subtypeOptions: SubtypeOption[];
 // brand_variants already tracked for this (brand, base_type) combo.
 // Rendered as an info line so the admin sees what's tracked before
 // deciding whether to link or create.
 existingVariants: BrandVariantSummary[];
 // Other pending peers for the same brand+base. Feeds the mark-
 // duplicate dropdown.
 pendingPeers: PendingPeer[];
}

type ApproveMode = "link" | "create";

type Mode =
 | { kind: "idle" }
 | {
   kind: "approve";
   approveMode: ApproveMode;
   // Mode A (link):
   subtypeId: string;
   // Mode B (create):
   newSubtypeName: string;
   newSubtypeSlug: string;
   newSubtypeAliases: string; // comma-separated input
   // Shared:
   brandDisplayName: string;
   notes: string;
  }
 | { kind: "reject"; notes: string }
 | { kind: "duplicate"; duplicateOfId: string; notes: string };

const STATUS_COLORS: Record<VariantSuggestionStatus, string> = {
 pending: "#00F0FF",
 approved: "#39FF14",
 rejected: "#FF00E5",
 duplicate: "#FFB800",
};

const STATUS_LABELS: Record<VariantSuggestionStatus, string> = {
 pending: "Pending",
 approved: "Approved",
 rejected: "Rejected",
 duplicate: "Duplicate",
};

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

// Kebab-cased slug guess mirroring the server helper.
function slugify(name: string): string {
 return name
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");
}

function StatusPill({ status }: { status: VariantSuggestionStatus }) {
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

export default function VariantSuggestionRow({
 suggestion,
 brand,
 submitter,
 defaultSubtypeSlug,
 subtypeOptions,
 existingVariants,
 pendingPeers,
}: Props) {
 const router = useRouter();
 const [mode, setMode] = useState<Mode>({ kind: "idle" });
 const [submitting, setSubmitting] = useState<boolean>(false);
 const [error, setError] = useState<string | null>(null);

 const isPending = suggestion.status === "pending";

 async function callAction(
  endpoint: "approve" | "reject" | "mark-duplicate",
  body: Record<string, unknown>,
 ): Promise<void> {
  setSubmitting(true);
  setError(null);
  let res: Response;
  try {
   res = await fetch(
    `/api/admin/variant-suggestions/${suggestion.id}/${endpoint}`,
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
   const payload = json as { error?: string };
   const message = payload.error ?? "Action failed. Check server logs.";
   setError(message);
   setSubmitting(false);
   return;
  }
  router.refresh();
  setSubmitting(false);
  setMode({ kind: "idle" });
 }

 function openApproveForm() {
  setError(null);
  setMode({
   kind: "approve",
   approveMode: subtypeOptions.length > 0 ? "link" : "create",
   subtypeId: "",
   newSubtypeName: suggestion.proposed_name,
   newSubtypeSlug: defaultSubtypeSlug,
   newSubtypeAliases: "",
   brandDisplayName: suggestion.proposed_name,
   notes: "",
  });
 }

 function updateApprove(patch: Partial<Extract<Mode, { kind: "approve" }>>) {
  setMode((prev) => {
   if (prev.kind !== "approve") return prev;
   return { ...prev, ...patch };
  });
 }

 function submitApprove() {
  if (mode.kind !== "approve") return;
  const brandDisplayName = mode.brandDisplayName.trim() || null;
  const notes = mode.notes.trim() || null;

  if (mode.approveMode === "link") {
   if (!mode.subtypeId) {
    setError("Pick a subtype to link to.");
    return;
   }
   void callAction("approve", {
    subtype_id: mode.subtypeId,
    brand_display_name: brandDisplayName,
    notes,
   });
  } else {
   const name = mode.newSubtypeName.trim();
   const slug = mode.newSubtypeSlug.trim();
   const aliases = mode.newSubtypeAliases
    .split(",")
    .map((a) => a.trim())
    .filter((a) => a.length > 0);

   if (name.length < 2 || name.length > 60) {
    setError("Subtype name must be 2 to 60 characters.");
    return;
   }
   if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    setError(
     "Slug must be lowercase letters, numbers, and hyphens (e.g. cloud-nine).",
    );
    return;
   }
   if (aliases.length > 10) {
    setError("At most 10 aliases.");
    return;
   }
   for (const a of aliases) {
    if (a.length < 2 || a.length > 60) {
     setError("Each alias must be 2 to 60 characters.");
     return;
    }
   }
   void callAction("approve", {
    new_subtype: { name, slug, aliases },
    brand_display_name: brandDisplayName,
    notes,
   });
  }
 }

 const brandLabel = brand?.name ?? "Unknown brand";

 return (
  <div
   className="rounded-2xl p-5"
   style={{
    background: "rgba(45,10,78,0.25)",
    border: "1px solid rgba(45,10,78,0.7)",
   }}
  >
   {/* Top row: proposed name + status pill */}
   <div className="flex items-start justify-between gap-3 mb-3">
    <div className="min-w-0">
     <p
      className="text-lg font-bold text-white truncate"
      style={{ fontFamily: "Montserrat, sans-serif" }}
     >
      {suggestion.proposed_name}
     </p>
     <p className="text-xs mt-0.5 truncate">
      {brand ? (
       <a
        href={`/brands/${brand.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
        style={{ color: "#00F0FF", fontWeight: 600 }}
       >
        {brandLabel}
       </a>
      ) : (
       <span style={{ color: "#00F0FF", fontWeight: 600 }}>
        {brandLabel}
       </span>
      )}
      <span style={{ color: "#888888" }}>
       {" "}
       &middot; {suggestion.base_type_label}
      </span>
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

   {/* Submitter note */}
   {suggestion.note && (
    <div className="text-xs mb-3">
     <span className="text-slime-muted">Note: </span>
     <span className="text-slime-text whitespace-pre-wrap">
      {suggestion.note}
     </span>
    </div>
   )}

   {/* Already-tracked variants for this brand+base. Info line only. */}
   {isPending && (
    <div className="mt-1 mb-3">
     {existingVariants.length > 0 ? (
      <div>
       <p
        className="text-[11px] font-semibold mb-1.5"
        style={{ color: "#00F0FF" }}
       >
        Already tracked for {brandLabel} +{" "}
        {suggestion.base_type_label}:
       </p>
       <div className="flex flex-wrap gap-1.5">
        {existingVariants.map((v) => (
         <span
          key={v.id}
          className="inline-flex items-center rounded-full px-2 py-1 text-[11px]"
          style={{
           background: "rgba(0,240,255,0.10)",
           border: "1px solid rgba(0,240,255,0.35)",
           color: "#8CE9F5",
          }}
         >
          {v.brand_display_name ?? v.subtype_name}
          {v.brand_display_name &&
          v.brand_display_name !== v.subtype_name ? (
           <span
            className="ml-1 text-[10px]"
            style={{ color: "rgba(140,233,245,0.6)" }}
           >
            ({v.subtype_name})
           </span>
          ) : null}
         </span>
        ))}
       </div>
      </div>
     ) : (
      <p className="text-[11px]" style={{ color: "#39FF14" }}>
       No variants tracked yet for this brand + base type.
      </p>
     )}
    </div>
   )}

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

   {/* Action buttons - only on pending rows */}
   {isPending && mode.kind === "idle" && (
    <div className="flex flex-wrap gap-2 mt-3">
     <button
      type="button"
      onClick={openApproveForm}
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
      onClick={() => {
       setError(null);
       setMode({ kind: "reject", notes: "" });
      }}
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
      onClick={() => {
       setError(null);
       setMode({ kind: "duplicate", duplicateOfId: "", notes: "" });
      }}
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
     <p
      className="text-[10px] uppercase tracking-widest font-bold mb-2"
      style={{ color: "#39FF14" }}
     >
      Approve
     </p>

     {/* Segmented control - link vs create */}
     <div
      className="inline-flex rounded-full p-0.5 mb-3"
      style={{
       background: "rgba(10,0,20,0.55)",
       border: "1px solid rgba(255,255,255,0.10)",
      }}
     >
      {(
       [
        { key: "link", label: "Link existing" },
        { key: "create", label: "Create new" },
       ] as ReadonlyArray<{ key: ApproveMode; label: string }>
      ).map((opt) => {
       const active = mode.approveMode === opt.key;
       return (
        <button
         key={opt.key}
         type="button"
         disabled={submitting}
         onClick={() => updateApprove({ approveMode: opt.key })}
         className="px-3 py-1 rounded-full text-[11px] font-bold transition-colors disabled:opacity-60"
         style={{
          background: active
           ? "rgba(57,255,20,0.20)"
           : "transparent",
          color: active ? "#39FF14" : "rgba(245,245,245,0.55)",
          fontFamily: "Montserrat, sans-serif",
         }}
        >
         {opt.label}
        </button>
       );
      })}
     </div>

     {mode.approveMode === "link" ? (
      <>
       <label className="block text-xs text-slime-muted mb-1">
        Subtype to link to
       </label>
       {subtypeOptions.length === 0 ? (
        <p
         className="text-xs mb-1"
         style={{ color: "#FFAE3B" }}
        >
         No subtypes exist for {suggestion.base_type_label} yet.
         Switch to &quot;Create new&quot; to add the first canonical subtype.
        </p>
       ) : (
        <select
         value={mode.subtypeId}
         onChange={(e) =>
          updateApprove({ subtypeId: e.target.value })
         }
         disabled={submitting}
         style={inlineInputStyle}
        >
         <option value="">Choose subtype...</option>
         {subtypeOptions.map((s) => (
          <option key={s.id} value={s.id}>
           {s.name}
          </option>
         ))}
        </select>
       )}
      </>
     ) : (
      <>
       <label className="block text-xs text-slime-muted mb-1">
        New subtype name
       </label>
       <input
        type="text"
        value={mode.newSubtypeName}
        onChange={(e) => {
         const nextName = e.target.value;
         updateApprove({
          newSubtypeName: nextName,
          newSubtypeSlug: slugify(nextName),
         });
        }}
        placeholder="Fluffernutter"
        disabled={submitting}
        style={inlineInputStyle}
       />
       <label className="block text-xs text-slime-muted mt-3 mb-1">
        Slug
       </label>
       <input
        type="text"
        value={mode.newSubtypeSlug}
        onChange={(e) =>
         updateApprove({
          newSubtypeSlug: e.target.value.toLowerCase(),
         })
        }
        placeholder="fluffernutter"
        disabled={submitting}
        style={inlineInputStyle}
       />
       <label className="block text-xs text-slime-muted mt-3 mb-1">
        Aliases (comma separated, optional)
       </label>
       <input
        type="text"
        value={mode.newSubtypeAliases}
        onChange={(e) =>
         updateApprove({ newSubtypeAliases: e.target.value })
        }
        placeholder="fluff nut, fluffernut"
        disabled={submitting}
        style={inlineInputStyle}
       />
       <p className="text-[11px] text-slime-muted/70 mt-1">
        Lowercase spellings the wizard should match against.
       </p>
      </>
     )}

     <label className="block text-xs text-slime-muted mt-3 mb-1">
      Brand display name (optional)
     </label>
     <input
      type="text"
      value={mode.brandDisplayName}
      onChange={(e) =>
       updateApprove({ brandDisplayName: e.target.value })
      }
      placeholder={suggestion.proposed_name}
      disabled={submitting}
      style={inlineInputStyle}
     />
     <p className="text-[11px] text-slime-muted/70 mt-1">
      How this brand markets the variant. Defaults to the proposed
      name.
     </p>

     <label className="block text-xs text-slime-muted mt-3 mb-1">
      Admin notes (optional, private)
     </label>
     <textarea
      value={mode.notes}
      onChange={(e) => updateApprove({ notes: e.target.value })}
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
       disabled={submitting}
       onClick={submitApprove}
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
     <p
      className="text-[10px] uppercase tracking-widest font-bold mb-2"
      style={{ color: "#FF00E5" }}
     >
      Reject
     </p>
     <label className="block text-xs text-slime-muted mb-1">
      Admin notes (optional, private)
     </label>
     <textarea
      value={mode.notes}
      onChange={(e) =>
       setMode({ kind: "reject", notes: e.target.value })
      }
      rows={2}
      maxLength={500}
      placeholder="Why this variant doesn't belong."
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
     <p
      className="text-[10px] uppercase tracking-widest font-bold mb-2"
      style={{ color: "#FFB800" }}
     >
      Mark duplicate
     </p>
     <label className="block text-xs text-slime-muted mb-1">
      Duplicate of (optional)
     </label>
     {pendingPeers.length === 0 ? (
      <p
       className="text-xs mb-1"
       style={{ color: "rgba(255,184,0,0.85)" }}
      >
       No other pending suggestions for this brand + base type.
       Submit blank for a silent dedupe.
      </p>
     ) : (
      <select
       value={mode.duplicateOfId}
       onChange={(e) =>
        setMode({
         kind: "duplicate",
         duplicateOfId: e.target.value,
         notes: mode.notes,
        })
       }
       disabled={submitting}
       style={inlineInputStyle}
      >
       <option value="">(none, silent dedupe)</option>
       {pendingPeers.map((p) => (
        <option key={p.id} value={p.id}>
         {p.proposed_name}
        </option>
       ))}
      </select>
     )}
     <p className="text-[11px] text-slime-muted/70 mt-1">
      Pick another pending suggestion to link this to, or leave
      blank for a silent dedupe (no notification either way).
     </p>
     <label className="block text-xs text-slime-muted mt-3 mb-1">
      Admin notes (optional, private)
     </label>
     <textarea
      value={mode.notes}
      onChange={(e) =>
       setMode({
        kind: "duplicate",
        duplicateOfId: mode.duplicateOfId,
        notes: e.target.value,
       })
      }
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
       disabled={submitting}
       onClick={() =>
        callAction("mark-duplicate", {
         duplicate_of_suggestion_id:
          mode.duplicateOfId.trim().length > 0
           ? mode.duplicateOfId.trim()
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

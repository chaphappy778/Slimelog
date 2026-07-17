"use client";
// apps/web/components/brand/SubmitBrandForm.tsx
//
// T110 (2026-07-11): user-facing "suggest a brand" form. Posts to
// /api/brand-suggestions and renders a success card on ok. Handles
// the three failure modes the route emits:
//   * 409 duplicate — surfaces the existing brand link inline.
//   * 429 rate-limit — friendly "come back tomorrow".
//   * 400/500 — standard error pill.
//
// T168 (2026-07-17): optional `returnTo` prop lets an entry point
// (currently just the log wizard via BrandSearchInput) request that
// the user be routed back to a specific internal path on successful
// submit. When present, we skip the standard success card and
// router.push straight to that path so the log wizard's sessionStorage
// draft hydrates instantly. When absent, behavior is unchanged.
//
// Voice per project rules: "you" not "user"; no em-dashes in copy.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface DuplicateInfo {
  kind: "brand";
  id: string;
  name: string;
  slug: string;
}

interface Props {
  initialName?: string;
  // T168 (2026-07-17): validated internal path (already run through
  // safeRedirect by the server component). When present, successful
  // submit navigates here instead of showing the local success card.
  returnTo?: string | null;
}

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; alreadyPending: boolean }
  | { kind: "duplicate"; brand: DuplicateInfo }
  | { kind: "rate_limited" }
  | { kind: "error"; message: string };

const inputStyle = {
  width: "100%",
  borderRadius: 12,
  background: "rgba(45,10,78,0.35)",
  border: "1px solid rgba(45,10,78,0.8)",
  color: "white",
  padding: "12px 16px",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box" as const,
};

export default function SubmitBrandForm({
  initialName = "",
  returnTo = null,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState<string>(initialName);
  const [websiteUrl, setWebsiteUrl] = useState<string>("");
  const [instagramHandle, setInstagramHandle] = useState<string>("");
  const [tiktokHandle, setTiktokHandle] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  const submitting = state.kind === "submitting";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Client-side gates that mirror the server so we don't waste a round trip.
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 60) {
      setState({
        kind: "error",
        message: "Brand name needs to be between 2 and 60 characters.",
      });
      return;
    }
    const trimmedWebsite = websiteUrl.trim();
    if (trimmedWebsite.length === 0) {
      setState({
        kind: "error",
        message: "Website or shop link is required so we can verify the brand.",
      });
      return;
    }
    if (!/^https?:\/\//i.test(trimmedWebsite)) {
      setState({
        kind: "error",
        message: "Website URL needs to start with https://",
      });
      return;
    }

    setState({ kind: "submitting" });

    let res: Response;
    try {
      res = await fetch("/api/brand-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          website_url: trimmedWebsite,
          instagram_handle: instagramHandle.trim() || null,
          tiktok_handle: tiktokHandle.trim() || null,
          note: note.trim() || null,
        }),
      });
    } catch {
      setState({
        kind: "error",
        message: "Network error. Try again in a moment.",
      });
      return;
    }

    const json: unknown = await res.json().catch(() => ({}));

    if (res.status === 200) {
      const data = json as { ok?: boolean; already_pending?: boolean };
      // T168 (2026-07-17): if a validated returnTo path is present
      // (e.g. `/log` from the log-wizard entry point), route the user
      // back there instead of showing the local success card. The log
      // wizard's sessionStorage draft hydrates on mount so they pick
      // up right where they left off.
      if (returnTo) {
        router.push(returnTo);
        return;
      }
      setState({
        kind: "success",
        alreadyPending: data.already_pending === true,
      });
      // Reset form so a fresh submission is possible tomorrow.
      setName("");
      setWebsiteUrl("");
      setInstagramHandle("");
      setTiktokHandle("");
      setNote("");
      return;
    }

    if (res.status === 429) {
      setState({ kind: "rate_limited" });
      return;
    }

    if (res.status === 409) {
      const data = json as { duplicate?: DuplicateInfo };
      if (data.duplicate && data.duplicate.kind === "brand") {
        setState({ kind: "duplicate", brand: data.duplicate });
        return;
      }
      const message =
        (json as { error?: string }).error ?? "That brand is already tracked.";
      setState({ kind: "error", message });
      return;
    }

    const message =
      (json as { error?: string }).error ?? "Something went sideways. Try again.";
    setState({ kind: "error", message });
  }

  // ─── Success card ─────────────────────────────────────────────────────────

  if (state.kind === "success") {
    return (
      <div
        className="rounded-2xl p-6"
        style={{
          background: "rgba(57,255,20,0.08)",
          border: "1px solid rgba(57,255,20,0.4)",
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 40,
              height: 40,
              background: "rgba(57,255,20,0.15)",
              border: "1px solid rgba(57,255,20,0.4)",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#39FF14"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p
            className="text-lg font-bold"
            style={{ color: "#39FF14", fontFamily: "Montserrat, sans-serif" }}
          >
            {state.alreadyPending ? "Already on the list" : "We got it"}
          </p>
        </div>
        <p className="text-sm text-slime-text leading-relaxed mb-4">
          {state.alreadyPending
            ? "Looks like someone already suggested this brand. It's in the review queue. You'll get a notification when it joins the catalog."
            : "Admin review usually happens within 48 hours. You'll get a notification when your brand joins the catalog."}
        </p>
        <div className="flex flex-wrap gap-3">
          {/* T168 (2026-07-17): default to /brands here since the user
              just submitted a brand suggestion. When returnTo is set
              we redirect away before reaching this card, so this Link
              only runs for the vanilla /submit-brand entry point. */}
          <Link
            href={returnTo ?? "/brands"}
            className="inline-flex items-center px-4 py-2 rounded-full text-xs font-bold text-slime-bg"
            style={{
              background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            {returnTo ? "Back to your log" : "Back to brands"}
          </Link>
          <button
            type="button"
            onClick={() => setState({ kind: "idle" })}
            className="inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold text-slime-muted transition-colors"
            style={{
              background: "rgba(45,10,78,0.3)",
              border: "1px solid rgba(45,10,78,0.6)",
            }}
          >
            Suggest another
          </button>
        </div>
      </div>
    );
  }

  // ─── Duplicate card ─────────────────────────────────────────────────────

  const duplicateCard =
    state.kind === "duplicate" ? (
      <div
        className="rounded-xl px-4 py-3 mb-4 text-sm"
        style={{
          background: "rgba(255,0,229,0.10)",
          border: "1px solid rgba(255,0,229,0.4)",
          color: "#FFB3F0",
        }}
      >
        <p className="font-bold" style={{ color: "#FF00E5" }}>
          That brand is already in the catalog
        </p>
        <p className="mt-1">
          <Link
            href={`/brands/${state.brand.slug}`}
            className="underline"
            style={{ color: "#00F0FF" }}
          >
            Check out {state.brand.name}
          </Link>{" "}
          instead. If you think this is a different brand with the same name,
          reach out to support and we can sort it out.
        </p>
      </div>
    ) : null;

  const rateLimitCard =
    state.kind === "rate_limited" ? (
      <div
        className="rounded-xl px-4 py-3 mb-4 text-sm"
        style={{
          background: "rgba(255,184,0,0.10)",
          border: "1px solid rgba(255,184,0,0.4)",
          color: "#FFD980",
        }}
      >
        <p className="font-bold" style={{ color: "#FFB800" }}>
          One suggestion per day
        </p>
        <p className="mt-1">
          You've already submitted one today. Check back tomorrow to send us
          another.
        </p>
      </div>
    ) : null;

  const errorCard =
    state.kind === "error" ? (
      <div
        className="rounded-xl px-4 py-3 mb-4 text-sm"
        style={{
          background: "rgba(255,120,120,0.10)",
          border: "1px solid rgba(255,120,120,0.4)",
          color: "#FFB3B3",
        }}
      >
        {state.message}
      </div>
    ) : null;

  // ─── Form ───────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {duplicateCard}
      {rateLimitCard}
      {errorCard}

      <div className="flex flex-col gap-1.5">
        <label className="section-label">Brand name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Honeydew Slime Co."
          maxLength={60}
          disabled={submitting}
          required
          style={inputStyle}
        />
        <p className="text-right text-[11px] text-slime-muted">
          {name.length}/60
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="section-label">Website or shop link *</label>
        <input
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="https://honeydewslimes.com"
          maxLength={500}
          disabled={submitting}
          required
          style={inputStyle}
        />
        <p className="text-xs text-slime-muted/70">
          Etsy, TikTok Shop, own site, wherever they sell.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <label className="section-label">Instagram handle</label>
          <span className="text-xs text-slime-muted/60 normal-case tracking-normal font-normal">
            optional
          </span>
        </div>
        <input
          type="text"
          value={instagramHandle}
          onChange={(e) => setInstagramHandle(e.target.value)}
          placeholder="honeydewslimes"
          maxLength={40}
          disabled={submitting}
          style={inputStyle}
        />
        <p className="text-xs text-slime-muted/70">Skip the @.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <label className="section-label">TikTok handle</label>
          <span className="text-xs text-slime-muted/60 normal-case tracking-normal font-normal">
            optional
          </span>
        </div>
        <input
          type="text"
          value={tiktokHandle}
          onChange={(e) => setTiktokHandle(e.target.value)}
          placeholder="honeydewslimes"
          maxLength={40}
          disabled={submitting}
          style={inputStyle}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <label className="section-label">Anything else we should know?</label>
          <span className="text-xs text-slime-muted/60 normal-case tracking-normal font-normal">
            optional
          </span>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Restock day, specialty types, or why they're worth adding."
          maxLength={200}
          rows={3}
          disabled={submitting}
          style={{ ...inputStyle, resize: "none" }}
        />
        <p className="text-right text-[11px] text-slime-muted">
          {note.length}/200
        </p>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 rounded-xl text-sm font-bold text-slime-bg shadow-glow-green transition disabled:opacity-60 active:scale-[0.98]"
        style={{
          background: "linear-gradient(135deg, #39FF14, #00F0FF)",
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        {submitting ? "Sending..." : "Send suggestion"}
      </button>

      <p className="text-xs text-slime-muted/70 text-center">
        Review usually within 48 hours. One suggestion per day, please.
      </p>
    </form>
  );
}

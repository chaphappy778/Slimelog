"use client";
// apps/web/components/brand/SubmitBrandForm.tsx
//
// T110 (2026-07-11): user-facing "suggest a brand" form. Posts to
// /api/brand-suggestions and renders a success screen on ok. Handles
// the failure modes the route emits:
//   * 409 duplicate: surfaces the existing brand link inline.
//   * 429 rate-limit: friendly "come back tomorrow" (uses the server
//     message so trusted scouts see their higher cap, not "one per day").
//   * 400/500: inline error row (client + server validation, plus the
//     synchronous moderation gate, which the user can fix and resend).
//
// T168 (2026-07-17): optional `returnTo` prop lets an entry point
// (currently just the log wizard via BrandSearchInput) request that
// the user be routed back to a specific internal path on successful
// submit. When present, we skip the local success screen and
// router.push straight to that path so the log wizard's sessionStorage
// draft hydrates instantly. When absent, behavior is unchanged.
//
// T205 (2026-07-24): visual rebuild to Jenn's utility-pages mockup. The
// hero, card, and success screen all live here now so each form state
// controls its own layout (form = boxed card, success = centered
// screen). Every save path, validation gate, and state above is
// unchanged. Voice per project rules: "you" not "user"; no em-dashes.

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
  // submit navigates here instead of showing the local success screen.
  returnTo?: string | null;
}

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; alreadyPending: boolean }
  | { kind: "duplicate"; brand: DuplicateInfo }
  | { kind: "rate_limited"; message: string }
  | { kind: "error"; message: string };

// ─── Shared surfaces ────────────────────────────────────────────────────────

const CARD_STYLE = {
  background: "rgba(45,10,78,0.3)",
  border: "1px solid rgba(45,10,78,0.7)",
  boxShadow: "inset 0 0 30px rgba(45,10,78,0.2), 0 8px 32px rgba(0,0,0,0.4)",
} as const;

const inputBaseStyle = {
  width: "100%",
  borderRadius: 12,
  background: "rgba(45,10,78,0.35)",
  color: "#FFFFFF",
  padding: "12px 14px",
  fontSize: 15,
  lineHeight: 1.5,
  outline: "none",
  boxSizing: "border-box" as const,
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
};

const FOCUS_BORDER = "1px solid rgba(0,240,255,0.6)";
const REST_BORDER = "1px solid rgba(45,10,78,0.8)";
const FOCUS_GLOW = "0 0 0 3px rgba(0,240,255,0.12)";

// ─── Field wrapper ──────────────────────────────────────────────────────────
// Label row + input + optional helper/counter, managing its own focus
// state so the input picks up the cyan focus glow from the mockup without
// leaning on a global stylesheet rule.

interface FieldProps {
  label: string;
  required?: boolean;
  optional?: boolean;
  counter?: string;
  helper?: string;
  children: (opts: {
    focused: boolean;
    onFocus: () => void;
    onBlur: () => void;
    style: React.CSSProperties;
  }) => React.ReactNode;
}

function Field({
  label,
  required = false,
  optional = false,
  counter,
  helper,
  children,
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  const style: React.CSSProperties = {
    ...inputBaseStyle,
    border: focused ? FOCUS_BORDER : REST_BORDER,
    boxShadow: focused ? FOCUS_GLOW : "none",
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="section-label">
            {label}
            {required && <span style={{ color: "#FF6187" }}> *</span>}
          </span>
          {optional && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slime-muted/70">
              optional
            </span>
          )}
        </span>
        {counter && (
          <span className="text-[12px]" style={{ color: "rgba(245,245,245,0.4)" }}>
            {counter}
          </span>
        )}
      </div>
      {children({
        focused,
        onFocus: () => setFocused(true),
        onBlur: () => setFocused(false),
        style,
      })}
      {helper && (
        <p className="text-[13px]" style={{ color: "rgba(245,245,245,0.65)" }}>
          {helper}
        </p>
      )}
    </div>
  );
}

// ─── Icons ──────────────────────────────────────────────────────────────────

function ClockIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

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
        message: "Add a website or shop link so we can verify the brand.",
      });
      return;
    }
    if (!/^https?:\/\//i.test(trimmedWebsite)) {
      setState({
        kind: "error",
        message: "That link needs to start with https://",
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
        message: "Network hiccup. Try again in a moment.",
      });
      return;
    }

    const json: unknown = await res.json().catch(() => ({}));

    if (res.status === 200) {
      const data = json as { ok?: boolean; already_pending?: boolean };
      // T168 (2026-07-17): if a validated returnTo path is present
      // (e.g. `/log` from the log-wizard entry point), route the user
      // back there instead of showing the success screen. The log
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
      // Surface the server's own message: trusted scouts get a higher
      // cap ("You've submitted 5 today...") than first-timers, so a
      // hardcoded "one per day" line would misreport their limit.
      const message =
        (json as { error?: string }).error ??
        "You've already submitted one today. Check back tomorrow to send another.";
      setState({ kind: "rate_limited", message });
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
      (json as { error?: string }).error ??
      "Something went sideways. Try again.";
    setState({ kind: "error", message });
  }

  // ─── Success screen ────────────────────────────────────────────────────────

  if (state.kind === "success") {
    const backHref = returnTo ?? "/brands";
    return (
      <div className="text-center pt-4">
        <div
          className="mx-auto mb-6 flex items-center justify-center rounded-full"
          style={{
            width: 84,
            height: 84,
            background: "rgba(57,255,20,0.12)",
            border: "1px solid rgba(57,255,20,0.5)",
            boxShadow: "0 0 40px rgba(57,255,20,0.25)",
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6DFF4D"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1
          className="text-2xl font-black tracking-tight"
          style={{ fontFamily: "Montserrat, sans-serif", color: "#FFFFFF" }}
        >
          {state.alreadyPending
            ? "Already on the list"
            : "You're in. Thanks for the tip."}
        </h1>
        <p
          className="mx-auto mt-3 max-w-[40ch] text-[15px] leading-relaxed"
          style={{ color: "rgba(245,245,245,0.65)" }}
        >
          {state.alreadyPending
            ? "Someone already suggested this one, so it's in the review queue. Keep an eye on your notifications and you'll hear when it joins the catalog."
            : "Your suggestion is in the queue. We review new brands every day, so keep an eye on your notifications."}
        </p>
        <div
          className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px]"
          style={{
            background: "rgba(45,10,78,0.3)",
            border: "1px solid rgba(45,10,78,0.7)",
            color: "rgba(245,245,245,0.85)",
          }}
        >
          <ClockIcon color="#3DF2FF" size={18} />
          That&apos;s your one for today. Come back tomorrow to suggest another.
        </div>
        <div className="mt-7">
          <Link
            href={backHref}
            className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-bold transition active:scale-[0.98]"
            style={{
              background: "rgba(45,10,78,0.5)",
              border: "1px solid rgba(45,10,78,0.9)",
              color: "rgba(245,245,245,0.9)",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            {returnTo ? "Back to your log" : "Back to Brands"}
          </Link>
        </div>
      </div>
    );
  }

  // ─── Inline banners (form stays visible so the user can adjust) ─────────────

  const duplicateBanner =
    state.kind === "duplicate" ? (
      <div
        className="mb-5 flex items-start gap-3 rounded-2xl px-4 py-3.5"
        style={{
          background: "rgba(255,0,229,0.09)",
          border: "1px solid rgba(255,0,229,0.4)",
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#D976FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ flexShrink: 0, marginTop: 1 }}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <div className="text-[14px] leading-relaxed" style={{ color: "rgba(245,245,245,0.85)" }}>
          <b style={{ color: "#FFFFFF" }}>
            Good taste, we already track {state.brand.name}.
          </b>{" "}
          If you meant a different shop with the same name, tweak the name and
          resend. Otherwise, go check it out.
          <div className="mt-2">
            <Link
              href={`/brands/${state.brand.slug}`}
              className="font-bold no-underline"
              style={{ color: "#D976FF" }}
            >
              View brand page
            </Link>
          </div>
        </div>
      </div>
    ) : null;

  const rateLimitBanner =
    state.kind === "rate_limited" ? (
      <div
        className="mb-5 flex items-start gap-3 rounded-2xl px-4 py-3.5"
        style={{
          background: "rgba(255,174,59,0.10)",
          border: "1px solid rgba(255,174,59,0.4)",
        }}
      >
        <ClockIcon color="#FFBE57" />
        <div className="text-[14px] leading-relaxed" style={{ color: "rgba(245,245,245,0.85)" }}>
          <b style={{ color: "#FFBE57" }}>That&apos;s a wrap for today.</b>{" "}
          {state.message}
        </div>
      </div>
    ) : null;

  const inlineError =
    state.kind === "error" ? (
      <div
        className="flex items-center gap-2.5 text-[13px]"
        style={{ color: "#FF6187" }}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <path d="M10.3 3.9L1.8 18a1.5 1.5 0 0 0 1.3 2.2h17.8a1.5 1.5 0 0 0 1.3-2.2L13.7 3.9a1.5 1.5 0 0 0-2.6 0z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
        {state.message}
      </div>
    ) : null;

  // ─── Form ───────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="mb-6">
        <h1
          className="text-3xl font-black tracking-tight"
          style={{
            fontFamily: "Montserrat, sans-serif",
            background:
              "linear-gradient(90deg, #00F0FF 0%, #39FF14 50%, #FF00E5 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Suggest a brand
        </h1>
        <p
          className="mt-2 max-w-[44ch] text-[15px] leading-relaxed"
          style={{ color: "rgba(245,245,245,0.65)" }}
        >
          Know a slime shop we should track? Drop the details. If it checks out,
          it joins the catalog and you get the notification.
        </p>
      </div>

      {duplicateBanner}
      {rateLimitBanner}

      <div className="rounded-2xl p-6" style={CARD_STYLE}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label="Brand name" required counter={`${name.length}/60`}>
            {({ style, onFocus, onBlur }) => (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder="Honeydew Slimes"
                maxLength={60}
                disabled={submitting}
                required
                style={style}
              />
            )}
          </Field>

          <Field
            label="Website or shop link"
            required
            helper="Etsy, TikTok Shop, or their own site, wherever they sell."
          >
            {({ style, onFocus, onBlur }) => (
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder="https://honeydewslimes.com"
                maxLength={500}
                disabled={submitting}
                required
                style={style}
              />
            )}
          </Field>

          <Field
            label="Instagram handle"
            optional
            helper="Skip the @, we'll add it."
          >
            {({ style, onFocus, onBlur }) => (
              <input
                type="text"
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder="honeydewslimes"
                maxLength={40}
                disabled={submitting}
                style={style}
              />
            )}
          </Field>

          <Field label="TikTok handle" optional>
            {({ style, onFocus, onBlur }) => (
              <input
                type="text"
                value={tiktokHandle}
                onChange={(e) => setTiktokHandle(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder="honeydewslimes"
                maxLength={40}
                disabled={submitting}
                style={style}
              />
            )}
          </Field>

          <Field
            label="Anything else we should know?"
            optional
            counter={`${note.length}/200`}
          >
            {({ style, onFocus, onBlur }) => (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder="Restock days, specialty types, or why they're worth adding."
                maxLength={200}
                rows={3}
                disabled={submitting}
                style={{ ...style, resize: "vertical", minHeight: 88 }}
              />
            )}
          </Field>

          {inlineError}

          <div
            className="flex items-start gap-3 rounded-xl px-4 py-3"
            style={{
              background: "rgba(0,240,255,0.06)",
              border: "1px solid rgba(0,240,255,0.35)",
            }}
          >
            <ClockIcon color="#3DF2FF" />
            <p
              className="text-[13px] leading-relaxed"
              style={{ color: "rgba(245,245,245,0.85)" }}
            >
              <b style={{ color: "#FFFFFF" }}>One suggestion per day.</b> So pick
              the shop you&apos;re most hyped about. Your next one unlocks
              tomorrow.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition disabled:opacity-60 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #FF00E5, #00F0FF)",
              boxShadow: "0 8px 24px rgba(255,0,229,0.28)",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            {submitting ? "Sending..." : "Send suggestion"}
          </button>
        </form>
      </div>

      <p
        className="mx-auto mt-5 max-w-[42ch] text-center text-[13px] leading-relaxed"
        style={{ color: "rgba(245,245,245,0.4)" }}
      >
        We review new brands every day. If yours checks out, you&apos;ll get a
        notification the moment it joins the catalog.
      </p>
    </div>
  );
}

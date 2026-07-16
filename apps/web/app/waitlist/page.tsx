"use client";

// apps/web/app/waitlist/page.tsx
//
// 2026-07-15 side quest: attribution capture for paid promo + giveaways.
// Adds:
//   - "How did you hear about us?" dropdown (7 canonical values + Other free text)
//   - Silent UTM param capture via useSearchParams (utm_source, utm_medium,
//     utm_campaign, utm_content, utm_term)
//   - Both vectors POST to /api/waitlist; the API stores them on public.waitlist
//     and syncs HEARD_FROM to Brevo as a contact attribute for list segmentation.
//
// UI decision: styled native <select> instead of chip pills. The waitlist page's
// primary conversion is the email signup; attribution is a secondary optional
// question. Dropdown reads as "optional, pick if you want" whereas chips read
// as "important, please answer" and visually compete with the CTA. Native
// <select> also renders the iOS wheel picker + Android modal, which users know.

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExternalLink } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

type UtmParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

// Canonical heard_from allowlist matches the server allowlist in
// /api/waitlist/route.ts. Adding an option here requires adding it there too
// (the API coerces unknown values to "other" silently). Ordered by expected
// promo volume — Instagram + TikTok first since Jenn's channels are the
// primary flywheel.
const HEARD_FROM_OPTIONS: { value: string; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "friend_or_family", label: "Friend or family" },
  { value: "giveaway", label: "Giveaway" },
  { value: "search", label: "Search" },
  { value: "other", label: "Other" },
];

// ─── Floating Pill ─────────────────────────────────────────────────────────

type PillColor = "green" | "purple" | "cyan" | "magenta";

interface FloatingPillProps {
  color: PillColor;
  width?: number;
  height?: number;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  rotation?: number;
  opacity?: number;
  blur?: boolean;
}

function FloatingPill({
  color,
  width = 32,
  height = 72,
  top,
  bottom,
  left,
  right,
  rotation = 0,
  opacity = 0.92,
  blur = false,
}: FloatingPillProps) {
  const gradients: Record<PillColor, string> = {
    green: "linear-gradient(180deg, #39FF14 0%, #00C853 100%)",
    purple: "linear-gradient(180deg, #7C3AED 0%, #2D0A4E 100%)",
    cyan: "linear-gradient(180deg, #00F0FF 0%, #0080AA 100%)",
    magenta: "linear-gradient(180deg, #FF00E5 0%, #8B0066 100%)",
  };

  // 2026-07-15: add per-color glow so pills bleed through the card's blur +
  // semi-transparent violet fill. Without this the pills that sit behind the
  // card get darkened to near-invisible; the glow halo extends past the card's
  // clip edge and reads as brightness. Matches Design's mockup treatment.
  const glows: Record<PillColor, string> = {
    green: "0 0 26px rgba(57,255,20,0.55)",
    purple: "0 0 26px rgba(124,58,237,0.5)",
    cyan: "0 0 26px rgba(0,240,255,0.5)",
    magenta: "0 0 26px rgba(255,0,229,0.45)",
  };

  return (
    <div
      aria-hidden="true"
      className="absolute pointer-events-none select-none"
      style={{
        top,
        bottom,
        left,
        right,
        width,
        height,
        borderRadius: 999,
        background: gradients[color],
        boxShadow: glows[color],
        transform: `rotate(${rotation}deg)`,
        opacity,
        filter: blur ? "blur(2px)" : undefined,
        zIndex: 0,
      }}
    />
  );
}

// ─── SlimeLog Wordmark ─────────────────────────────────────────────────────

function Wordmark({ size = "lg" }: { size?: "sm" | "lg" }) {
  const textClass =
    size === "lg"
      ? "text-4xl font-black tracking-tight"
      : "text-xl font-black tracking-tight";

  return (
    <span
      className={textClass}
      style={{
        background:
          "linear-gradient(90deg, #39FF14 0%, #00F0FF 40%, #FF00E5 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      SlimeLog
    </span>
  );
}

// ─── Background Dots ───────────────────────────────────────────────────────

function BackgroundDots() {
  const dots = [
    { top: "18%", left: "8%", size: 3 },
    { top: "32%", left: "92%", size: 2 },
    { top: "55%", left: "5%", size: 2 },
    { top: "70%", left: "88%", size: 3 },
    { top: "85%", left: "15%", size: 2 },
    { top: "12%", left: "55%", size: 2 },
    { top: "44%", left: "78%", size: 3 },
    { top: "90%", left: "60%", size: 2 },
  ];

  return (
    <>
      {dots.map((dot, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="absolute rounded-full pointer-events-none select-none"
          style={{
            top: dot.top,
            left: dot.left,
            width: dot.size,
            height: dot.size,
            background: "#ffffff",
            opacity: 0.35,
          }}
        />
      ))}
    </>
  );
}

// ─── Heard-From Dropdown ───────────────────────────────────────────────────

function HeardFromDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const isPlaceholder = value === "";

  return (
    <div className="relative w-full">
      <label
        htmlFor="heard_from"
        className="block text-xs font-bold uppercase tracking-widest mb-2"
        style={{
          color: "rgba(245,245,245,0.55)",
          fontFamily: "'Montserrat', sans-serif",
          letterSpacing: "0.12em",
        }}
      >
        How did you hear about us?
      </label>
      <div className="relative w-full">
        <select
          id="heard_from"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl px-4 py-3.5 pr-11 text-sm outline-none transition-all cursor-pointer"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: isPlaceholder ? "rgba(245,245,245,0.45)" : "#F5F5F5",
            fontFamily: "'Montserrat', sans-serif",
          }}
          onFocus={(e) => {
            e.target.style.border = "1px solid #00F0FF";
            e.target.style.boxShadow = "0 0 0 3px rgba(0,240,255,0.12)";
          }}
          onBlur={(e) => {
            e.target.style.border = "1px solid rgba(255,255,255,0.12)";
            e.target.style.boxShadow = "none";
          }}
        >
          <option value="" disabled>
            Pick one (optional)
          </option>
          {HEARD_FROM_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} style={{ color: "#0A0A0A" }}>
              {opt.label}
            </option>
          ))}
        </select>
        {/* Custom chevron overlay */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            width="12"
            height="8"
            viewBox="0 0 12 8"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 1L6 6L11 1"
              stroke={isPlaceholder ? "rgba(245,245,245,0.45)" : "#00F0FF"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Waitlist Form ─────────────────────────────────────────────────────────

function WaitlistForm({ utmParams }: { utmParams: UtmParams }) {
  const [email, setEmail] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [heardFrom, setHeardFrom] = useState("");
  const [heardFromOther, setHeardFromOther] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "success" | "duplicate" | "error"
  >("idle");

  const handleSubmit = async () => {
    if (!email.includes("@")) return;
    setLoading(true);
    try {
      // Assemble heard_from payload. "other" alone means Other was picked
      // but no free text; "other:<text>" carries the free-text answer.
      // Empty string means user skipped the question — send undefined so
      // the API stores NULL rather than an empty coerced value.
      let heardFromPayload: string | undefined;
      if (heardFrom === "other") {
        const trimmed = heardFromOther.trim();
        heardFromPayload = trimmed ? `other:${trimmed}` : "other";
      } else if (heardFrom !== "") {
        heardFromPayload = heardFrom;
      }

      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          marketing_consent: marketingConsent,
          heard_from: heardFromPayload,
          ...utmParams,
        }),
      });
      const data = await res.json();
      if (data.already) setStatus("duplicate");
      else if (res.ok) setStatus("success");
      else setStatus("error");
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  if (status === "success") {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: "rgba(57,255,20,0.08)",
          border: "1px solid rgba(57,255,20,0.3)",
        }}
      >
        <p
          className="font-bold text-lg mb-2"
          style={{ color: "#39FF14", fontFamily: "'Montserrat', sans-serif" }}
        >
          You&apos;re on the list!
        </p>
        <p
          className="text-sm leading-relaxed mb-5"
          style={{ color: "rgba(245,245,245,0.6)" }}
        >
          We&apos;ll reach out with your beta invite when we&apos;re ready.
          Follow <span style={{ color: "#39FF14" }}>@SlimeLogApp</span> for
          updates.
        </p>
        <a
          href="https://instagram.com/SlimeLogApp"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold"
          style={{
            background: "linear-gradient(135deg, #39FF14, #00F0FF)",
            color: "#0A0A0A",
            fontFamily: "'Montserrat', sans-serif",
          }}
        >
          <ExternalLink size={15} />
          Follow @SlimeLogApp
        </a>
      </div>
    );
  }

  if (status === "duplicate") {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: "rgba(57,255,20,0.08)",
          border: "1px solid rgba(57,255,20,0.3)",
        }}
      >
        <p
          className="font-bold text-lg mb-2"
          style={{ color: "#39FF14", fontFamily: "'Montserrat', sans-serif" }}
        >
          You&apos;re already on the list!
        </p>
        <p className="text-sm" style={{ color: "rgba(245,245,245,0.6)" }}>
          We&apos;ll be in touch soon.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Email input */}
      <input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition-all"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#F5F5F5",
          fontFamily: "'Montserrat', sans-serif",
        }}
        onFocus={(e) => {
          e.target.style.border = "1px solid #39FF14";
          e.target.style.boxShadow = "0 0 0 3px rgba(57,255,20,0.12)";
        }}
        onBlur={(e) => {
          e.target.style.border = "1px solid rgba(255,255,255,0.12)";
          e.target.style.boxShadow = "none";
        }}
      />

      {/* Heard-from dropdown */}
      <HeardFromDropdown value={heardFrom} onChange={setHeardFrom} />

      {/* Other freetext — appears only when Other is picked */}
      {heardFrom === "other" && (
        <input
          type="text"
          maxLength={74}
          placeholder="Where did you hear about us?"
          value={heardFromOther}
          onChange={(e) => setHeardFromOther(e.target.value)}
          className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition-all"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#F5F5F5",
            fontFamily: "'Montserrat', sans-serif",
          }}
          onFocus={(e) => {
            e.target.style.border = "1px solid #00F0FF";
            e.target.style.boxShadow = "0 0 0 3px rgba(0,240,255,0.12)";
          }}
          onBlur={(e) => {
            e.target.style.border = "1px solid rgba(255,255,255,0.12)";
            e.target.style.boxShadow = "none";
          }}
        />
      )}

      {/* Marketing consent checkbox */}
      <label className="flex items-start gap-3 cursor-pointer">
        <div className="relative mt-0.5 shrink-0">
          <input
            type="checkbox"
            checked={marketingConsent}
            onChange={(e) => setMarketingConsent(e.target.checked)}
            className="sr-only"
          />
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center transition-all"
            style={{
              background: marketingConsent
                ? "linear-gradient(135deg, #39FF14, #00F0FF)"
                : "rgba(255,255,255,0.06)",
              border: marketingConsent
                ? "none"
                : "1px solid rgba(255,255,255,0.2)",
            }}
          >
            {marketingConsent && (
              <svg
                width="12"
                height="9"
                viewBox="0 0 12 9"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M1 4L4.5 7.5L11 1"
                  stroke="#0A0A0A"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        </div>
        <span
          className="text-sm leading-relaxed"
          style={{
            color: "rgba(245,245,245,0.7)",
            fontFamily: "'Montserrat', sans-serif",
          }}
        >
          Send me updates about new features, drops, and launch news
        </span>
      </label>

      {/* Submit button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="w-full rounded-xl py-3.5 text-sm font-bold transition-transform active:scale-[0.97] disabled:opacity-70 disabled:cursor-not-allowed"
        style={{
          background: "linear-gradient(135deg, #39FF14 0%, #00F0FF 100%)",
          color: "#0A0A0A",
          fontFamily: "'Montserrat', sans-serif",
          letterSpacing: "0.02em",
        }}
      >
        {loading ? "Joining..." : "Join Waitlist"}
      </button>

      {/* Error message */}
      {status === "error" && (
        <p
          className="text-center text-xs"
          style={{ color: "rgba(255,80,80,0.9)" }}
        >
          Something went wrong — DM us @SlimeLogApp
        </p>
      )}

      {/* Age/privacy notice */}
      <p
        className="text-center text-xs leading-relaxed"
        style={{ color: "rgba(245,245,245,0.35)" }}
      >
        By joining you confirm you are 13 or older and agree to our{" "}
        <Link
          href="/privacy"
          className="transition-all active:opacity-60"
          style={{
            color: "#39FF14",
            textDecoration: "underline",
            textUnderlineOffset: "2px",
          }}
        >
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link
          href="/terms"
          className="transition-all active:opacity-60"
          style={{
            color: "#39FF14",
            textDecoration: "underline",
            textUnderlineOffset: "2px",
          }}
        >
          Terms of Service
        </Link>
      </p>
    </div>
  );
}

// ─── Waitlist Page ─────────────────────────────────────────────────────────

function WaitlistPageInner() {
  // 2026-07-15 side quest: capture UTM params silently. Paid ads (Instagram
  // Ads, TikTok Ads) attach these to their click URLs; organic DMs and story
  // shares usually don't. Both channels can coexist in the same row — self-
  // report via the dropdown covers organic, UTMs cover paid.
  const searchParams = useSearchParams();
  const utmParams: UtmParams = useMemo(
    () => ({
      utm_source: searchParams.get("utm_source") ?? undefined,
      utm_medium: searchParams.get("utm_medium") ?? undefined,
      utm_campaign: searchParams.get("utm_campaign") ?? undefined,
      utm_content: searchParams.get("utm_content") ?? undefined,
      utm_term: searchParams.get("utm_term") ?? undefined,
    }),
    [searchParams],
  );

  return (
    <div
      className="relative min-h-screen overflow-x-hidden flex flex-col items-center justify-center px-5 py-14"
      style={{
        background:
          "radial-gradient(ellipse 100% 60% at 50% 0%, #2D0A4E 0%, #100020 35%, #0A0A0A 65%)",
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      <BackgroundDots />

      <FloatingPill
        color="green"
        width={28}
        height={64}
        top="4%"
        left="3%"
        rotation={8}
      />
      <FloatingPill
        color="purple"
        width={24}
        height={56}
        top="6%"
        left="28%"
        rotation={0}
      />
      <FloatingPill
        color="cyan"
        width={20}
        height={48}
        top="3%"
        right="28%"
        rotation={-4}
      />
      <FloatingPill
        color="green"
        width={26}
        height={60}
        top="4%"
        right="4%"
        rotation={-6}
      />
      <FloatingPill
        color="magenta"
        width={22}
        height={50}
        top="22%"
        left="1%"
        rotation={15}
        opacity={0.5}
      />
      <FloatingPill
        color="cyan"
        width={18}
        height={42}
        top="18%"
        right="2%"
        rotation={-12}
        opacity={0.5}
      />
      <FloatingPill
        color="purple"
        width={22}
        height={50}
        bottom="6%"
        left="4%"
        rotation={10}
        blur
      />
      <FloatingPill
        color="green"
        width={28}
        height={65}
        bottom="5%"
        right="5%"
        rotation={-8}
      />
      <FloatingPill
        color="magenta"
        width={20}
        height={44}
        bottom="20%"
        left="2%"
        rotation={6}
        opacity={0.45}
      />
      <FloatingPill
        color="cyan"
        width={18}
        height={40}
        bottom="22%"
        right="3%"
        rotation={-9}
        opacity={0.4}
      />

      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center gap-8">
        <Link href="/landing" className="no-underline">
          <Wordmark size="lg" />
        </Link>

        <div className="text-center">
          <h1
            className="text-4xl font-black leading-tight mb-3"
            style={{ color: "#F5F5F5" }}
          >
            Be First In Line
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "rgba(245,245,245,0.5)" }}
          >
            Join the waitlist for early access and updates
          </p>
        </div>

        <div
          className="w-full rounded-2xl p-6"
          style={{
            // 2026-07-15: reduced card alpha from 0.35 → 0.28 so the pill glows
            // behind the card read as brightness rather than darkening. Matches
            // the login page's lighter treatment (0.3) but goes slightly further
            // since the waitlist page uses stronger backdrop-blur which already
            // provides visual separation. Inner box-shadow adds depth back
            // without darkening the through-background.
            background: "rgba(45,10,78,0.28)",
            border: "1px solid rgba(45,10,78,0.7)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow:
              "inset 0 0 40px rgba(45,10,78,0.25), 0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <WaitlistForm utmParams={utmParams} />
        </div>
      </div>
    </div>
  );
}

export default function WaitlistPage() {
  // useSearchParams requires a Suspense boundary in Next.js App Router.
  // Fallback is transparent — the page renders its shell without UTM capture
  // for the split-second before hydration completes.
  return (
    <Suspense fallback={null}>
      <WaitlistPageInner />
    </Suspense>
  );
}

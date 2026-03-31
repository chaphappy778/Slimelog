"use client";

// apps/web/app/waitlist/page.tsx

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

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
  opacity = 0.85,
  blur = false,
}: FloatingPillProps) {
  const gradients: Record<PillColor, string> = {
    green: "linear-gradient(180deg, #39FF14 0%, #00C853 100%)",
    purple: "linear-gradient(180deg, #7C3AED 0%, #2D0A4E 100%)",
    cyan: "linear-gradient(180deg, #00F0FF 0%, #0080AA 100%)",
    magenta: "linear-gradient(180deg, #FF00E5 0%, #8B0066 100%)",
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

// ─── Waitlist Form ─────────────────────────────────────────────────────────

function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "success" | "duplicate" | "error"
  >("idle");

  const handleSubmit = async () => {
    if (!email.includes("@")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, marketing_consent: marketingConsent }),
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
          You're on the list!
        </p>
        <p
          className="text-sm leading-relaxed mb-5"
          style={{ color: "rgba(245,245,245,0.6)" }}
        >
          We'll reach out with your beta invite when we're ready. Follow{" "}
          <span style={{ color: "#39FF14" }}>@SlimeLogApp</span> for updates.
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
          You're already on the list!
        </p>
        <p className="text-sm" style={{ color: "rgba(245,245,245,0.6)" }}>
          We'll be in touch soon.
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

export default function WaitlistPage() {
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
            background: "rgba(45,10,78,0.35)",
            border: "1px solid rgba(45,10,78,0.8)",
            backdropFilter: "blur(8px)",
          }}
        >
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
}

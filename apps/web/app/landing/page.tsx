"use client";

// apps/web/app/landing/LandingPage.tsx

import { useState } from "react";
import Link from "next/link";
import { Star, Layers, Zap, ExternalLink } from "lucide-react";

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

// ─── Dot/Star scatter ──────────────────────────────────────────────────────

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

// ─── Feature Card ──────────────────────────────────────────────────────────

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  body: string;
}

function FeatureCard({ icon, title, body }: FeatureCardProps) {
  return (
    <div
      className="relative rounded-2xl p-5 flex gap-4 items-start overflow-hidden"
      style={{
        background: "rgba(45, 10, 78, 0.35)",
        border: "1px solid rgba(45, 10, 78, 0.8)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* subtle inner glow */}
      <div
        aria-hidden="true"
        className="absolute -top-4 -left-4 w-20 h-20 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(57,255,20,0.12), transparent)",
        }}
      />
      <div
        className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{
          background: "rgba(57,255,20,0.1)",
          border: "1px solid rgba(57,255,20,0.25)",
        }}
      >
        <span style={{ color: "#39FF14" }}>{icon}</span>
      </div>
      <div>
        <p
          className="font-bold text-base mb-1"
          style={{ color: "#F5F5F5", fontFamily: "'Montserrat', sans-serif" }}
        >
          {title}
        </p>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "rgba(245,245,245,0.6)" }}
        >
          {body}
        </p>
      </div>
    </div>
  );
}

// ─── Waitlist Form ─────────────────────────────────────────────────────────

function WaitlistForm() {
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ email, marketing_consent: false }),
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
        className="rounded-2xl p-5 text-center"
        style={{
          background: "rgba(57,255,20,0.08)",
          border: "1px solid rgba(57,255,20,0.3)",
        }}
      >
        <p className="text-2xl mb-1">🎉</p>
        <p
          className="font-bold text-base"
          style={{ color: "#39FF14", fontFamily: "'Montserrat', sans-serif" }}
        >
          You're on the list!
        </p>
        <p className="text-sm mt-1" style={{ color: "rgba(245,245,245,0.6)" }}>
          We'll hit your inbox the moment we launch.
        </p>
      </div>
    );
  }

  if (status === "duplicate") {
    return (
      <div
        className="rounded-2xl p-5 text-center"
        style={{
          background: "rgba(57,255,20,0.08)",
          border: "1px solid rgba(57,255,20,0.3)",
        }}
      >
        <p className="text-2xl mb-1">💚</p>
        <p
          className="font-bold text-base"
          style={{ color: "#39FF14", fontFamily: "'Montserrat', sans-serif" }}
        >
          You're already on the list!
        </p>
        <p className="text-sm mt-1" style={{ color: "rgba(245,245,245,0.6)" }}>
          We'll be in touch soon. Follow @SlimeLogApp for updates.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
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
      {status === "error" && (
        <p
          className="text-center text-xs"
          style={{ color: "rgba(255,80,80,0.9)" }}
        >
          Something went wrong — DM us @SlimeLogApp
        </p>
      )}
    </div>
  );
}

// ─── Landing Page ──────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{
        background: "#0A0A0A",
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      {/* ── Minimal Nav ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-4"
        style={{
          background: "rgba(10,10,10,0.75)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <Wordmark size="sm" />
      </nav>

      {/* ══════════════════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════════════════ */}
      <section
        className="relative flex flex-col items-center justify-center min-h-screen px-5 pt-20 pb-12 text-center overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 30%, #2D0A4E 0%, #100020 45%, #0A0A0A 100%)",
        }}
      >
        <BackgroundDots />

        {/* Pills — hero */}
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
          top="3%"
          left="30%"
          rotation={0}
        />
        <FloatingPill
          color="purple"
          width={22}
          height={52}
          top="2%"
          left="58%"
          rotation={5}
        />
        <FloatingPill
          color="green"
          width={26}
          height={60}
          top="3%"
          right="4%"
          rotation={-6}
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

        {/* Beta label */}
        <p
          className="text-xs font-bold tracking-[0.2em] uppercase mb-5 z-10"
          style={{ color: "#39FF14" }}
        >
          Now in Beta
        </p>

        {/* Headline */}
        <h1
          className="text-5xl font-black leading-[1.05] tracking-tight mb-4 z-10"
          style={{ color: "#F5F5F5", maxWidth: 340 }}
        >
          Your Slime{" "}
          <span
            style={{
              background: "linear-gradient(90deg, #39FF14 0%, #00F0FF 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Obsession
          </span>
          <br />
          Deserves This
        </h1>

        {/* Subhead */}
        <p
          className="text-base mb-8 z-10"
          style={{
            color: "rgba(245,245,245,0.55)",
            maxWidth: 280,
            lineHeight: 1.6,
          }}
        >
          The ultimate slime rating &amp; discovery app
        </p>

        {/* CTA — navigates to /waitlist page */}
        <div className="flex gap-3 z-10">
          <Link
            href="/waitlist"
            className="px-8 py-3 rounded-full text-sm font-bold transition-transform active:scale-[0.96]"
            style={{
              background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              color: "#0A0A0A",
              boxShadow: "0 0 20px rgba(57,255,20,0.35)",
            }}
          >
            Join Waitlist
          </Link>
        </div>

        {/* Scroll hint */}
        <div
          className="absolute bottom-6 left-0 right-0 flex justify-center z-10"
          aria-hidden="true"
        >
          <div className="flex flex-col items-center gap-1.5 opacity-40">
            <div
              className="w-px h-6"
              style={{
                background: "linear-gradient(to bottom, transparent, #F5F5F5)",
              }}
            />
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FEATURES SECTION
      ══════════════════════════════════════════════════════ */}
      <section className="relative px-5 py-14 overflow-hidden">
        {/* Section bg */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(45,10,78,0.25) 0%, transparent 70%)",
          }}
        />

        {/* Label */}
        <p
          className="text-xs font-bold tracking-[0.18em] uppercase mb-6 text-center"
          style={{ color: "#00F0FF" }}
        >
          What You Can Do
        </p>

        {/* Cards */}
        <div className="flex flex-col gap-4 relative z-10">
          <FeatureCard
            icon={<Star size={20} />}
            title="Rate Every Slime"
            body="Score texture, scent, sound, drizzle, creativity and more across 7 dimensions."
          />
          <FeatureCard
            icon={<Layers size={20} />}
            title="Track Your Collection"
            body="Log every slime you've tried. Build your stash. Never forget a slime again."
          />
          <FeatureCard
            icon={<Zap size={20} />}
            title="Never Miss a Drop"
            body="Follow your favorite brands and get notified the moment a new drop goes live."
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FOR BRANDS SECTION
      ══════════════════════════════════════════════════════ */}
      <section
        className="relative px-5 py-14 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 100% 80% at 50% 50%, rgba(45,10,78,0.55) 0%, rgba(10,10,10,0) 80%)",
          borderTop: "1px solid rgba(45,10,78,0.5)",
          borderBottom: "1px solid rgba(45,10,78,0.5)",
        }}
      >
        {/* Pill decorations */}
        <FloatingPill
          color="purple"
          width={20}
          height={46}
          top="8%"
          left="2%"
          rotation={12}
          opacity={0.5}
        />
        <FloatingPill
          color="green"
          width={18}
          height={40}
          top="10%"
          right="3%"
          rotation={-10}
          opacity={0.5}
        />
        <FloatingPill
          color="cyan"
          width={16}
          height={36}
          bottom="8%"
          left="5%"
          rotation={8}
          opacity={0.4}
        />
        <FloatingPill
          color="magenta"
          width={18}
          height={42}
          bottom="6%"
          right="4%"
          rotation={-12}
          opacity={0.45}
        />

        {/* Label */}
        <p
          className="text-xs font-bold tracking-[0.18em] uppercase mb-5 text-center"
          style={{ color: "#FF00E5" }}
        >
          Calling All Slime Brands
        </p>

        {/* Headline */}
        <h2
          className="text-3xl font-black text-center leading-tight mb-3"
          style={{ color: "#F5F5F5", fontFamily: "'Montserrat', sans-serif" }}
        >
          Want Your Brand{" "}
          <span
            style={{
              background: "linear-gradient(90deg, #39FF14, #00F0FF)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Included?
          </span>
        </h2>

        <p
          className="text-center text-sm mb-8 leading-relaxed"
          style={{
            color: "rgba(245,245,245,0.55)",
            maxWidth: 300,
            margin: "0 auto 2rem",
          }}
        >
          We're building the ultimate slime rating &amp; discovery app — and we
          want YOUR shop featured.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {[
            "Get Rated & Reviewed",
            "Verified Brand Badge",
            "Reach New Customers",
          ].map((label) => (
            <span
              key={label}
              className="text-xs font-semibold px-4 py-2 rounded-full"
              style={{
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(245,245,245,0.8)",
                background: "rgba(255,255,255,0.05)",
              }}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3">
          <a
            href="https://instagram.com/SlimeLogApp"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full max-w-xs flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-bold transition-transform active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              color: "#0A0A0A",
              boxShadow: "0 0 18px rgba(57,255,20,0.3)",
            }}
          >
            Contact Us!
          </a>

          <p
            className="text-xs text-center"
            style={{ color: "rgba(245,245,245,0.4)" }}
          >
            DM @SlimeLogApp to get started
          </p>

          {/* Instagram handle pill */}
          <a
            href="https://instagram.com/SlimeLogApp"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold mt-1"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#F5F5F5",
            }}
          >
            <ExternalLink size={16} style={{ color: "#FF00E5" }} />
            @SlimeLogApp
          </a>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          WAITLIST SECTION
      ══════════════════════════════════════════════════════ */}
      <section id="waitlist" className="relative px-5 py-14 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(0,240,255,0.06) 0%, transparent 70%)",
          }}
        />

        <h2
          className="text-3xl font-black text-center mb-2 z-10 relative"
          style={{
            color: "#00F0FF",
            fontFamily: "'Montserrat', sans-serif",
          }}
        >
          Be First In Line
        </h2>
        <p
          className="text-center text-sm mb-8 z-10 relative"
          style={{ color: "rgba(245,245,245,0.5)" }}
        >
          Join the waitlist for early access
        </p>

        <div className="relative z-10 max-w-sm mx-auto">
          <WaitlistForm />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════ */}
      <footer
        className="relative px-5 py-10 flex flex-col items-center gap-3 text-center overflow-hidden"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Wordmark size="lg" />

        <p
          className="text-xs tracking-[0.2em] uppercase"
          style={{ color: "rgba(245,245,245,0.35)" }}
        >
          Rate It · Log It · Love It
        </p>

        <a
          href="https://instagram.com/SlimeLogApp"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold"
          style={{ color: "rgba(245,245,245,0.45)" }}
        >
          <ExternalLink size={13} />
          @SlimeLogApp
        </a>

        <p
          className="text-[11px] mt-2"
          style={{ color: "rgba(245,245,245,0.2)" }}
        >
          © {new Date().getFullYear()} SlimeLog. All rights reserved.
        </p>

        {/* Legal links */}
        <div className="flex gap-3 justify-center mt-1">
          <Link
            href="/privacy"
            className="text-[11px]"
            style={{ color: "rgba(245,245,245,0.25)" }}
          >
            Privacy Policy
          </Link>
          <span
            className="text-[11px]"
            style={{ color: "rgba(245,245,245,0.15)" }}
          >
            ·
          </span>
          <Link
            href="/terms"
            className="text-[11px]"
            style={{ color: "rgba(245,245,245,0.25)" }}
          >
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
}

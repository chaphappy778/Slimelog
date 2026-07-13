// apps/web/app/how-to-rate/page.tsx
// T32e (2026-07-13): /how-to-rate rebuilt as a server component and
// rewritten to be a sibling of /guide. Sticky pill nav below the hero,
// six per-axis sections with big gradient hero cards + definitions +
// what-to-look-for bullets + low/high score example bars + optional
// magenta notes, and a final "07 The Scale" section. Route stays the
// same — no redirect. Content module lives at ./content.ts.

import type { Metadata } from "next";
import Link from "next/link";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/PageHeader";
import AxisSection from "@/components/how-to-rate/AxisSection";
import HowToRateNav from "@/components/how-to-rate/HowToRateNav";
import ScaleSection from "@/components/how-to-rate/ScaleSection";
import { PARTS, RATING_AXES, SCALE_BANDS } from "./content";

export const metadata: Metadata = {
  title: "How to Rate a Slime | SlimeLog",
  description:
    "SlimeLog's six-axis rating system explained. Texture, Sound, Aesthetic, Creativity, Quality, and Overall. What each one means and how to score it.",
  openGraph: {
    title: "How to Rate a Slime | SlimeLog",
    description:
      "SlimeLog's six-axis rating system explained. Texture, Sound, Aesthetic, Creativity, Quality, and Overall.",
    images: ["/guide/textures/butter-cats-craft.webp"],
    type: "article",
  },
};

export default function HowToRatePage() {
  return (
    <PageWrapper dots glow="cyan" orbs>
      <PageHeader />

      <main
        className="pb-24"
        style={{
          // Matches /guide: bumped from 6 to 24 so the header clears
          // the hero eyebrow with visible breathing room.
          paddingTop: 24,
        }}
      >
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="px-4 pt-4 pb-3">
          <div
            className="text-[11px] font-bold uppercase mb-3"
            style={{
              color: "#00F0FF",
              letterSpacing: "0.18em",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            How to Rate
          </div>
          <h1
            className="text-white m-0"
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 900,
              fontSize: 44,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
            }}
          >
            How to Rate
            <br />
            <span
              style={{
                background:
                  "linear-gradient(120deg, #39FF14 0%, #00F0FF 55%, #FF00E5 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              a Slime
            </span>
          </h1>
          <p
            className="mt-3 max-w-md"
            style={{
              color: "rgba(245,245,245,0.72)",
              fontSize: 14,
              lineHeight: 1.55,
            }}
          >
            Six axes, one honest score. Here is what each one means and how
            to score it.
          </p>
          <Link
            href="/guide#part-12"
            className="inline-block mt-3 text-[13.5px] font-semibold"
            style={{ color: "#FF7BEB" }}
          >
            Read the full SlimeLog Guide →
          </Link>
        </section>

        {/* ── Sticky pill nav (fixed-pinning pattern, matches /guide) ── */}
        <HowToRateNav parts={PARTS} />

        {/* ── Six axis sections ────────────────────────────────────── */}
        {RATING_AXES.map((axis) => (
          <AxisSection key={axis.slug} axis={axis} />
        ))}

        {/* ── The Scale ────────────────────────────────────────────── */}
        <ScaleSection bands={SCALE_BANDS} />

        {/* ── Footer CTA ───────────────────────────────────────────── */}
        <section className="px-4 mt-10">
          <p
            className="text-center"
            style={{
              color: "rgba(245,245,245,0.68)",
              fontSize: 14,
              margin: "0 0 14px",
            }}
          >
            Ready to put it into practice?
          </p>
          <Link
            href="/log"
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-[15px] font-bold"
            style={{
              background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              color: "#0A0A0A",
              fontFamily: "Montserrat, sans-serif",
              textDecoration: "none",
              boxShadow:
                "0 0 26px rgba(57,255,20,0.5), 0 8px 24px rgba(0,240,255,0.25), 0 0 6px rgba(57,255,20,0.45)",
            }}
          >
            Log a slime and rate it
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
        </section>
      </main>
    </PageWrapper>
  );
}

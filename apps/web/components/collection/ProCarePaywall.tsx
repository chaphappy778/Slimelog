// apps/web/components/collection/ProCarePaywall.tsx
//
// Rendered on /collection/care when the viewer is NOT a Pro
// subscriber. Sells the care-package feature + deep-links to
// /settings/subscription for upgrade.
//
// Design will polish this (T188 Part 4). Placeholder is functional.

import Link from "next/link";

export default function ProCarePaywall() {
  return (
    <div className="px-4">
      <div className="px-4 mb-8">
        <p
          className="section-label mb-2"
          style={{ color: "rgba(0,240,255,0.85)" }}
        >
          Care packages
        </p>
        <h1
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: 32,
            color: "#FFFFFF",
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
          }}
        >
          Build a care plan for every slime on your shelf.
        </h1>
      </div>

      <div
        className="rounded-3xl p-6 mb-6"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,210,74,0.10), rgba(255,0,229,0.08))",
          border: "1px solid rgba(255,210,74,0.55)",
          boxShadow: "0 0 32px rgba(255,210,74,0.15)",
        }}
      >
        <p
          className="text-[11px] font-black tracking-widest uppercase mb-3"
          style={{ color: "#FFD24A" }}
        >
          Pro Feature
        </p>
        <h2
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: 22,
            color: "#FFFFFF",
            lineHeight: 1.2,
            marginBottom: 12,
          }}
        >
          Your shelf isn&apos;t generic. Neither is its care.
        </h2>
        <p
          className="text-sm leading-relaxed mb-5"
          style={{ color: "rgba(245,245,245,0.85)" }}
        >
          Free reminders keep every slime on the same default cadence.
          Pro care packages let you set custom check-in intervals,
          jot per-slime care notes (activator ratios, storage quirks,
          "always kneads better after a 3-day rest"), and see your
          care history at a glance.
        </p>

        <ul
          className="space-y-2.5 mb-5"
          style={{ color: "rgba(245,245,245,0.9)" }}
        >
          <PaywallBullet>
            Custom check-in cadence per slime
          </PaywallBullet>
          <PaywallBullet>
            Care notes for handling instructions + brand-specific
            quirks
          </PaywallBullet>
          <PaywallBullet>
            Care history per slime, every activator + additive
            logged
          </PaywallBullet>
          <PaywallBullet>
            Care analytics (top product, actions this month, slimes
            cared for)
          </PaywallBullet>
          <PaywallBullet>
            <span style={{ color: "rgba(255,210,74,0.85)" }}>
              Coming soon:
            </span>{" "}
            auto-refill subscriptions for your most-used products
            when the SlimeLog shop launches
          </PaywallBullet>
        </ul>

        <Link
          href="/settings/subscription"
          className="inline-block rounded-full transition-all"
          style={{
            padding: "12px 24px",
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: 14,
            color: "#0A0A0A",
            background: "linear-gradient(135deg, #FFD24A, #FFAE3B)",
            boxShadow: "0 0 20px rgba(255,210,74,0.35)",
          }}
        >
          Go Pro: $2.99/mo for 6 months
        </Link>
        <p
          className="mt-3 text-[11px]"
          style={{ color: "rgba(245,245,245,0.5)" }}
        >
          Cancel anytime. Renews at $4.99/mo after 6 months.
        </p>
      </div>

      <p
        className="text-center text-xs"
        style={{ color: "rgba(245,245,245,0.55)" }}
      >
        Already Pro?{" "}
        <Link
          href="/settings"
          style={{ color: "#00F0FF", textDecoration: "underline" }}
        >
          Check your subscription status
        </Link>
        .
      </p>
    </div>
  );
}

function PaywallBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm leading-relaxed">
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: 3,
          background: "#39FF14",
          boxShadow: "0 0 6px rgba(57,255,20,0.65)",
          marginTop: 8,
          flexShrink: 0,
        }}
      />
      <span>{children}</span>
    </li>
  );
}

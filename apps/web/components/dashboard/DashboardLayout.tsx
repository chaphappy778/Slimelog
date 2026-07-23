// apps/web/components/dashboard/DashboardLayout.tsx
"use client";

import Link from "next/link";

interface DashboardLayoutProps {
  brand: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    verification_tier: string;
  };
  active: "overview" | "slimes" | "drops" | "analytics" | "settings";
  // Brand Pro subscription state. Optional so the other dashboard pages keep
  // compiling until their own redesign batches wire it through; undefined reads
  // as "not pro" and shows the muted Upgrade affordance.
  isPro?: boolean;
  children: React.ReactNode;
}

// Nav icons kept 1:1 with the previous layout (they read fine) but drawn at a
// caller-supplied size: 20px on the mobile tab bar, 18px in the desktop rail.
const navItems = [
  {
    key: "overview",
    label: "Overview",
    href: (slug: string) => `/brand-dashboard/${slug}`,
    icon: (n: number) => (
      <svg width={n} height={n} viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    key: "slimes",
    label: "Slimes",
    href: (slug: string) => `/brand-dashboard/${slug}/slimes`,
    icon: (n: number) => (
      <svg width={n} height={n} viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M5 8c0-1.657 1.343-3 3-3s3 1.343 3 3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    key: "drops",
    label: "Drops",
    href: (slug: string) => `/brand-dashboard/${slug}/drops`,
    icon: (n: number) => (
      <svg width={n} height={n} viewBox="0 0 16 16" fill="none">
        <path
          d="M8 2L10.5 7H13.5L11 10L12 14L8 11.5L4 14L5 10L2.5 7H5.5L8 2Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: "analytics",
    label: "Analytics",
    href: (slug: string) => `/brand-dashboard/${slug}/analytics`,
    isPro: true,
    icon: (n: number) => (
      <svg width={n} height={n} viewBox="0 0 16 16" fill="none">
        <path
          d="M2 12L5.5 7.5L8.5 10L12 5L14 7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M2 14H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "settings",
    label: "Settings",
    href: (slug: string) => `/brand-dashboard/${slug}/settings`,
    icon: (n: number) => (
      <svg width={n} height={n} viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.414 1.414M11.536 11.536l1.414 1.414M3.05 12.95l1.414-1.414M11.536 4.464l1.414-1.414"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

// verification_tier -> pill treatment. Green for verified/partner, cyan for a
// claimed-but-unverified brand, muted for the community default.
function tierPill(tier: string | null | undefined) {
  const t = (tier ?? "community").toLowerCase();
  if (t === "verified" || t === "partner") {
    return {
      label: t.toUpperCase(),
      color: "#34e89e",
      border: "rgba(52,232,158,0.5)",
      bg: "rgba(52,232,158,0.1)",
    };
  }
  if (t === "claimed") {
    return {
      label: "CLAIMED",
      color: "#22d3ee",
      border: "rgba(34,211,238,0.5)",
      bg: "rgba(34,211,238,0.1)",
    };
  }
  return {
    label: t.toUpperCase(),
    color: "#8f83b0",
    border: "rgba(143,131,176,0.4)",
    bg: "rgba(143,131,176,0.1)",
  };
}

function BrandMark({
  brand,
  size,
}: {
  brand: DashboardLayoutProps["brand"];
  size: number;
}) {
  if (brand.logo_url) {
    return (
      <img
        src={brand.logo_url}
        alt={brand.name}
        className="rounded-xl object-cover flex-none"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-xl flex items-center justify-center flex-none font-black"
      style={{
        width: size,
        height: size,
        border: "2px solid rgba(255,255,255,0.9)",
        background: "#100a1c",
        color: "#c9a6ff",
        fontFamily: "Montserrat, sans-serif",
        fontSize: size * 0.42,
      }}
    >
      {brand.name.slice(0, 1).toUpperCase()}
    </div>
  );
}

const MAGENTA = "#ff2bd6";
const INACTIVE = "#8f83b0";

export default function DashboardLayout({
  brand,
  active,
  isPro = false,
  children,
}: DashboardLayoutProps) {
  const pill = tierPill(brand.verification_tier);

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse 120% 55% at 60% 0%, #1c0b33 0%, #0a0513 55%, #06040c 100%)",
      }}
    >
      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden lg:flex flex-col fixed left-0 top-0 h-full z-40"
        style={{
          width: 280,
          background: "rgba(20,10,40,0.6)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRight: "1px solid rgba(150,110,240,0.18)",
        }}
      >
        {/* Brand identity */}
        <div className="px-5 pt-7 pb-5 flex items-center gap-3">
          <BrandMark brand={brand} size={48} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p
                className="text-[15px] font-black text-white truncate leading-tight"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                {brand.name}
              </p>
              {isPro && (
                <span
                  className="flex-none text-[9px] font-black tracking-wider text-white px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "linear-gradient(135deg,#ff2bd6,#a855f7)",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  PRO
                </span>
              )}
            </div>
            <span
              className="inline-block mt-1.5 text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full uppercase"
              style={{
                color: pill.color,
                background: pill.bg,
                border: `1px solid ${pill.border}`,
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              {pill.label}
            </span>
          </div>
        </div>

        <div
          className="mx-5 mb-3"
          style={{ height: 1, background: "rgba(150,110,240,0.18)" }}
        />

        {/* Nav rail */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.key === active;
            const showProBadge = item.isPro && !isPro;
            return (
              <Link
                key={item.key}
                href={item.href(brand.slug)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-150"
                style={{
                  color: isActive ? MAGENTA : "rgba(245,245,245,0.55)",
                  background: isActive ? "rgba(255,43,214,0.08)" : "transparent",
                  borderLeft: isActive
                    ? `3px solid ${MAGENTA}`
                    : "3px solid transparent",
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                <span
                  style={{
                    color: isActive ? MAGENTA : INACTIVE,
                    filter: isActive
                      ? "drop-shadow(0 0 6px rgba(255,43,214,0.5))"
                      : "none",
                  }}
                >
                  {item.icon(18)}
                </span>
                <span className="flex-1">{item.label}</span>
                {showProBadge && (
                  <span
                    className="text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full uppercase"
                    style={{
                      color: "#a78bfa",
                      background: "rgba(167,139,250,0.14)",
                    }}
                  >
                    Pro
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: view public page + Brand Pro card */}
        <div className="px-3 pb-5 pt-2">
          {/* [T137 Fix Batch A] Free-tier Upgrade card reads as an aspirational
              CTA, not a disabled item. Hover intensifies the magenta tint. */}
          <style>{`
            .upgrade-cta:hover {
              background: linear-gradient(135deg, rgba(255,43,214,0.18), rgba(168,85,247,0.10)) !important;
              border-color: rgba(255,43,214,0.55) !important;
              box-shadow: 0 0 26px rgba(255,43,214,0.20) !important;
            }
          `}</style>
          <Link
            href={`/brands/${brand.slug}`}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-colors"
            style={{ color: INACTIVE, fontFamily: "Inter, system-ui, sans-serif" }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 3L5 8L10 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            View Brand Page
          </Link>

          {isPro ? (
            <div
              className="mt-3 mx-1 p-4 rounded-2xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,43,214,0.14), rgba(168,85,247,0.08))",
                border: "1px solid rgba(255,43,214,0.28)",
              }}
            >
              <p
                className="text-[13px] font-black mb-1"
                style={{ color: "#ff86e6", fontFamily: "Montserrat, sans-serif" }}
              >
                Brand Pro active
              </p>
              <p
                className="text-[11px] font-semibold leading-snug"
                style={{ color: "#b3a7d0" }}
              >
                Featured chips, priority drops, richer analytics.
              </p>
            </div>
          ) : (
            <Link
              href={`/brand-dashboard/${brand.slug}/subscription`}
              className="upgrade-cta mt-3 mx-1 p-4 rounded-2xl block transition-all"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,43,214,0.10), rgba(168,85,247,0.05))",
                border: "1px solid rgba(255,43,214,0.35)",
                boxShadow: "0 0 20px rgba(255,43,214,0.12)",
              }}
            >
              <p
                className="text-[13px] font-black mb-1 text-white"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                Upgrade to Brand Pro →
              </p>
              <p
                className="text-[11px] font-semibold leading-snug"
                style={{ color: "rgba(245,245,245,0.85)" }}
              >
                Featured chips, priority drops, richer analytics.
              </p>
            </Link>
          )}
        </div>
      </aside>

      {/* ── Mobile + main column ── */}
      <div className="lg:ml-[280px] min-h-screen flex flex-col">
        {/* Mobile app bar */}
        <header
          className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4"
          style={{
            height: 56,
            background: "rgba(20,10,40,0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(150,110,240,0.18)",
          }}
        >
          <BrandMark brand={brand} size={34} />
          <div className="min-w-0 flex-1">
            <p
              className="text-[15px] font-black text-white truncate leading-tight"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              {brand.name}
            </p>
            <span
              className="inline-block mt-0.5 text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full uppercase"
              style={{
                color: pill.color,
                background: pill.bg,
                border: `1px solid ${pill.border}`,
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              {pill.label}
            </span>
          </div>
          {isPro ? (
            <span
              className="flex-none text-[10px] font-black tracking-wider text-white px-2.5 py-1 rounded-full"
              style={{
                background: "linear-gradient(135deg,#ff2bd6,#a855f7)",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              PRO
            </span>
          ) : (
            <Link
              href={`/brand-dashboard/${brand.slug}/subscription`}
              className="flex-none text-[10px] font-black tracking-wider px-2.5 py-1 rounded-full whitespace-nowrap"
              style={{
                color: "#fff",
                background: "linear-gradient(135deg, #ff2bd6, #a855f7)",
                border: "1px solid rgba(255,255,255,0.15)",
                boxShadow: "0 0 12px rgba(255,43,214,0.4)",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              Get Pro →
            </Link>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 w-full p-4 lg:p-8 pb-24 lg:pb-8 overflow-x-hidden">
          {children}
        </main>

        {/* Mobile bottom tab nav */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
          style={{
            background: "rgba(20,10,40,0.92)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderTop: "1px solid rgba(150,110,240,0.18)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {navItems.map((item) => {
            const isActive = item.key === active;
            return (
              <Link
                key={item.key}
                href={item.href(brand.slug)}
                className="flex-1 flex flex-col items-center justify-center gap-1 relative"
                style={{
                  height: 64,
                  color: isActive ? MAGENTA : INACTIVE,
                }}
              >
                {isActive && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                    style={{ width: 22, height: 3, background: MAGENTA }}
                  />
                )}
                {item.icon(20)}
                <span
                  className="text-[10px] font-bold"
                  style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

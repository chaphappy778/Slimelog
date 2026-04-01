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
  children: React.ReactNode;
}

const navItems = [
  {
    key: "overview",
    label: "Overview",
    href: (slug: string) => `/brand-dashboard/${slug}`,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect
          x="1"
          y="1"
          width="6"
          height="6"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="9"
          y="1"
          width="6"
          height="6"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="1"
          y="9"
          width="6"
          height="6"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="9"
          y="9"
          width="6"
          height="6"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
  {
    key: "slimes",
    label: "Slimes",
    href: (slug: string) => `/brand-dashboard/${slug}/slimes`,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M2 12L5.5 7.5L8.5 10L12 5L14 7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 14H14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    key: "settings",
    label: "Settings",
    href: (slug: string) => `/brand-dashboard/${slug}/settings`,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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

function BrandInitials({ name }: { name: string }) {
  return (
    <div
      className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold tracking-wide flex-shrink-0"
      style={{
        background:
          "linear-gradient(135deg, rgba(45,10,78,0.9), rgba(20,4,40,0.9))",
        border: "1px solid rgba(57,255,20,0.25)",
        color: "#39FF14",
        fontFamily: "Montserrat, sans-serif",
      }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function DashboardLayout({
  brand,
  active,
  children,
}: DashboardLayoutProps) {
  const isPro =
    brand.verification_tier === "verified" ||
    brand.verification_tier === "partner";

  return (
    <div
      className="min-h-screen flex"
      style={{
        background:
          "radial-gradient(ellipse 100% 60% at 50% 0%, #2D0A4E 0%, #100020 35%, #0A0A0A 65%)",
      }}
    >
      {/* ── Sidebar (desktop) ── */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 h-full w-60 z-40"
        style={{
          background: "rgba(10,10,10,0.97)",
          borderRight: "1px solid rgba(45,10,78,0.6)",
        }}
      >
        {/* Brand identity */}
        <div className="px-5 pt-7 pb-6">
          <div className="flex items-center gap-3">
            {brand.logo_url ? (
              <img
                src={brand.logo_url}
                alt={brand.name}
                className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
              />
            ) : (
              <BrandInitials name={brand.name} />
            )}
            <div className="min-w-0">
              <p
                className="text-sm font-bold text-white truncate leading-tight"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                {brand.name}
              </p>
              <span
                className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-widest"
                style={{
                  color: isPro ? "#39FF14" : "rgba(245,245,245,0.35)",
                  background: isPro
                    ? "rgba(57,255,20,0.1)"
                    : "rgba(45,10,78,0.4)",
                  border: isPro
                    ? "1px solid rgba(57,255,20,0.2)"
                    : "1px solid rgba(45,10,78,0.6)",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {isPro
                  ? "★ VERIFIED"
                  : (brand.verification_tier?.toUpperCase() ?? "COMMUNITY")}
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          className="mx-5 mb-2"
          style={{ height: "1px", background: "rgba(45,10,78,0.5)" }}
        />

        {/* Nav items */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.key === active;
            const showProBadge = item.isPro && !isPro;
            return (
              <Link
                key={item.key}
                href={item.href(brand.slug)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative"
                style={{
                  color: isActive ? "#fff" : "rgba(245,245,245,0.45)",
                  background: isActive ? "rgba(57,255,20,0.06)" : "transparent",
                  borderLeft: isActive
                    ? "3px solid #39FF14"
                    : "3px solid transparent",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                <span
                  className="transition-colors"
                  style={{ color: isActive ? "#39FF14" : "currentColor" }}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {showProBadge && (
                  <span
                    className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded tracking-widest"
                    style={{
                      color: "#00F0FF",
                      background: "rgba(0,240,255,0.1)",
                      border: "1px solid rgba(0,240,255,0.2)",
                    }}
                  >
                    PRO
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: back to app */}
        <div className="px-3 pb-6">
          <div
            className="mx-2 mb-3"
            style={{ height: "1px", background: "rgba(45,10,78,0.5)" }}
          />
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all"
            style={{
              color: "rgba(245,245,245,0.35)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 3L5 8L10 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back to App
          </Link>
        </div>
      </aside>

      {/* ── Mobile tab bar ── */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex overflow-x-auto"
        style={{
          background: "rgba(10,10,10,0.97)",
          borderBottom: "1px solid rgba(45,10,78,0.6)",
        }}
      >
        {navItems.map((item) => {
          const isActive = item.key === active;
          return (
            <Link
              key={item.key}
              href={item.href(brand.slug)}
              className="flex-shrink-0 relative px-4 py-3.5 text-xs font-semibold whitespace-nowrap transition-colors"
              style={{
                color: isActive ? "#fff" : "rgba(245,245,245,0.4)",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {item.label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                  style={{ background: "#39FF14" }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* ── Main content ── */}
      <main
        className="flex-1 md:ml-60 min-h-screen"
        style={{ background: "transparent" }}
      >
        <div className="pt-12 md:pt-0 p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}

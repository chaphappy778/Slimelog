"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ─── Nav item definitions ─────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    label: "Feed",
    href: "/",
    icon: (active: boolean) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={20}
        height={20}
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {active ? (
          <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-1.32-1.323V18a3 3 0 01-3 3H5a3 3 0 01-3-3v-7.853L.72 11.47a.75.75 0 001.06 1.06l9.69-9.69zM9 21h6v-6a.75.75 0 00-.75-.75h-4.5A.75.75 0 009 15v6z" />
        ) : (
          <>
            <path d="M3 9.75L12 3l9 6.75V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.75z" />
            <path d="M9 21V12h6v9" />
          </>
        )}
      </svg>
    ),
  },
  {
    label: "Collection",
    href: "/collection",
    icon: (active: boolean) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={20}
        height={20}
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {active ? (
          <path
            fillRule="evenodd"
            d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z"
            clipRule="evenodd"
          />
        ) : (
          <>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </>
        )}
      </svg>
    ),
  },
  {
    label: "Discover",
    href: "/discover",
    icon: (active: boolean) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={20}
        height={20}
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {active ? (
          <path
            fillRule="evenodd"
            d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z"
            clipRule="evenodd"
          />
        ) : (
          <>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </>
        )}
      </svg>
    ),
  },
  {
    label: "Brands",
    href: "/brands",
    icon: (active: boolean) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={20}
        height={20}
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {active ? (
          <path
            fillRule="evenodd"
            d="M5.25 2.25a3 3 0 00-3 3v4.318a3 3 0 00.879 2.121l9.58 9.581c.92.92 2.39 1.013 3.408.227a18.884 18.884 0 005.83-5.83c.787-1.017.694-2.487-.226-3.407l-9.581-9.581a3 3 0 00-2.12-.879H5.25zM6.375 7.5a1.125 1.125 0 100-2.25 1.125 1.125 0 000 2.25z"
            clipRule="evenodd"
          />
        ) : (
          <>
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </>
        )}
      </svg>
    ),
  },
  {
    label: "Profile",
    href: "/profile",
    icon: (active: boolean) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={20}
        height={20}
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {active ? (
          <path
            fillRule="evenodd"
            d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
            clipRule="evenodd"
          />
        ) : (
          <>
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </>
        )}
      </svg>
    ),
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Spacer so page content isn't hidden behind the fixed bar */}
      <div className="h-16 shrink-0" aria-hidden="true" />

      <nav
        className="fixed bottom-0 inset-x-0 z-20"
        style={{
          background: "rgba(10, 10, 10, 0.96)",
          borderTop: "1px solid rgba(57, 255, 20, 0.12)",
          boxShadow: "0 -4px 24px 0 rgba(57, 255, 20, 0.06)",
        }}
      >
        <div className="max-w-[390px] mx-auto flex items-center justify-around px-2 h-16">
          {/* ── Feed (left of center) ── */}
          <NavItem item={NAV_ITEMS[0]} pathname={pathname} />
          <NavItem item={NAV_ITEMS[1]} pathname={pathname} />

          {/* ── Center Log button ── */}
          <Link
            href="/log"
            className="flex flex-col items-center -mt-5"
            aria-label="Log a slime"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-glow-green active:scale-90 transition-transform"
              style={{
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              }}
            >
              <svg
                width={28}
                height={28}
                viewBox="0 0 24 24"
                fill="#0a0a0a"
                aria-hidden="true"
              >
                <path d="M12 4a1 1 0 0 1 1 1v6h6a1 1 0 0 1 0 2h-6v6a1 1 0 0 1-2 0v-6H5a1 1 0 0 1 0-2h6V5a1 1 0 0 1 1-1z" />
              </svg>
            </div>
            <span className="text-[10px] font-bold text-slime-accent mt-1">
              Log
            </span>
          </Link>

          {/* ── Right of center ── */}
          <NavItem item={NAV_ITEMS[2]} pathname={pathname} />
          <NavItem item={NAV_ITEMS[3]} pathname={pathname} />
        </div>
      </nav>
    </>
  );
}

// ─── NavItem helper ───────────────────────────────────────────────────────────

function NavItem({
  item,
  pathname,
}: {
  item: (typeof NAV_ITEMS)[number];
  pathname: string;
}) {
  const active =
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      className="flex flex-col items-center gap-0.5 flex-1 py-1 active:scale-95 transition-transform"
      aria-current={active ? "page" : undefined}
    >
      <span className={active ? "text-slime-accent" : "text-slime-muted"}>
        {item.icon(active)}
      </span>
      <span
        className={`text-[10px] font-semibold ${
          active ? "text-slime-accent" : "text-slime-muted"
        }`}
      >
        {item.label}
      </span>
    </Link>
  );
}

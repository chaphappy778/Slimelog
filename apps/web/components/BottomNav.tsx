"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Feed",
    icon: (active: boolean) => (
      <svg
        width={24}
        height={24}
        className="w-6 h-6 shrink-0"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={active ? 0 : 1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
        />
      </svg>
    ),
  },
  {
    href: "/discover",
    label: "Discover",
    icon: (active: boolean) => (
      <svg
        width={24}
        height={24}
        className="w-6 h-6 shrink-0"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={active ? 0 : 1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
    ),
  },
  null,
  {
    href: "/collection",
    label: "Collection",
    icon: (active: boolean) => (
      <svg
        width={24}
        height={24}
        className="w-6 h-6 shrink-0"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={active ? 0 : 1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
        />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (active: boolean) => (
      <svg
        width={24}
        height={24}
        className="w-6 h-6 shrink-0"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={active ? 0 : 1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <div className="h-20" aria-hidden />

      <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-white/95 backdrop-blur-md border-t border-pink-100 safe-area-pb">
        <div className="flex items-end justify-around max-w-[390px] mx-auto px-2 pt-2 pb-3 h-full">
          <NavTab href="/" label="Feed" active={pathname === "/"}>
            {NAV_ITEMS[0]!.icon(pathname === "/")}
          </NavTab>

          <NavTab
            href="/discover"
            label="Discover"
            active={pathname === "/discover"}
          >
            {NAV_ITEMS[1]!.icon(pathname === "/discover")}
          </NavTab>

          {/* ─── Center Log Button ─── */}
          <Link
            href="/log"
            className="relative -mt-5 flex flex-col items-center group"
            aria-label="Log a slime"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-lg shadow-pink-200 group-active:scale-95 transition-transform">
              <svg
                width={28}
                height={28}
                className="w-7 h-7 shrink-0 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            </div>
            <span className="text-[10px] font-bold mt-1 text-pink-500">
              Log
            </span>
          </Link>

          <NavTab
            href="/collection"
            label="Collection"
            active={pathname === "/collection"}
          >
            {NAV_ITEMS[3]!.icon(pathname === "/collection")}
          </NavTab>

          <NavTab
            href="/profile"
            label="Profile"
            active={pathname === "/profile"}
          >
            {NAV_ITEMS[4]!.icon(pathname === "/profile")}
          </NavTab>
        </div>
      </nav>
    </>
  );
}

function NavTab({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 px-3 py-1 min-w-[44px] min-h-[44px] justify-center rounded-xl transition-colors active:scale-95 ${
        active ? "text-pink-500" : "text-gray-400"
      }`}
    >
      {children}
      <span
        className={`text-[10px] font-semibold ${active ? "text-pink-500" : "text-gray-400"}`}
      >
        {label}
      </span>
    </Link>
  );
}

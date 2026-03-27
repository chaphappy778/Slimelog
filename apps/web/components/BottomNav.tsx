"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Feed", href: "/" },
  { label: "Collection", href: "/collection" },
  { label: "Log", href: "/log", isCenter: true },
  { label: "Discover", href: "/discover" },
  { label: "Brands", href: "/brands" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <>
      <div className="h-16 shrink-0" aria-hidden="true" />
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-pink-100">
        <div className="max-w-[390px] mx-auto flex items-center justify-around px-2 h-16">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            if ("isCenter" in item) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center -mt-5"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                    <svg
                      width={28}
                      height={28}
                      viewBox="0 0 24 24"
                      fill="white"
                    >
                      <path d="M12 4a1 1 0 0 1 1 1v6h6a1 1 0 0 1 0 2h-6v6a1 1 0 0 1-2 0v-6H5a1 1 0 0 1 0-2h6V5a1 1 0 0 1 1-1z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-fuchsia-500 mt-1">
                    Log
                  </span>
                </Link>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 flex-1 py-1 active:scale-95 transition-transform"
              >
                <span
                  className={`text-[10px] font-semibold ${active ? "text-fuchsia-600" : "text-gray-400"}`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

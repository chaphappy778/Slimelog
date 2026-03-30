// apps/web/components/PageHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SlimeMenu from "@/components/SlimeMenu";

export default function PageHeader() {
  const pathname = usePathname();
  const profileActive = pathname === "/profile";

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 h-14 flex items-center justify-between px-4"
      style={{
        background: "rgba(10, 10, 10, 0.92)",
        borderBottom: "1px solid rgba(57, 255, 20, 0.12)",
        boxShadow: "0 1px 12px 0 rgba(57, 255, 20, 0.06)",
      }}
    >
      {/* Wordmark */}
      <Link href="/" className="flex items-center gap-2 group">
        <img
          src="/logo.svg"
          alt="SlimeLog"
          width={32}
          height={32}
          className="rounded-lg"
        />
        <span className="text-lg font-black tracking-tight text-holo">
          SlimeLog
        </span>
      </Link>

      {/* Right side — profile icon + hamburger */}
      <div className="flex items-center gap-2">
        <Link
          href="/profile"
          aria-label="Profile"
          className={`rounded-full border p-2 transition-colors ${
            profileActive
              ? "text-slime-accent border-slime-accent"
              : "text-slime-muted border-slime-border hover:text-slime-accent hover:border-slime-accent"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-5 h-5"
          >
            <circle cx="12" cy="7" r="4" />
            <path d="M4 21v-1a8 8 0 0116 0v1" />
          </svg>
        </Link>
        <SlimeMenu />
      </div>
    </header>
  );
}

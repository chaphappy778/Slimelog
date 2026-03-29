// apps/web/components/PageHeader.tsx
import Link from "next/link";
import SlimeMenu from "@/components/SlimeMenu";

export default function PageHeader() {
  return (
    <>
      {/* Header — intentionally no backdrop-filter to avoid stacking context */}
      <header
        className="fixed top-0 left-0 right-0 z-30 h-14 flex items-center justify-between px-4"
        style={{
          background: "rgba(255, 255, 255, 0.92)",
          borderBottom: "1px solid rgba(249, 168, 212, 0.25)",
          boxShadow: "0 1px 12px 0 rgba(236, 72, 153, 0.06)",
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
          <span
            className="text-lg font-black tracking-tight"
            style={{
              background: "linear-gradient(90deg, #ec4899, #a855f7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            SlimeLog
          </span>
        </Link>

        {/* Right side — profile icon only (no SlimeMenu here) */}
        <div className="flex items-center gap-2">
          <Link
            href="/profile"
            aria-label="Profile"
            className="rounded-full border-2 border-pink-200 p-2 text-pink-400 hover:text-pink-600 transition-colors"
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
          {/* Blob hamburger trigger — rendered here but SlimeMenu portal escapes stacking context */}
          <SlimeMenu />
        </div>
      </header>
    </>
  );
}

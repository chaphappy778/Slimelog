// apps/web/components/SlimeMenu.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserProfile = {
  username: string | null;
  avatar_url: string | null;
  display_name: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(username: string | null): string {
  if (!username) return "?";
  if (username.startsWith("user_")) return "S";
  return username.charAt(0).toUpperCase();
}

function getDisplayName(username: string | null): string {
  if (!username) return "Slimer";
  if (username.startsWith("user_")) return "Slimer";
  return username;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  profile,
  size = "md",
}: {
  profile: UserProfile | null;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";

  if (profile?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt="Profile photo"
        className={`${dim} rounded-full object-cover ring-2 ring-pink-200`}
      />
    );
  }

  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center text-white font-black shrink-0`}
      style={{ background: "linear-gradient(135deg, #f472b6, #a855f7)" }}
      aria-hidden="true"
    >
      {getInitials(profile?.username ?? null)}
    </div>
  );
}

// ─── Nav section ─────────────────────────────────────────────────────────────

function NavSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 px-2">
        {title}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  onClose,
  danger,
}: {
  href?: string;
  icon: string;
  label: string;
  onClose: () => void;
  danger?: boolean;
}) {
  const cls = `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-100 active:scale-[0.97] ${
    danger
      ? "text-red-500 hover:bg-red-50"
      : "text-gray-700 hover:bg-pink-50 hover:text-pink-600"
  }`;

  if (!href) return null;

  return (
    <Link href={href} className={cls} onClick={onClose}>
      <span className="text-base w-5 text-center">{icon}</span>
      {label}
    </Link>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────

function Divider() {
  return <div className="mx-4 border-t border-pink-50" />;
}

// ─── Wavy top edge SVG ───────────────────────────────────────────────────────

function WavyTop() {
  return (
    <svg
      viewBox="0 0 320 24"
      className="w-full absolute -top-[23px] left-0 pointer-events-none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0,24 C30,8 60,18 100,12 C140,6 160,20 200,14 C240,8 270,18 320,10 L320,24 Z"
        fill="white"
      />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SlimeMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on route change
  useEffect(() => {
    if (isOpen) handleClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Load user session
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      setProfile({
        username: data?.username ?? null,
        avatar_url: data?.avatar_url ?? null,
        display_name: null,
      });
      setLoading(false);
    });
  }, []);

  function handleOpen() {
    setIsAnimatingOut(false);
    setIsOpen(true);
  }

  function handleClose() {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsAnimatingOut(false);
    }, 280);
  }

  async function handleSignOut() {
    handleClose();
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const displayName = getDisplayName(profile?.username ?? null);
  const handle = profile?.username ?? null;

  return (
    <>
      {/* ── Trigger pair ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Blob hamburger */}
        <button
          onClick={handleOpen}
          aria-label="Open navigation menu"
          aria-expanded={isOpen}
          className="relative w-9 h-9 flex flex-col items-center justify-center gap-1 transition-transform duration-150 active:scale-90"
          style={{
            background: "linear-gradient(135deg, #fce7f3, #f3e8ff)",
            borderRadius: "60% 40% 55% 45% / 45% 55% 40% 60%",
            border: "1.5px solid #f9a8d4",
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block bg-pink-500 rounded-full transition-all duration-200"
              style={{
                height: "2px",
                width: i === 1 ? "14px" : "18px",
                marginLeft: i === 1 ? "4px" : "0",
              }}
            />
          ))}
        </button>
      </div>

      {/* ── Overlay + Panel ─────────────────────────────────────────── */}
      {isOpen && (
        <>
          {/* Dark overlay */}
          <div
            ref={overlayRef}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            style={{
              animation: isAnimatingOut
                ? "fadeOut 280ms ease forwards"
                : "fadeIn 200ms ease forwards",
            }}
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Menu panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="fixed top-0 right-0 z-50 h-full w-[80vw] max-w-[320px] bg-white shadow-2xl flex flex-col overflow-y-auto"
            style={{
              animation: isAnimatingOut
                ? "slimeReabsorb 280ms cubic-bezier(0.4, 0, 1, 1) forwards"
                : "slimeDrip 380ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            }}
          >
            {/* Wavy top edge */}
            <div className="relative h-6 shrink-0 overflow-visible">
              <WavyTop />
            </div>

            {/* Profile header */}
            <Link
              href="/profile"
              onClick={handleClose}
              className="flex items-center gap-3 px-4 py-4 hover:bg-pink-50 transition-colors"
            >
              <Avatar profile={profile} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate leading-tight">
                  {loading ? (
                    <span className="inline-block w-24 h-4 bg-pink-100 rounded animate-pulse" />
                  ) : (
                    displayName
                  )}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {loading ? (
                    <span className="inline-block w-16 h-3 bg-pink-50 rounded animate-pulse mt-0.5" />
                  ) : handle ? (
                    `@${handle}`
                  ) : (
                    "Tap to set username"
                  )}
                </p>
              </div>
              <span className="text-gray-300 text-xs shrink-0" aria-hidden>
                ›
              </span>
            </Link>

            <Divider />

            {/* My Stuff */}
            <NavSection title="My Stuff">
              <NavItem
                href="/collection"
                icon="🫙"
                label="My Collection"
                onClose={handleClose}
              />
              <NavItem
                href="/collection?tab=wishlist"
                icon="⭐️"
                label="My Wishlist"
                onClose={handleClose}
              />
              <NavItem
                href="/settings/profile"
                icon="✏️"
                label="Edit Profile"
                onClose={handleClose}
              />
            </NavSection>

            <Divider />

            {/* Explore */}
            <NavSection title="Explore">
              <NavItem href="/" icon="🫧" label="Feed" onClose={handleClose} />
              <NavItem
                href="/discover"
                icon="🏆"
                label="Discover"
                onClose={handleClose}
              />
              <NavItem
                href="/brands"
                icon="🛍️"
                label="Brands"
                onClose={handleClose}
              />
            </NavSection>

            <Divider />

            {/* Learn */}
            <NavSection title="Learn">
              <NavItem
                href="/guide"
                icon="📖"
                label="Slime Type Guide"
                onClose={handleClose}
              />
              <NavItem
                href="/guide#rating"
                icon="⭐"
                label="How to Rate a Slime"
                onClose={handleClose}
              />
            </NavSection>

            <Divider />

            {/* Account */}
            <NavSection title="Account">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-all duration-100 active:scale-[0.97] w-full text-left"
              >
                <span className="text-base w-5 text-center">🚪</span>
                Sign Out
              </button>
            </NavSection>

            {/* Bottom safe area spacer */}
            <div className="flex-1" />
            <div className="pb-8 px-4">
              <p className="text-[10px] text-gray-300 text-center">
                SlimeLog · Rate it. Log it. Love it.
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Animation keyframes (injected via style tag) ─────────────── */}
      <style>{`
        @keyframes slimeDrip {
          0% {
            transform: translateY(-100%) scaleY(0.3);
            transform-origin: top right;
            opacity: 0;
          }
          60% {
            transform: translateY(4px) scaleY(1.02);
            opacity: 1;
          }
          80% {
            transform: translateY(-2px) scaleY(0.98);
          }
          100% {
            transform: translateY(0) scaleY(1);
            opacity: 1;
          }
        }

        @keyframes slimeReabsorb {
          0% { transform: translateY(0) scaleY(1); opacity: 1; }
          100% {
            transform: translateY(-100%) scaleY(0.3);
            transform-origin: top right;
            opacity: 0;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
    </>
  );
}

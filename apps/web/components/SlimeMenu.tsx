// apps/web/components/SlimeMenu.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
// T104 (2026-07-10): pull user + profile + admin role from the shared
// AuthProvider instead of firing our own auth.getUser + isAdminUser
// (which triggers another profile query). Also gives us email verified /
// role gating without a second round-trip.
import { useAuth } from "@/components/AuthProvider";
import {
  Layers,
  Heart,
  Settings,
  Home,
  Compass,
  Store,
  BookOpen,
  Star,
  Menu,
  ChevronRight,
  Shield,
  Share2,
} from "lucide-react";

type UserProfile = {
  username: string | null;
  avatar_url: string | null;
  display_name: string | null;
};

function getInitials(username: string | null): string {
  if (!username) return "?";
  if (username.startsWith("user_")) return "S";
  return username.charAt(0).toUpperCase();
}

function getDisplayName(username: string | null): string {
  if (!username || username.startsWith("user_")) return "Slimer";
  return username;
}

function Avatar({
  profile,
  size = "md",
}: {
  profile: UserProfile | null;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  if (profile?.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={profile.avatar_url}
        alt="Profile photo"
        className={`${dim} rounded-full object-cover ring-2 ring-slime-accent/30`}
      />
    );
  }
  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center font-black shrink-0 text-slime-bg`}
      style={{ background: "linear-gradient(135deg, #39FF14, #00F0FF)" }}
      aria-hidden="true"
    >
      {getInitials(profile?.username ?? null)}
    </div>
  );
}

function NavSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slime-magenta mb-1.5 px-2">
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
  icon: React.ReactNode;
  label: string;
  onClose: () => void;
  danger?: boolean;
}) {
  if (!href) return null;
  return (
    <Link
      href={href}
      onClick={onClose}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-100 active:scale-[0.97] ${
        danger
          ? "text-red-400 hover:bg-red-500/10"
          : "text-slime-text hover:bg-slime-surface hover:text-slime-accent"
      }`}
    >
      <span className="w-5 flex items-center justify-center shrink-0">
        {icon}
      </span>
      {label}
    </Link>
  );
}

function Divider() {
  return <div className="mx-4 border-t border-slime-border" />;
}

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
        fill="#1A0A2E"
      />
    </svg>
  );
}

export default function SlimeMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const pathname = usePathname();
  const overlayRef = useRef<HTMLDivElement>(null);

  // T104: shared auth state. Admin gate mirrors the server-side rule
  // (role === 'admin' + email_confirmed_at present); actual authorization
  // is still enforced server-side + via RLS.
  const { user, profile: authProfile, loading } = useAuth();
  const profile: UserProfile | null = authProfile
    ? {
        username: authProfile.username,
        avatar_url: authProfile.avatar_url,
        display_name: authProfile.display_name,
      }
    : null;
  const isAdmin =
    !!user?.email_confirmed_at && authProfile?.role === "admin";

  useEffect(() => {
    if (isOpen) handleClose();
  }, [pathname]); // eslint-disable-line

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

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        className="flex items-center justify-center p-2 text-slime-text hover:text-slime-accent transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      {isOpen && (
        <>
          <div
            ref={overlayRef}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
            style={{
              animation: isAnimatingOut
                ? "fadeOut 280ms ease forwards"
                : "fadeIn 200ms ease forwards",
            }}
            onClick={handleClose}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="fixed top-0 right-0 z-50 h-full w-[80vw] max-w-[320px] flex flex-col overflow-y-auto shadow-2xl"
            style={{
              background: "#1A0A2E",
              borderLeft: "1px solid rgba(57, 255, 20, 0.12)",
              animation: isAnimatingOut
                ? "slimeReabsorb 280ms cubic-bezier(0.4, 0, 1, 1) forwards"
                : "slimeDrip 380ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            }}
          >
            <div className="relative h-6 shrink-0 overflow-visible">
              <WavyTop />
            </div>

            <Link
              href="/profile"
              onClick={handleClose}
              className="flex items-center gap-3 px-4 py-4 hover:bg-slime-purple/40 transition-colors"
            >
              <Avatar profile={profile} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slime-text truncate leading-tight">
                  {loading ? (
                    <span className="inline-block w-24 h-4 bg-slime-surface rounded animate-pulse" />
                  ) : (
                    getDisplayName(profile?.username ?? null)
                  )}
                </p>
                <p className="text-xs text-slime-muted truncate mt-0.5">
                  {loading ? (
                    <span className="inline-block w-16 h-3 bg-slime-surface rounded animate-pulse" />
                  ) : profile?.username ? (
                    `@${profile.username}`
                  ) : (
                    "Tap to set username"
                  )}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slime-muted shrink-0" />
            </Link>

            <Divider />

            <NavSection title="My Stuff">
              <NavItem
                href="/collection"
                icon={<Layers className="w-5 h-5" />}
                label="My Shelf"
                onClose={handleClose}
              />
              <NavItem
                href="/collection?tab=wishlist"
                icon={<Heart className="w-5 h-5" />}
                label="My Wishlist"
                onClose={handleClose}
              />
              <NavItem
                href="/invite"
                icon={<Share2 className="w-5 h-5" />}
                label="Invite Friends"
                onClose={handleClose}
              />
              <NavItem
                href="/settings"
                icon={<Settings className="w-5 h-5" />}
                label="Settings"
                onClose={handleClose}
              />
            </NavSection>

            <Divider />

            <NavSection title="Explore">
              <NavItem
                href="/"
                icon={<Home className="w-5 h-5" />}
                label="Feed"
                onClose={handleClose}
              />
              <NavItem
                href="/discover"
                icon={<Compass className="w-5 h-5" />}
                label="Discover"
                onClose={handleClose}
              />
              <NavItem
                href="/brands"
                icon={<Store className="w-5 h-5" />}
                label="Brands"
                onClose={handleClose}
              />
            </NavSection>

            <Divider />

            <NavSection title="Learn">
              <NavItem
                href="/slime-types"
                icon={<BookOpen className="w-5 h-5" />}
                label="Slime Type Guide"
                onClose={handleClose}
              />
              {/* [Change 1 — T31] How to Rate a Slime now points at the
                  dedicated /how-to-rate guide instead of the /slime-types
                  placeholder. */}
              <NavItem
                href="/how-to-rate"
                icon={<Star className="w-5 h-5" />}
                label="How to Rate a Slime"
                onClose={handleClose}
              />
            </NavSection>

            {/* Admin section — only visible to admin account */}
            {isAdmin && (
              <>
                <Divider />
                <NavSection title="Admin">
                  <NavItem
                    href="/admin"
                    icon={<Shield className="w-5 h-5" />}
                    label="Control Panel"
                    onClose={handleClose}
                  />
                </NavSection>
              </>
            )}

            <div className="flex-1" />
            <div className="pb-8 px-4">
              <p className="text-[10px] text-slime-muted text-center">
                SlimeLog · Rate it. Log it. Love it.
              </p>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slimeDrip { 0% { transform: translateY(-100%) scaleY(0.3); transform-origin: top right; opacity: 0; } 60% { transform: translateY(4px) scaleY(1.02); opacity: 1; } 80% { transform: translateY(-2px) scaleY(0.98); } 100% { transform: translateY(0) scaleY(1); opacity: 1; } }
        @keyframes slimeReabsorb { 0% { transform: translateY(0) scaleY(1); opacity: 1; } 100% { transform: translateY(-100%) scaleY(0.3); transform-origin: top right; opacity: 0; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
      `}</style>
    </>
  );
}

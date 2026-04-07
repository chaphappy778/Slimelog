// apps/web/components/SlimeMenu.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import {
  Layers,
  Heart,
  UserPen,
  Home,
  Compass,
  Store,
  BookOpen,
  Star,
  LogOut,
  Menu,
  ChevronRight,
  Trash2,
  Shield,
  FileText,
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) handleClose();
  }, [pathname]); // eslint-disable-line

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
    setShowDeleteConfirm(false);
    setDeleteError(null);
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

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        setDeleteError(body.error ?? "Something went wrong. Please try again.");
        setDeleteLoading(false);
        return;
      }
      // Sign out client-side and redirect
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  }

  return (
    <>
      <button
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
                label="My Collection"
                onClose={handleClose}
              />
              <NavItem
                href="/collection?tab=wishlist"
                icon={<Heart className="w-5 h-5" />}
                label="My Wishlist"
                onClose={handleClose}
              />
              <NavItem
                href="/settings/profile"
                icon={<UserPen className="w-5 h-5" />}
                label="Edit Profile"
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
                href="/guide"
                icon={<BookOpen className="w-5 h-5" />}
                label="Slime Type Guide"
                onClose={handleClose}
              />
              <NavItem
                href="/guide#rating"
                icon={<Star className="w-5 h-5" />}
                label="How to Rate a Slime"
                onClose={handleClose}
              />
            </NavSection>

            <Divider />

            <NavSection title="Legal">
              <NavItem
                href="/privacy"
                icon={<Shield className="w-5 h-5" />}
                label="Privacy Policy"
                onClose={handleClose}
              />
              <NavItem
                href="/terms"
                icon={<FileText className="w-5 h-5" />}
                label="Terms of Service"
                onClose={handleClose}
              />
            </NavSection>

            <Divider />

            <NavSection title="Account">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-all duration-100 active:scale-[0.97] w-full text-left"
              >
                <span className="w-5 flex items-center justify-center shrink-0">
                  <LogOut className="w-5 h-5" />
                </span>
                Sign Out
              </button>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500/70 hover:bg-red-500/10 hover:text-red-400 transition-all duration-100 active:scale-[0.97] w-full text-left"
                >
                  <span className="w-5 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </span>
                  Delete Account
                </button>
              ) : (
                <div
                  className="mx-1 mt-1 rounded-xl p-3 flex flex-col gap-2"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.25)",
                  }}
                >
                  <p className="text-xs text-red-300 font-semibold leading-snug">
                    This will permanently delete your account. All of your slime
                    logs, photos, comments, and follows will be removed. This
                    cannot be undone.
                  </p>
                  {deleteError && (
                    <p className="text-xs text-red-400">{deleteError}</p>
                  )}
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteError(null);
                      }}
                      disabled={deleteLoading}
                      className="flex-1 py-2 rounded-lg text-xs font-bold text-slime-muted hover:text-slime-text transition-colors"
                      style={{ background: "rgba(45,10,78,0.5)" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading}
                      className="flex-1 py-2 rounded-lg text-xs font-bold text-white transition-colors disabled:opacity-50"
                      style={{ background: "rgba(239,68,68,0.7)" }}
                    >
                      {deleteLoading ? "Deleting..." : "Yes, Delete"}
                    </button>
                  </div>
                </div>
              )}
            </NavSection>

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

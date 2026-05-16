// apps/web/app/settings/profile/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { updateProfile, checkUsernameAvailable } from "@/lib/profile-actions";
import { ImageUpload } from "@/components/ImageUpload";
import PageWrapper from "@/components/PageWrapper";
import { useToast } from "@/components/Toast";
import UpgradeButton from "@/components/UpgradeButton";

// Module-level client — absolute rule
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type FormState = {
  username: string;
  bio: string;
  location: string;
  website_url: string;
  avatar_url: string | null;
  instagram_handle: string;
  tiktok_handle: string;
  shop_url: string;
};

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
function validateUsername(value: string): "invalid" | "valid" {
  return USERNAME_RE.test(value) ? "valid" : "invalid";
}

const INSTAGRAM_RE = /^[a-zA-Z0-9._]{1,30}$/;
const TIKTOK_RE = /^[a-zA-Z0-9._]{1,24}$/;
const SHOP_URL_RE = /^https?:\/\/.+/;

// [Fix C] Module-scoped formatter so it isn't recreated on every render of
// SubscriptionSection. Returns null for any bad / missing / unparseable input
// so the caller can skip rendering entirely.
function formatPeriodEnd(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch {
    return null;
  }
}

function UsernameStatusIcon({ status }: { status: UsernameStatus }) {
  if (status === "idle") return null;
  if (status === "checking") {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5">
        <svg
          className="animate-spin text-slime-muted"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          width={16}
          height={16}
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      </span>
    );
  }
  if (status === "available") {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slime-accent/20">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          width={12}
          height={12}
          className="text-slime-accent"
        >
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        width={12}
        height={12}
        className="text-red-400"
      >
        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
      </svg>
    </span>
  );
}

function UsernameHint({
  status,
  username,
}: {
  status: UsernameStatus;
  username: string;
}) {
  if (status === "idle")
    return (
      <p className="text-xs text-slime-muted mt-1.5">
        3–20 characters, letters, numbers, and underscores only.
      </p>
    );
  if (status === "invalid" && username.length > 0) {
    return (
      <p className="text-xs text-red-400 mt-1.5">
        {username.length < 3
          ? "Too short — at least 3 characters."
          : username.length > 20
            ? "Too long — max 20 characters."
            : "Only letters, numbers, and underscores allowed."}
      </p>
    );
  }
  if (status === "taken")
    return (
      <p className="text-xs text-red-400 mt-1.5">
        @{username} is already taken.
      </p>
    );
  if (status === "available")
    return (
      <p className="text-xs text-slime-accent mt-1.5">
        @{username} is available!
      </p>
    );
  return null;
}

const inputCls =
  "w-full px-3 py-2.5 rounded-xl border border-slime-border bg-slime-surface text-sm text-slime-text placeholder:text-slime-muted outline-none focus:border-slime-accent/50 focus:ring-1 focus:ring-slime-accent/30 transition-colors";

const subLabelCls =
  "text-[10px] font-semibold uppercase tracking-wider text-slime-muted mb-1.5";

const sectionStyle = {
  background: "rgba(45,10,78,0.25)",
  border: "1px solid rgba(45,10,78,0.7)",
  boxShadow: "inset 0 0 16px rgba(45,10,78,0.1)",
};

function SubscriptionSection({
  subscriptionTier,
  periodEnd,
  cancelAtPeriodEnd,
}: {
  subscriptionTier: string;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}) {
  const [portalLoading, setPortalLoading] = useState(false);
  // [Fix 43] Hover state for the Manage Subscription button — needed because the
  // styling is inline (not a Tailwind class) and inline :hover can't be expressed.
  const [manageHover, setManageHover] = useState(false);

  // [Fix C] Format the incoming ISO timestamp once per render into a short
  // human-readable string like "Apr 16, 2027". null means "don't render the
  // secondary text at all" — no em-dash, no placeholder.
  const formattedDate = formatPeriodEnd(periodEnd);

  const handleManage = async () => {
    if (portalLoading) return;
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          return_url: window.location.href,
          mode: "user",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Portal error:", err);
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <section className="rounded-2xl p-4 space-y-3" style={sectionStyle}>
      <p className="section-label">Subscription</p>

      {subscriptionTier === "pro" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span
              style={{
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                color: "#0A0A0A",
                fontSize: "11px",
                fontWeight: 800,
                padding: "3px 10px",
                borderRadius: "9999px",
                fontFamily: "Montserrat, sans-serif",
                letterSpacing: "0.04em",
              }}
            >
              PRO
            </span>
            {formattedDate && (
              <span className="text-xs text-slime-muted font-medium">
                {cancelAtPeriodEnd ? "Ends" : "Renews"} {formattedDate}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleManage}
            onMouseEnter={() => setManageHover(true)}
            onMouseLeave={() => setManageHover(false)}
            disabled={portalLoading}
            className="w-full"
            style={{
              background:
                !portalLoading && manageHover
                  ? "rgba(45,10,78,0.7)"
                  : "rgba(45,10,78,0.5)",
              border: "1px solid rgba(45,10,78,0.9)",
              color: portalLoading
                ? "rgba(245,245,245,0.4)"
                : manageHover
                  ? "#FFFFFF"
                  : "rgba(245,245,245,0.85)",
              opacity: portalLoading ? 0.5 : 1,
              cursor: portalLoading ? "not-allowed" : "pointer",
              paddingTop: "12px",
              paddingBottom: "12px",
              borderRadius: "9999px",
              fontSize: "13px",
              fontWeight: 700,
              transition: "all 0.15s ease",
            }}
          >
            {portalLoading ? "Loading..." : "Manage Subscription"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slime-muted leading-relaxed">
            Upgrade to Pro for unlimited logging, advanced stats, custom
            categories, ad-free experience, and a Pro badge.
          </p>
          <div className="flex flex-wrap gap-3">
            <UpgradeButton
              priceId={process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID!}
              label="Go Pro — $2.99/mo"
              mode="user"
              currentPath="/settings/profile"
            />
            <UpgradeButton
              priceId={process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID!}
              label="Go Pro — $14.99/yr"
              mode="user"
              currentPath="/settings/profile"
            />
          </div>
        </div>
      )}
    </section>
  );
}

// [Change 3] — AccountSection: collapsible card for changing email address
function AccountSection({ currentEmail }: { currentEmail: string }) {
  const [expanded, setExpanded] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function handleChangeEmail() {
    const trimmed = newEmail.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setErrorMsg("Please enter a valid email address.");
      setStatus("error");
      return;
    }
    if (trimmed.toLowerCase() === currentEmail.toLowerCase()) {
      setErrorMsg("That's already your current email.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("success");
    }
  }

  return (
    <section className="rounded-2xl overflow-hidden" style={sectionStyle}>
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={() => {
          setExpanded((v) => !v);
          setStatus("idle");
          setNewEmail("");
          setErrorMsg("");
        }}
        className="w-full flex items-center justify-between px-4 py-4 active:opacity-70 transition-opacity"
      >
        <p className="section-label mb-0">Account</p>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-slime-muted transition-transform duration-200"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expandable body */}
      {expanded && (
        <div
          className="px-4 pb-4 flex flex-col gap-3"
          style={{ borderTop: "1px solid rgba(45,10,78,0.5)" }}
        >
          {status === "success" ? (
            <div className="flex flex-col gap-2 pt-3">
              <div className="flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#39FF14"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "#39FF14" }}
                >
                  Confirmation sent
                </p>
              </div>
              <p className="text-xs text-slime-muted leading-relaxed">
                Check your inbox at{" "}
                <span className="text-slime-text font-medium">
                  {newEmail.trim()}
                </span>{" "}
                and click the link to confirm your new email address.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStatus("idle");
                  setNewEmail("");
                  setExpanded(false);
                }}
                className="mt-1 text-xs text-slime-muted font-medium text-left active:opacity-70 transition-opacity"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="pt-3">
                <p className={subLabelCls}>CURRENT EMAIL</p>
                <p className="text-sm text-slime-text font-medium px-3 py-2.5 rounded-xl border border-slime-border bg-slime-surface/50">
                  {currentEmail}
                </p>
              </div>

              <div>
                <label htmlFor="new-email" className={subLabelCls}>
                  NEW EMAIL
                </label>
                <input
                  id="new-email"
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  spellCheck={false}
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (status === "error") {
                      setStatus("idle");
                      setErrorMsg("");
                    }
                  }}
                  placeholder="new@email.com"
                  className={inputCls}
                />
                {status === "error" && errorMsg && (
                  <p className="text-xs text-red-400 mt-1.5">{errorMsg}</p>
                )}
              </div>

              <button
                type="button"
                onClick={handleChangeEmail}
                disabled={status === "loading" || newEmail.trim() === ""}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                  color: "#0A0A0A",
                }}
              >
                {status === "loading" ? "Sending\u2026" : "Send Confirmation"}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

// [Change 2] — ProfileSettingsContent now accepts userEmail prop
function ProfileSettingsContent({
  userId,
  userEmail,
}: {
  userId: string;
  userEmail: string;
}) {
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [originalForm, setOriginalForm] = useState<FormState>({
    username: "",
    bio: "",
    location: "",
    website_url: "",
    avatar_url: null,
    instagram_handle: "",
    tiktok_handle: "",
    shop_url: "",
  });
  const [form, setForm] = useState<FormState>({
    username: "",
    bio: "",
    location: "",
    website_url: "",
    avatar_url: null,
    instagram_handle: "",
    tiktok_handle: "",
    shop_url: "",
  });
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free");
  const [subscriptionPeriodEnd, setSubscriptionPeriodEnd] = useState<
    string | null
  >(null);
  const [subscriptionCancelAtPeriodEnd, setSubscriptionCancelAtPeriodEnd] =
    useState<boolean>(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const upgraded = searchParams.get("upgraded") === "true";
    const alreadyPro = searchParams.get("already_pro") === "true";

    if (upgraded) {
      showToast("Welcome to SlimeLog Pro!", "success");
    } else if (alreadyPro) {
      showToast("You're already subscribed to Pro.", "info");
    }

    if (upgraded || alreadyPro) {
      router.replace("/settings/profile");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    supabase
      .from("profiles")
      .select(
        "username, bio, location, website_url, avatar_url, subscription_tier, subscription_current_period_end, subscription_cancel_at_period_end, instagram_handle, tiktok_handle, shop_url",
      )
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const loaded: FormState = {
            username: data.username ?? "",
            bio: data.bio ?? "",
            location: data.location ?? "",
            website_url: data.website_url ?? "",
            avatar_url: data.avatar_url ?? null,
            instagram_handle: data.instagram_handle ?? "",
            tiktok_handle: data.tiktok_handle ?? "",
            shop_url: data.shop_url ?? "",
          };
          setOriginalForm(loaded);
          setForm(loaded);
          setSubscriptionTier(data.subscription_tier ?? "free");
          setSubscriptionPeriodEnd(
            data.subscription_current_period_end ?? null,
          );
          setSubscriptionCancelAtPeriodEnd(
            data.subscription_cancel_at_period_end ?? false,
          );
        }
        setProfileLoading(false);
      });
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkUsername = useCallback(
    async (value: string) => {
      if (value === originalForm.username) {
        setUsernameStatus("idle");
        return;
      }
      if (validateUsername(value) === "invalid") {
        setUsernameStatus("invalid");
        return;
      }
      setUsernameStatus("checking");
      const available = await checkUsernameAvailable(value);
      setUsernameStatus(available ? "available" : "taken");
    },
    [originalForm.username],
  );

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, username: value }));
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (value === originalForm.username || value === "") {
      setUsernameStatus("idle");
      return;
    }
    if (validateUsername(value) === "invalid") {
      setUsernameStatus("invalid");
      return;
    }
    setUsernameStatus("checking");
    debounceTimer.current = setTimeout(() => checkUsername(value), 500);
  };

  const stripLeadingAt = (value: string) =>
    value.startsWith("@") ? value.slice(1) : value;

  const handleInstagramChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = stripLeadingAt(e.target.value);
    setForm((f) => ({ ...f, instagram_handle: value }));
  };

  const handleTiktokChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = stripLeadingAt(e.target.value);
    setForm((f) => ({ ...f, tiktok_handle: value }));
  };

  const handleShopUrlBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    if (value && !/^https?:\/\//i.test(value)) {
      setForm((f) => ({ ...f, shop_url: `https://${value}` }));
    }
  };

  const [saving, setSaving] = useState(false);

  const hasChanges =
    form.username !== originalForm.username ||
    form.bio !== originalForm.bio ||
    form.location !== originalForm.location ||
    form.website_url !== originalForm.website_url ||
    form.avatar_url !== originalForm.avatar_url ||
    form.instagram_handle !== originalForm.instagram_handle ||
    form.tiktok_handle !== originalForm.tiktok_handle ||
    form.shop_url !== originalForm.shop_url;

  const instagramValid =
    form.instagram_handle === "" || INSTAGRAM_RE.test(form.instagram_handle);
  const tiktokValid =
    form.tiktok_handle === "" || TIKTOK_RE.test(form.tiktok_handle);
  const shopUrlValid = form.shop_url === "" || SHOP_URL_RE.test(form.shop_url);

  const isFormValid =
    hasChanges &&
    form.username.length >= 3 &&
    (form.username === originalForm.username ||
      usernameStatus === "available") &&
    (form.username === originalForm.username ||
      validateUsername(form.username) === "valid") &&
    form.bio.length <= 150 &&
    instagramValid &&
    tiktokValid &&
    shopUrlValid;

  const handleSave = async () => {
    if (!isFormValid) return;
    setSaving(true);

    const result = await updateProfile({
      username: form.username,
      bio: form.bio || undefined,
      avatar_url: form.avatar_url || undefined,
      location: form.location || undefined,
      website_url: form.website_url || undefined,
      instagram_handle: form.instagram_handle || undefined,
      tiktok_handle: form.tiktok_handle || undefined,
      shop_url: form.shop_url || undefined,
    });

    setSaving(false);

    if (result.success) {
      showToast("Profile saved", "success");
      setOriginalForm({ ...form });
      setUsernameStatus("idle");
    } else {
      showToast("Could not save profile", "error");
    }
  };

  if (profileLoading) {
    return (
      <div className="px-4 pt-10 space-y-4 animate-pulse">
        <div className="h-6 w-32 bg-slime-surface rounded-xl" />
        <div className="h-28 w-28 bg-slime-surface rounded-2xl" />
        <div className="h-12 rounded-2xl" style={sectionStyle} />
        <div className="h-24 rounded-2xl" style={sectionStyle} />
        <div className="h-12 rounded-2xl" style={sectionStyle} />
      </div>
    );
  }

  return (
    <>
      <header className="px-4 pt-10 pb-6 flex items-center gap-3">
        <Link
          href="/profile"
          className="w-8 h-8 rounded-xl bg-slime-surface border border-slime-border flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Back to profile"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            width={16}
            height={16}
            className="text-slime-muted"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-black text-slime-cyan leading-tight">
            Edit Profile
          </h1>
          <p className="text-xs text-slime-muted mt-0.5">
            Update your SlimeLog presence
          </p>
        </div>
      </header>

      <div className="px-4 pb-28 space-y-5">
        {/* CARD 1 — Profile Photo */}
        <section className="rounded-2xl p-4 space-y-2" style={sectionStyle}>
          <p className="section-label">Profile Photo</p>
          <div className="flex items-start gap-4 mt-2">
            <div className="w-24 shrink-0">
              <ImageUpload
                bucket="avatars"
                userId={userId}
                existingUrl={form.avatar_url}
                onUploadComplete={(url) =>
                  setForm((f) => ({ ...f, avatar_url: url }))
                }
                onRemove={() => setForm((f) => ({ ...f, avatar_url: null }))}
                label="Add photo"
                aspectRatio="square"
              />
            </div>
            <div className="flex-1 flex flex-col justify-center gap-1 pt-1">
              <p className="text-sm font-semibold text-slime-text leading-tight">
                {form.username || "Your Name"}
              </p>
              <p className="text-xs text-slime-muted">
                Tap to upload or change your avatar. Max 2 MB.
              </p>
              {form.avatar_url && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, avatar_url: null }))}
                  className="mt-1 text-xs text-red-400 font-medium text-left active:opacity-70 transition-opacity"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
        </section>

        {/* CARD 2 — About You */}
        <section className="rounded-2xl p-4" style={sectionStyle}>
          <p className="section-label">About You</p>

          <div className="flex flex-col gap-4 mt-3">
            {/* Username */}
            <div>
              <label htmlFor="username" className={subLabelCls}>
                USERNAME
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-slime-muted text-sm font-medium select-none">
                  @
                </span>
                <input
                  id="username"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={form.username}
                  onChange={handleUsernameChange}
                  maxLength={20}
                  placeholder="your_username"
                  className={`w-full pl-7 pr-10 py-2.5 rounded-xl border text-sm font-semibold placeholder:text-slime-muted outline-none transition-colors bg-slime-surface text-slime-text ${
                    usernameStatus === "taken" || usernameStatus === "invalid"
                      ? "border-red-500/40 focus:border-red-500/60"
                      : usernameStatus === "available"
                        ? "border-slime-accent/40 focus:border-slime-accent/60"
                        : "border-slime-border focus:border-slime-accent/50"
                  }`}
                />
                <div className="absolute right-3">
                  <UsernameStatusIcon status={usernameStatus} />
                </div>
              </div>
              <UsernameHint status={usernameStatus} username={form.username} />
            </div>

            {/* Bio */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="bio" className={subLabelCls}>
                  BIO
                </label>
                <span
                  className={`text-[10px] font-medium tabular-nums transition-colors mb-1.5 ${
                    form.bio.length > 140
                      ? form.bio.length > 150
                        ? "text-red-400"
                        : "text-amber-400"
                      : "text-slime-muted"
                  }`}
                >
                  {form.bio.length}/150
                </span>
              </div>
              <textarea
                id="bio"
                rows={3}
                value={form.bio}
                maxLength={150}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bio: e.target.value }))
                }
                placeholder="Tell the slime world about yourself…"
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>
        </section>

        {/* CARD 3 — Contact & Links */}
        <section className="rounded-2xl p-4" style={sectionStyle}>
          <p className="section-label">Contact &amp; Links</p>

          <div className="flex flex-col gap-4 mt-3">
            {/* Location */}
            <div>
              <label htmlFor="location" className={subLabelCls}>
                LOCATION
              </label>
              <input
                id="location"
                type="text"
                value={form.location}
                maxLength={100}
                placeholder="e.g. Austin, TX"
                onChange={(e) =>
                  setForm((f) => ({ ...f, location: e.target.value }))
                }
                className={inputCls}
              />
            </div>

            {/* Website */}
            <div>
              <label htmlFor="website_url" className={subLabelCls}>
                WEBSITE
              </label>
              <input
                id="website_url"
                type="url"
                inputMode="url"
                value={form.website_url}
                maxLength={200}
                placeholder="https://yourshop.com"
                onChange={(e) =>
                  setForm((f) => ({ ...f, website_url: e.target.value }))
                }
                className={inputCls}
              />
            </div>

            {/* Instagram */}
            <div>
              <label htmlFor="instagram_handle" className={subLabelCls}>
                INSTAGRAM
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-slime-muted text-sm font-medium select-none">
                  @
                </span>
                <input
                  id="instagram_handle"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={form.instagram_handle}
                  onChange={handleInstagramChange}
                  maxLength={30}
                  placeholder="slimelogapp"
                  className={`${inputCls} pl-7`}
                />
              </div>
              {form.instagram_handle === "" ? (
                <p className="text-xs text-slime-muted mt-1">
                  Your Instagram username (without @)
                </p>
              ) : INSTAGRAM_RE.test(form.instagram_handle) ? (
                <p className="text-[10px] text-slime-muted mt-1">
                  Links to instagram.com/{form.instagram_handle}
                </p>
              ) : (
                <p className="text-xs text-red-400 mt-1">
                  Letters, numbers, periods, and underscores only.
                </p>
              )}
            </div>

            {/* TikTok */}
            <div>
              <label htmlFor="tiktok_handle" className={subLabelCls}>
                TIKTOK
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-slime-muted text-sm font-medium select-none">
                  @
                </span>
                <input
                  id="tiktok_handle"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={form.tiktok_handle}
                  onChange={handleTiktokChange}
                  maxLength={24}
                  placeholder="slimelogapp"
                  className={`${inputCls} pl-7`}
                />
              </div>
              {form.tiktok_handle === "" ? (
                <p className="text-xs text-slime-muted mt-1">
                  Your TikTok username (without @)
                </p>
              ) : TIKTOK_RE.test(form.tiktok_handle) ? (
                <p className="text-[10px] text-slime-muted mt-1">
                  Links to tiktok.com/@{form.tiktok_handle}
                </p>
              ) : (
                <p className="text-xs text-red-400 mt-1">
                  Letters, numbers, periods, and underscores only.
                </p>
              )}
            </div>

            {/* Shop URL */}
            <div>
              <label htmlFor="shop_url" className={subLabelCls}>
                SHOP URL
              </label>
              <input
                id="shop_url"
                type="url"
                inputMode="url"
                autoCapitalize="none"
                spellCheck={false}
                value={form.shop_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, shop_url: e.target.value }))
                }
                onBlur={handleShopUrlBlur}
                maxLength={200}
                placeholder="https://myshop.etsy.com"
                className={inputCls}
              />
              {form.shop_url === "" ? (
                <p className="text-xs text-slime-muted mt-1">
                  Your Etsy, Shopify, or other shop link
                </p>
              ) : SHOP_URL_RE.test(form.shop_url) ? null : (
                <p className="text-xs text-red-400 mt-1">
                  Must be a valid URL starting with https://
                </p>
              )}
            </div>
          </div>
        </section>

        {/* CARD 4 — Subscription */}
        <SubscriptionSection
          subscriptionTier={subscriptionTier}
          periodEnd={subscriptionPeriodEnd}
          cancelAtPeriodEnd={subscriptionCancelAtPeriodEnd}
        />

        {/* CARD 5 — Account */}
        {/* [Change 4] — AccountSection wired in between Subscription and Save button */}
        <AccountSection currentEmail={userEmail} />

        <button
          type="button"
          onClick={handleSave}
          disabled={!isFormValid || saving}
          className={`w-full py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all active:scale-95 ${isFormValid && !saving ? "text-slime-bg shadow-glow-green" : "bg-slime-surface text-slime-muted cursor-not-allowed"}`}
          style={
            isFormValid && !saving
              ? { background: "linear-gradient(135deg, #39FF14, #00F0FF)" }
              : undefined
          }
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </>
  );
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  // [Change 1] — capture email from auth session
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
      } else {
        setUserId(data.user.id);
        // [Change 1] — store email alongside userId
        setUserEmail(data.user.email ?? "");
        setAuthChecked(true);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!authChecked || !userId) {
    return (
      <PageWrapper>
        <div className="px-4 pt-10 space-y-4 animate-pulse">
          <div className="h-6 w-32 bg-slime-surface rounded-xl" />
          <div className="h-28 w-28 bg-slime-surface rounded-2xl" />
          <div className="h-12 rounded-2xl" style={sectionStyle} />
          <div className="h-24 rounded-2xl" style={sectionStyle} />
          <div className="h-12 rounded-2xl" style={sectionStyle} />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper dots>
      {/* [Change 1] — pass userEmail down to content component */}
      <ProfileSettingsContent userId={userId} userEmail={userEmail} />
    </PageWrapper>
  );
}

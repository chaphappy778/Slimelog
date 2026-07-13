// apps/web/components/marketplace/MarketplaceComingSoonClient.tsx
//
// T113 (2026-07-12): interactive shell for the Marketplace Coming Soon
// page. Owns:
//   - The three-tile intent picker (sell / buy / both)
//   - Join-the-waitlist submission
//   - Success state with the user's numeric position
//   - The expandable "help us build this right" research panel with
//     debounced auto-save on every change
//   - The share CTA (Web Share API with clipboard fallback), appending
//     the user's referral code so shares double as invites
//
// Design mirror: /sessions/vibrant-friendly-rubin/mnt/outputs/marketplace-design/
// Anti-AI-art rule: no mascots, no character illustrations. Line SVG
// icons for tile intents, tinted color dots for trust chips, ambient
// gradient orb background only.

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import type {
  MarketplaceWaitlistEntry,
  WaitlistIntent,
  WaitlistSellVolume,
  WaitlistSpendBand,
} from "@/lib/types";

// ─── Shared types ────────────────────────────────────────────────────

export interface MarketplaceTopBrand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  total_logs: number;
}

interface Props {
  initialTopBrands: MarketplaceTopBrand[];
  /** Read-only display copy: "Signed in as ...". */
  userEmail: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────

const SPEND_BANDS: ReadonlyArray<{ value: WaitlistSpendBand; label: string }> =
  [
    { value: "10-25", label: "$10–25" },
    { value: "25-50", label: "$25–50" },
    { value: "50-100", label: "$50–100" },
    { value: "100+", label: "$100+" },
  ];

const SELL_VOLUMES: ReadonlyArray<{
  value: WaitlistSellVolume;
  label: string;
}> = [
  { value: "1-5", label: "1–5" },
  { value: "6-20", label: "6–20" },
  { value: "21-50", label: "21–50" },
  { value: "50+", label: "50+" },
];

const AUTOSAVE_DEBOUNCE_MS = 500;
const TRUST_NEED_MAX = 200;

// Trust chip color dots — mirror the design mockup's palette rotation.
const TRUST_CHIPS: ReadonlyArray<{ label: string; dot: string }> = [
  { label: "Verified brands", dot: "#00F0FF" },
  { label: "Real condition standards", dot: "#39FF14" },
  { label: "Safe payments via Stripe", dot: "#CC44FF" },
  { label: "Community-authored trust", dot: "#FFAE3B" },
];

// ─── Icon primitives (line SVG only, no mascots) ─────────────────────

function IconSell({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 7h13l-1.2 9a2 2 0 0 1-2 1.75H7.2A2 2 0 0 1 5.2 16L3 7z" />
      <path d="M8 7V5a4 4 0 0 1 8 0v2" />
      <line x1="12" y1="11" x2="12" y2="14" />
    </svg>
  );
}

function IconBuy({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="17" cy="20" r="1.5" />
      <path d="M3 4h2.2l2.2 11a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.5L20 8H6" />
    </svg>
  );
}

function IconBoth({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="17 3 21 7 17 11" />
      <path d="M21 7H8a4 4 0 0 0-4 4v1" />
      <polyline points="7 21 3 17 7 13" />
      <path d="M3 17h13a4 4 0 0 0 4-4v-1" />
    </svg>
  );
}

// ─── Ambient orb background (gradient only, no imagery) ──────────────

function AmbientOrbs(): React.ReactElement {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      <div
        style={{
          position: "absolute",
          top: -80,
          left: -40,
          width: 320,
          height: 320,
          borderRadius: "50%",
          filter: "blur(60px)",
          opacity: 0.5,
          mixBlendMode: "screen",
          background:
            "radial-gradient(circle at 30% 30%, #CC44FF, transparent 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 40,
          right: -70,
          width: 280,
          height: 280,
          borderRadius: "50%",
          filter: "blur(60px)",
          opacity: 0.45,
          mixBlendMode: "screen",
          background:
            "radial-gradient(circle at 60% 40%, #00F0FF, transparent 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 240,
          left: "50%",
          transform: "translateX(-50%)",
          width: 360,
          height: 360,
          borderRadius: "50%",
          filter: "blur(60px)",
          opacity: 0.28,
          mixBlendMode: "screen",
          background:
            "radial-gradient(circle at 50% 50%, #39FF14, transparent 72%)",
        }}
      />
    </div>
  );
}

// ─── Utilities ───────────────────────────────────────────────────────

function absoluteMarketplaceUrl(referralCode: string | null): string {
  if (typeof window === "undefined") return "/marketplace";
  const base = `${window.location.origin}/marketplace`;
  return referralCode ? `${base}?ref=${referralCode}` : base;
}

interface UpsertResponse {
  ok?: boolean;
  position?: number;
  total?: number;
  is_new?: boolean;
  entry?: MarketplaceWaitlistEntry;
  error?: string;
  field?: string;
}

interface PositionResponse {
  position: number | null;
  total: number;
  entry: MarketplaceWaitlistEntry | null;
  error?: string;
}

// ─── Component ───────────────────────────────────────────────────────

export default function MarketplaceComingSoonClient({
  initialTopBrands,
  userEmail,
}: Props): React.ReactElement {
  const { profile } = useAuth();
  const referralCode = profile?.referral_code ?? null;

  // Mode: form (user hasn't joined yet) or success (they're on the list).
  const [mode, setMode] = useState<"form" | "success">("form");
  const [hydrating, setHydrating] = useState<boolean>(true);

  // Form state
  const [intent, setIntent] = useState<WaitlistIntent | null>(null);
  const [brandIds, setBrandIds] = useState<Set<string>>(new Set());
  // 2026-07-12: freeform "Other" brand names entered via the extra chip.
  const [brandNamesOther, setBrandNamesOther] = useState<string[]>([]);
  const [otherInputOpen, setOtherInputOpen] = useState<boolean>(false);
  const [otherInput, setOtherInput] = useState<string>("");
  const [spendBand, setSpendBand] = useState<WaitlistSpendBand | null>(null);
  const [sellVolume, setSellVolume] = useState<WaitlistSellVolume | null>(null);
  const [trustNeed, setTrustNeed] = useState<string>("");

  // Success state
  const [position, setPosition] = useState<number | null>(null);
  const [showResearch, setShowResearch] = useState<boolean>(false);
  const [savedFlash, setSavedFlash] = useState<boolean>(false);
  const [copiedFlash, setCopiedFlash] = useState<boolean>(false);

  // Submit state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Autosave orchestration
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Mount: hydrate from server ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/marketplace/waitlist/position", {
          method: "GET",
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          // 401 shouldn't happen (page is server-guarded) but silently
          // fall through to the form state if it does.
          setHydrating(false);
          return;
        }
        const json: PositionResponse = await res.json();
        if (cancelled) return;

        if (json.entry && json.position != null) {
          // Returning user — jump straight to success + hydrate answers.
          const e = json.entry;
          setIntent(e.intent);
          setBrandIds(new Set(e.brand_ids ?? []));
          setBrandNamesOther(e.brand_names_other ?? []);
          setSpendBand(e.spend_band);
          setSellVolume(e.sell_volume);
          setTrustNeed(e.trust_need ?? "");
          setPosition(json.position);
          setMode("success");
        }
      } catch (err) {
        console.warn("[marketplace] position hydrate failed:", err);
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();

    return () => {
      cancelled = true;
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  // ─── Submit ───────────────────────────────────────────────────────
  const submit = useCallback(
    async (payload: {
      intent: WaitlistIntent;
      brand_ids: string[] | null;
      brand_names_other: string[] | null;
      spend_band: WaitlistSpendBand | null;
      sell_volume: WaitlistSellVolume | null;
      trust_need: string | null;
    }) => {
      setSubmitting(true);
      setSubmitError(null);
      try {
        const res = await fetch("/api/marketplace/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json: UpsertResponse = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          setSubmitError(
            json.error ?? "Could not save your spot. Try again shortly.",
          );
          return null;
        }
        return json;
      } catch (err) {
        console.error("[marketplace] submit failed:", err);
        setSubmitError("Network error. Try again in a moment.");
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  const handleJoin = useCallback(async () => {
    if (!intent) return;
    const json = await submit({
      intent,
      brand_ids: brandIds.size > 0 ? Array.from(brandIds) : null,
      brand_names_other: brandNamesOther.length > 0 ? brandNamesOther : null,
      spend_band: spendBand,
      sell_volume: sellVolume,
      trust_need: trustNeed.trim().length > 0 ? trustNeed.trim() : null,
    });
    if (json && json.position != null) {
      setPosition(json.position);
      setMode("success");
    }
  }, [intent, brandIds, brandNamesOther, spendBand, sellVolume, trustNeed, submit]);

  // ─── Autosave (success state, research answers) ───────────────────
  const scheduleAutosave = useCallback(
    (next: {
      brandIds?: Set<string>;
      brandNamesOther?: string[];
      spendBand?: WaitlistSpendBand | null;
      sellVolume?: WaitlistSellVolume | null;
      trustNeed?: string;
    }) => {
      if (mode !== "success" || !intent) return;
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(async () => {
        const nextBrandIds = next.brandIds ?? brandIds;
        const nextBrandNamesOther = next.brandNamesOther ?? brandNamesOther;
        const nextSpend = next.spendBand !== undefined ? next.spendBand : spendBand;
        const nextVolume =
          next.sellVolume !== undefined ? next.sellVolume : sellVolume;
        const nextTrust = next.trustNeed !== undefined ? next.trustNeed : trustNeed;
        const trimmedTrust = nextTrust.trim();
        const json = await submit({
          intent,
          brand_ids: nextBrandIds.size > 0 ? Array.from(nextBrandIds) : null,
          brand_names_other:
            nextBrandNamesOther.length > 0 ? nextBrandNamesOther : null,
          spend_band: nextSpend,
          sell_volume: nextVolume,
          trust_need: trimmedTrust.length > 0 ? trimmedTrust : null,
        });
        if (json) {
          setSavedFlash(true);
          if (savedTimer.current) clearTimeout(savedTimer.current);
          savedTimer.current = setTimeout(() => setSavedFlash(false), 2400);
        }
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [
      mode,
      intent,
      brandIds,
      brandNamesOther,
      spendBand,
      sellVolume,
      trustNeed,
      submit,
    ],
  );

  // ─── Handlers ─────────────────────────────────────────────────────
  const toggleBrand = useCallback(
    (id: string) => {
      setBrandIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        scheduleAutosave({ brandIds: next });
        return next;
      });
    },
    [scheduleAutosave],
  );

  // 2026-07-12: "Other" freeform brand chip handlers.
  const addOtherBrand = useCallback(() => {
    const trimmed = otherInput.trim().slice(0, 60);
    if (!trimmed) return;
    setBrandNamesOther((prev) => {
      // Dedupe case-insensitively.
      const key = trimmed.toLowerCase();
      if (prev.some((n) => n.toLowerCase() === key)) {
        setOtherInput("");
        return prev;
      }
      const next = [...prev, trimmed].slice(0, 10);
      scheduleAutosave({ brandNamesOther: next });
      return next;
    });
    setOtherInput("");
  }, [otherInput, scheduleAutosave]);

  const removeOtherBrand = useCallback(
    (name: string) => {
      setBrandNamesOther((prev) => {
        const next = prev.filter((n) => n !== name);
        scheduleAutosave({ brandNamesOther: next });
        return next;
      });
    },
    [scheduleAutosave],
  );

  const onOtherInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addOtherBrand();
      } else if (e.key === "Escape") {
        setOtherInputOpen(false);
        setOtherInput("");
      }
    },
    [addOtherBrand],
  );

  const pickSpendBand = useCallback(
    (v: WaitlistSpendBand) => {
      // Toggle behavior: tapping the selected pill clears it.
      const next = spendBand === v ? null : v;
      setSpendBand(next);
      scheduleAutosave({ spendBand: next });
    },
    [spendBand, scheduleAutosave],
  );

  const pickSellVolume = useCallback(
    (v: WaitlistSellVolume) => {
      const next = sellVolume === v ? null : v;
      setSellVolume(next);
      scheduleAutosave({ sellVolume: next });
    },
    [sellVolume, scheduleAutosave],
  );

  const onTrustNeedChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const raw = e.target.value.slice(0, TRUST_NEED_MAX);
      setTrustNeed(raw);
      scheduleAutosave({ trustNeed: raw });
    },
    [scheduleAutosave],
  );

  const handleShare = useCallback(async () => {
    const url = absoluteMarketplaceUrl(referralCode);
    const text =
      "I just claimed my spot on the SlimeLog Marketplace waitlist. Real buying and selling with people who actually get slime. Get on the list:";
    const payload: ShareData = {
      title: "SlimeLog Marketplace",
      text,
      url,
    };

    const nav = typeof navigator !== "undefined" ? navigator : null;
    if (nav && "share" in nav) {
      const canShare =
        typeof nav.canShare === "function" ? nav.canShare(payload) : true;
      if (canShare) {
        try {
          await nav.share(payload);
          return;
        } catch {
          // User cancelled or share failed — fall through to clipboard.
        }
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedFlash(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopiedFlash(false), 2600);
    } catch {
      // Last-ditch mailto so the user has some way to share.
      if (typeof window !== "undefined") {
        window.location.href = `mailto:?subject=${encodeURIComponent(
          "SlimeLog Marketplace",
        )}&body=${encodeURIComponent(`${text}\n\n${url}`)}`;
      }
    }
  }, [referralCode]);

  // ─── Derived ──────────────────────────────────────────────────────
  const canJoin = intent !== null && !submitting;
  const showSpend = intent === "buy" || intent === "both";
  const showVolume = intent === "sell" || intent === "both";
  const roleWord = useMemo(() => {
    if (intent === "sell") return "sellers";
    if (intent === "buy") return "buyers";
    return "buyers and sellers";
  }, [intent]);

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <main
      className="relative pt-16 pb-24 px-4 max-w-lg mx-auto"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <AmbientOrbs />

      <div className="relative z-10 flex flex-col gap-5">
        {mode === "form" ? (
          <FormState
            hydrating={hydrating}
            intent={intent}
            setIntent={setIntent}
            userEmail={userEmail}
            canJoin={canJoin}
            submitting={submitting}
            submitError={submitError}
            handleJoin={handleJoin}
          />
        ) : (
          <SuccessState
            position={position}
            roleWord={roleWord}
            handleShare={handleShare}
            copiedFlash={copiedFlash}
            showResearch={showResearch}
            setShowResearch={setShowResearch}
            initialTopBrands={initialTopBrands}
            brandIds={brandIds}
            toggleBrand={toggleBrand}
            brandNamesOther={brandNamesOther}
            otherInputOpen={otherInputOpen}
            setOtherInputOpen={setOtherInputOpen}
            otherInput={otherInput}
            setOtherInput={setOtherInput}
            addOtherBrand={addOtherBrand}
            removeOtherBrand={removeOtherBrand}
            onOtherInputKeyDown={onOtherInputKeyDown}
            showSpend={showSpend}
            showVolume={showVolume}
            spendBand={spendBand}
            pickSpendBand={pickSpendBand}
            sellVolume={sellVolume}
            pickSellVolume={pickSellVolume}
            trustNeed={trustNeed}
            onTrustNeedChange={onTrustNeedChange}
            savedFlash={savedFlash}
          />
        )}

        <DeepLinks />
      </div>
    </main>
  );
}

// ─── Form state ──────────────────────────────────────────────────────

interface FormStateProps {
  hydrating: boolean;
  intent: WaitlistIntent | null;
  setIntent: (v: WaitlistIntent) => void;
  userEmail: string | null;
  canJoin: boolean;
  submitting: boolean;
  submitError: string | null;
  handleJoin: () => void;
}

function FormState({
  hydrating,
  intent,
  setIntent,
  userEmail,
  canJoin,
  submitting,
  submitError,
  handleJoin,
}: FormStateProps): React.ReactElement {
  return (
    <>
      <div className="flex flex-col items-center gap-3">
        <span
          className="text-[11px] font-bold uppercase tracking-[0.14em]"
          style={{ color: "#3DF2FF" }}
        >
          Coming soon
        </span>
        <h1
          className="text-[34px] leading-[1.05] font-black text-white text-center"
          style={{
            fontFamily: "Montserrat, sans-serif",
            letterSpacing: "-0.02em",
            textWrap: "balance",
          }}
        >
          The slime marketplace is coming to{" "}
          <span
            style={{
              background:
                "linear-gradient(135deg, #39FF14 0%, #00F0FF 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            SlimeLog
          </span>
        </h1>
        <p
          className="text-center text-[15px] leading-relaxed max-w-[420px]"
          style={{ color: "rgba(255,255,255,0.72)", textWrap: "pretty" }}
        >
          Buy and sell slimes with people who actually get it. Verified
          brands, real condition standards, ratings and play history baked
          in. Not a Facebook thread, a marketplace built by the community
          that already logs every tub.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {TRUST_CHIPS.map((c) => (
          <span
            key={c.label}
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(45,10,78,0.35)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: c.dot,
                boxShadow: `0 0 8px ${c.dot}`,
              }}
            />
            {c.label}
          </span>
        ))}
      </div>

      <div
        className="rounded-3xl p-5 flex flex-col gap-4"
        style={{
          background: "rgba(45,10,78,0.30)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 10px 40px rgba(0,240,255,0.06)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          className="text-[11px] font-bold uppercase"
          style={{
            color: "#3DF2FF",
            letterSpacing: "0.14em",
          }}
        >
          Join the waitlist
        </div>

        <div>
          <span
            className="block text-[13px] font-semibold mb-2"
            style={{ color: "rgba(255,255,255,0.80)" }}
          >
            I&apos;m here to
          </span>
          <div className="grid grid-cols-3 gap-2">
            <IntentTile
              on={intent === "sell"}
              icon={<IconSell />}
              label="Sell"
              sub="destash"
              onSelect={() => setIntent("sell")}
            />
            <IntentTile
              on={intent === "buy"}
              icon={<IconBuy />}
              label="Buy"
              sub="collect"
              onSelect={() => setIntent("buy")}
            />
            <IntentTile
              on={intent === "both"}
              icon={<IconBoth />}
              label="Both"
              sub="honestly"
              onSelect={() => setIntent("both")}
            />
          </div>
        </div>

        {userEmail && (
          <div
            className="text-xs"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Signed in as {userEmail}
          </div>
        )}

        {submitError && (
          <div
            className="text-xs px-3 py-2 rounded-lg"
            style={{
              background: "rgba(255,61,110,0.10)",
              border: "1px solid rgba(255,61,110,0.40)",
              color: "#FF8AA5",
            }}
            role="alert"
          >
            {submitError}
          </div>
        )}

        <button
          type="button"
          onClick={handleJoin}
          disabled={!canJoin || hydrating}
          className="w-full h-13 rounded-2xl text-sm font-black transition-opacity active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            height: 52,
            background: "linear-gradient(135deg, #39FF14, #00F0FF)",
            color: "#0A0A0A",
            fontFamily: "Montserrat, sans-serif",
            letterSpacing: "-0.01em",
          }}
        >
          {submitting
            ? "Saving your spot..."
            : hydrating
              ? "Checking..."
              : "Join the waitlist"}
        </button>
        <div
          className="text-center text-[11.5px]"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          One tap. Optional questions after, all skippable.
        </div>
      </div>
    </>
  );
}

function IntentTile({
  on,
  icon,
  label,
  sub,
  onSelect,
}: {
  on: boolean;
  icon: React.ReactNode;
  label: string;
  sub: string;
  onSelect: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col items-center gap-1 py-3 px-2 rounded-2xl transition-all active:scale-[0.97]"
      style={{
        background: on
          ? "rgba(45,10,78,0.55)"
          : "rgba(45,10,78,0.25)",
        border: on
          ? "1px solid rgba(0,240,255,0.55)"
          : "1px solid rgba(255,255,255,0.10)",
        boxShadow: on ? "0 0 24px rgba(0,240,255,0.25)" : "none",
        color: on ? "#B8FBFF" : "rgba(255,255,255,0.72)",
      }}
      aria-pressed={on}
    >
      <span style={{ color: on ? "#3DF2FF" : "rgba(255,255,255,0.7)" }}>
        {icon}
      </span>
      <span
        className="text-[13px] font-bold"
        style={{ color: on ? "#B8FBFF" : "white" }}
      >
        {label}
      </span>
      <span
        className="text-[10px]"
        style={{ color: "rgba(255,255,255,0.55)" }}
      >
        {sub}
      </span>
    </button>
  );
}

// ─── Success state ───────────────────────────────────────────────────

interface SuccessStateProps {
  position: number | null;
  roleWord: string;
  handleShare: () => void;
  copiedFlash: boolean;
  showResearch: boolean;
  setShowResearch: (v: boolean) => void;
  initialTopBrands: MarketplaceTopBrand[];
  brandIds: Set<string>;
  toggleBrand: (id: string) => void;
  // 2026-07-12: freeform brand entries via the "Other" chip.
  brandNamesOther: string[];
  otherInputOpen: boolean;
  setOtherInputOpen: (v: boolean) => void;
  otherInput: string;
  setOtherInput: (v: string) => void;
  addOtherBrand: () => void;
  removeOtherBrand: (name: string) => void;
  onOtherInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  showSpend: boolean;
  showVolume: boolean;
  spendBand: WaitlistSpendBand | null;
  pickSpendBand: (v: WaitlistSpendBand) => void;
  sellVolume: WaitlistSellVolume | null;
  pickSellVolume: (v: WaitlistSellVolume) => void;
  trustNeed: string;
  onTrustNeedChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  savedFlash: boolean;
}

function SuccessState({
  position,
  roleWord,
  handleShare,
  copiedFlash,
  showResearch,
  setShowResearch,
  initialTopBrands,
  brandIds,
  toggleBrand,
  brandNamesOther,
  otherInputOpen,
  setOtherInputOpen,
  otherInput,
  setOtherInput,
  addOtherBrand,
  removeOtherBrand,
  onOtherInputKeyDown,
  showSpend,
  showVolume,
  spendBand,
  pickSpendBand,
  sellVolume,
  pickSellVolume,
  trustNeed,
  onTrustNeedChange,
  savedFlash,
}: SuccessStateProps): React.ReactElement {
  // Fallback string uses a plain hyphen, not an em-dash, per the house
  // rule against em-dashes in user-facing copy.
  const posDisplay =
    position != null ? `#${position.toLocaleString("en-US")}` : "#-";

  return (
    <div
      className="rounded-3xl p-6 flex flex-col gap-5"
      style={{
        background: "rgba(45,10,78,0.30)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 10px 40px rgba(57,255,20,0.08)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <span
          className="text-[11px] font-bold uppercase tracking-[0.14em]"
          style={{ color: "#6DFF4D" }}
        >
          You&apos;re on the list
        </span>
        <div
          className="text-[76px] leading-[0.95] font-black"
          style={{
            fontFamily: "Montserrat, sans-serif",
            letterSpacing: "-0.04em",
            background: "linear-gradient(135deg, #39FF14 0%, #00F0FF 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {posDisplay}
        </div>
        <p
          className="text-[14px] max-w-[320px]"
          style={{ color: "rgba(255,255,255,0.72)", textWrap: "pretty" }}
        >
          You&apos;re in early, ahead of the rush. We&apos;ll email you the
          moment the marketplace opens for {roleWord}.
        </p>
      </div>

      <button
        type="button"
        onClick={handleShare}
        className="w-full rounded-2xl text-sm font-black transition-opacity active:opacity-80 flex items-center justify-center gap-2"
        style={{
          height: 52,
          background: "linear-gradient(135deg, #39FF14, #00F0FF)",
          color: "#0A0A0A",
          fontFamily: "Montserrat, sans-serif",
          letterSpacing: "-0.01em",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        Tell your slime friends
      </button>

      {copiedFlash && (
        <div
          className="text-xs font-semibold text-center"
          style={{ color: "#6DFF4D" }}
          role="status"
        >
          Referral link copied ✓ paste it anywhere
        </div>
      )}

      <div
        className="pt-4 flex flex-col gap-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}
      >
        <button
          type="button"
          onClick={() => setShowResearch(!showResearch)}
          className="flex items-center justify-between w-full text-left"
          aria-expanded={showResearch}
        >
          <div>
            <div className="text-sm font-bold text-white">
              Help us build this right
            </div>
            <div
              className="text-xs"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              4 quick questions, all optional. This shapes what we launch.
            </div>
          </div>
          <span
            className="text-lg"
            style={{
              color: "#3DF2FF",
              transform: showResearch ? "rotate(180deg)" : "none",
              transition: "transform 180ms ease",
              display: "inline-block",
              lineHeight: 1,
            }}
            aria-hidden="true"
          >
            ⌄
          </span>
        </button>

        {showResearch && (
          <div className="flex flex-col gap-5 pt-1">
            <div>
              <span
                className="block text-[13px] font-semibold mb-2.5"
                style={{ color: "rgba(255,255,255,0.85)" }}
              >
                Which brands would you buy or sell?{" "}
                <span style={{ color: "rgba(255,255,255,0.45)" }}>
                  (optional)
                </span>
              </span>
              {initialTopBrands.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {initialTopBrands.map((b) => {
                    const on = brandIds.has(b.id);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => toggleBrand(b.id)}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-[0.97]"
                        style={{
                          background: on
                            ? "rgba(0,240,255,0.15)"
                            : "rgba(45,10,78,0.35)",
                          border: on
                            ? "1px solid rgba(0,240,255,0.55)"
                            : "1px solid rgba(255,255,255,0.10)",
                          boxShadow: on
                            ? "0 0 14px rgba(0,240,255,0.25)"
                            : "none",
                          color: on ? "#B8FBFF" : "rgba(255,255,255,0.85)",
                        }}
                        aria-pressed={on}
                      >
                        {b.name}
                      </button>
                    );
                  })}

                  {/* 2026-07-12: freeform "Other" brands added via inline
                      input. Each entry shows as a magenta chip with an
                      inline remove button. */}
                  {brandNamesOther.map((name) => (
                    <span
                      key={`other-${name}`}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold"
                      style={{
                        background: "rgba(255,0,229,0.14)",
                        border: "1px solid rgba(255,0,229,0.45)",
                        color: "#FF9BEB",
                      }}
                    >
                      {name}
                      <button
                        type="button"
                        aria-label={`Remove ${name}`}
                        onClick={() => removeOtherBrand(name)}
                        className="ml-1 inline-flex items-center justify-center rounded-full active:scale-[0.9] transition"
                        style={{
                          width: 16,
                          height: 16,
                          color: "#FF9BEB",
                          fontSize: 14,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}

                  {/* + Other chip toggles the inline input. Hidden once
                      we hit the 10-item cap so we don't invite more. */}
                  {brandNamesOther.length < 10 && (
                    <button
                      type="button"
                      onClick={() => setOtherInputOpen(!otherInputOpen)}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-[0.97]"
                      style={{
                        background: otherInputOpen
                          ? "rgba(255,0,229,0.14)"
                          : "rgba(45,10,78,0.35)",
                        border: otherInputOpen
                          ? "1px solid rgba(255,0,229,0.45)"
                          : "1px dashed rgba(255,255,255,0.30)",
                        color: otherInputOpen
                          ? "#FF9BEB"
                          : "rgba(255,255,255,0.75)",
                      }}
                      aria-expanded={otherInputOpen}
                    >
                      + Other
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  Brand list will appear once the catalog has more logs.
                </div>
              )}

              {/* Inline input reveals when "Other" is tapped. Enter adds,
                  Escape closes, cap of 10 entries. */}
              {otherInputOpen && (
                <div className="mt-3 flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={otherInput}
                    onChange={(e) => setOtherInput(e.target.value.slice(0, 60))}
                    onKeyDown={onOtherInputKeyDown}
                    placeholder="Type a brand name and press Enter"
                    maxLength={60}
                    className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                    style={{
                      background: "rgba(45,10,78,0.30)",
                      border: "1px solid rgba(255,0,229,0.30)",
                      color: "white",
                    }}
                  />
                  <button
                    type="button"
                    onClick={addOtherBrand}
                    disabled={!otherInput.trim()}
                    className="rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-40 transition-opacity"
                    style={{
                      background:
                        "linear-gradient(135deg, #FF00E5, #D976FF)",
                      color: "#0B0114",
                    }}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {showSpend && (
              <div>
                <span
                  className="block text-[13px] font-semibold mb-2.5"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  Typical spend per slime{" "}
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>
                    (buyer, optional)
                  </span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {SPEND_BANDS.map((s) => (
                    <PillPicker
                      key={s.value}
                      on={spendBand === s.value}
                      label={s.label}
                      onSelect={() => pickSpendBand(s.value)}
                    />
                  ))}
                </div>
              </div>
            )}

            {showVolume && (
              <div>
                <span
                  className="block text-[13px] font-semibold mb-2.5"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  How many slimes could you list?{" "}
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>
                    (seller, optional)
                  </span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {SELL_VOLUMES.map((v) => (
                    <PillPicker
                      key={v.value}
                      on={sellVolume === v.value}
                      label={v.label}
                      onSelect={() => pickSellVolume(v.value)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <span
                className="block text-[13px] font-semibold mb-2.5"
                style={{ color: "rgba(255,255,255,0.85)" }}
              >
                One feature you&apos;d need to trust a slime marketplace?{" "}
                <span style={{ color: "rgba(255,255,255,0.45)" }}>
                  (optional)
                </span>
              </span>
              <div style={{ position: "relative" }}>
                <textarea
                  value={trustNeed}
                  onChange={onTrustNeedChange}
                  maxLength={TRUST_NEED_MAX}
                  rows={3}
                  placeholder="e.g. proof the seller sanitized it, or a way to see how many times it's been played..."
                  className="w-full rounded-xl px-3 py-3 text-sm outline-none resize-none"
                  style={{
                    background: "rgba(45,10,78,0.30)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "white",
                    minHeight: 78,
                    fontFamily: "Inter, system-ui, sans-serif",
                  }}
                />
                <span
                  className="absolute text-[11px]"
                  style={{
                    right: 10,
                    bottom: 8,
                    color: "rgba(255,255,255,0.45)",
                  }}
                >
                  {trustNeed.length}/{TRUST_NEED_MAX}
                </span>
              </div>
            </div>

            {savedFlash && (
              <div
                className="text-xs font-semibold text-center"
                style={{ color: "#6DFF4D" }}
                role="status"
              >
                Saved, thank you ✨ this really helps.
              </div>
            )}

            <div
              className="text-center text-[13px]"
              style={{ color: "rgba(255,255,255,0.72)" }}
            >
              Want the launch date first? Follow{" "}
              <a
                href="https://instagram.com/slimelog"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#D976FF", fontWeight: 600 }}
              >
                @slimelog
              </a>{" "}
              on Instagram.
            </div>

            {/* 2026-07-12: Finish button lets users cleanly exit the
                research panel into the rest of the app. All answers are
                already auto-saved so this is purely navigation. Routes
                to /discover — feels like a natural "keep exploring"
                landing after committing to the waitlist. */}
            <Link
              href="/discover"
              className="inline-flex items-center justify-center gap-2 w-full rounded-2xl px-5 py-3.5 text-sm font-black tracking-[0.02em] transition-all active:scale-[0.98]"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,240,255,0.14), rgba(57,255,20,0.10))",
                border: "1px solid rgba(0,240,255,0.35)",
                color: "#B8FBFF",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              Finish, take me back to the app
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function PillPicker({
  on,
  label,
  onSelect,
}: {
  on: boolean;
  label: string;
  onSelect: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-full px-4 py-2 text-[13px] font-semibold transition-all active:scale-[0.97]"
      style={{
        background: on ? "#CC44FF" : "rgba(45,10,78,0.35)",
        border: on
          ? "1px solid #CC44FF"
          : "1px solid rgba(255,255,255,0.10)",
        boxShadow: on ? "0 0 14px rgba(204,68,255,0.35)" : "none",
        color: on ? "white" : "rgba(255,255,255,0.85)",
      }}
      aria-pressed={on}
    >
      {label}
    </button>
  );
}

// ─── Deep links ──────────────────────────────────────────────────────

function DeepLinks(): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-2 justify-center pt-2">
      <DeepLink href="/discover" label="See what people log">
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.5" y2="16.5" />
        </svg>
      </DeepLink>
      <DeepLink href="/leaderboard" label="The community">
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 4h12v4a6 6 0 0 1-12 0V4z" />
          <path d="M6 8H3v2a3 3 0 0 0 3 3" />
          <path d="M18 8h3v2a3 3 0 0 1-3 3" />
          <path d="M9 18h6v2H9z" />
          <path d="M10 14h4l1 4H9l1-4z" />
        </svg>
      </DeepLink>
      <DeepLink href="/brands" label="Brand catalog">
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3s6 6 6 11a6 6 0 0 1-12 0c0-5 6-11 6-11z" />
        </svg>
      </DeepLink>
    </div>
  );
}

function DeepLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-[13px] font-semibold transition-colors"
      style={{
        background: "rgba(45,10,78,0.35)",
        border: "1px solid rgba(255,255,255,0.10)",
        color: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(8px)",
        textDecoration: "none",
      }}
    >
      <span style={{ color: "#3DF2FF", display: "inline-flex" }}>{children}</span>
      {label}
    </Link>
  );
}

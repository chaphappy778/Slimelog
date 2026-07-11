// apps/web/app/admin/subscriptions/SubscriptionsAdminForm.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type TargetType = "user" | "brand";

type LookupRow = {
  id: string;
  label: string;
  subscription_tier: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  stripe_customer_id: string | null;
};

// Quick-lookup: email + username for user, slug + name for brand.
async function lookup(
  targetType: TargetType,
  query: string,
): Promise<LookupRow | { error: string }> {
  const q = query.trim();
  if (!q) return { error: "Enter something to look up." };

  if (targetType === "user") {
    // Try by email first (via auth.users → not accessible from anon key,
    // so we take a different route): look up profile by username or by
    // matching id if the input looks like a UUID. For email-based lookup
    // the admin can copy the user id from Supabase dashboard.
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
    const { data, error } = isUuid
      ? await supabase
          .from("profiles")
          .select(
            "id, username, subscription_tier, subscription_status, subscription_current_period_end, stripe_customer_id",
          )
          .eq("id", q)
          .maybeSingle()
      : await supabase
          .from("profiles")
          .select(
            "id, username, subscription_tier, subscription_status, subscription_current_period_end, stripe_customer_id",
          )
          .eq("username", q.replace(/^@/, ""))
          .maybeSingle();

    if (error) return { error: error.message };
    if (!data) return { error: "No matching user profile." };
    return {
      id: data.id,
      label: `@${data.username ?? "(no username)"}`,
      subscription_tier: data.subscription_tier ?? null,
      subscription_status: data.subscription_status ?? null,
      subscription_current_period_end:
        data.subscription_current_period_end ?? null,
      stripe_customer_id: data.stripe_customer_id ?? null,
    };
  }

  // Brand: match on slug (exact) first, then name.
  const { data: bySlug } = await supabase
    .from("brands")
    .select(
      "id, name, slug, subscription_tier, subscription_status, subscription_current_period_end, stripe_customer_id",
    )
    .eq("slug", q)
    .maybeSingle();
  const data =
    bySlug ??
    (
      await supabase
        .from("brands")
        .select(
          "id, name, slug, subscription_tier, subscription_status, subscription_current_period_end, stripe_customer_id",
        )
        .ilike("name", q)
        .maybeSingle()
    ).data;

  if (!data) return { error: "No matching brand." };
  return {
    id: data.id,
    label: `${data.name} (${data.slug})`,
    subscription_tier: data.subscription_tier ?? null,
    subscription_status: data.subscription_status ?? null,
    subscription_current_period_end:
      data.subscription_current_period_end ?? null,
    stripe_customer_id: data.stripe_customer_id ?? null,
  };
}

const SECTION_STYLE: React.CSSProperties = {
  background: "rgba(45,10,78,0.25)",
  border: "1px solid rgba(45,10,78,0.7)",
};

export default function SubscriptionsAdminForm() {
  const [targetType, setTargetType] = useState<TargetType>("user");
  const [query, setQuery] = useState("");
  const [row, setRow] = useState<LookupRow | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "lookup" | "sync" | "set">(null);
  const [result, setResult] = useState<string | null>(null);
  const [manualTier, setManualTier] = useState<"free" | "pro">("pro");
  const [manualStatus, setManualStatus] = useState<string>("active");

  async function handleLookup() {
    setBusy("lookup");
    setLookupError(null);
    setResult(null);
    const r = await lookup(targetType, query);
    if ("error" in r) {
      setLookupError(r.error);
      setRow(null);
    } else {
      setRow(r);
    }
    setBusy(null);
  }

  async function handleSyncFromStripe() {
    if (!row) return;
    setBusy("sync");
    setResult(null);
    try {
      const res = await fetch("/api/admin/subscriptions/sync-from-stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_type: targetType, target_id: row.id }),
      });
      const body = await res.json();
      if (!res.ok) {
        setResult(`Error: ${body.error ?? res.statusText}`);
      } else {
        setResult(
          `Synced. Stripe subs found: ${body.stripe_sub_count}. Picked status: ${
            body.picked_status ?? "(none — downgraded to free)"
          }.`,
        );
        // Refresh the row
        await handleLookup();
      }
    } catch (err) {
      setResult(`Network error: ${err instanceof Error ? err.message : err}`);
    }
    setBusy(null);
  }

  async function handleSetTier() {
    if (!row) return;
    setBusy("set");
    setResult(null);
    try {
      const res = await fetch("/api/admin/subscriptions/set-tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: targetType,
          target_id: row.id,
          tier: manualTier,
          status: manualTier === "free" ? null : manualStatus,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setResult(`Error: ${body.error ?? res.statusText}`);
      } else {
        setResult(`Set. New tier: ${body.row.subscription_tier}.`);
        await handleLookup();
      }
    } catch (err) {
      setResult(`Network error: ${err instanceof Error ? err.message : err}`);
    }
    setBusy(null);
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="rounded-2xl p-5 space-y-3" style={SECTION_STYLE}>
        <p
          className="text-[11px] font-black tracking-widest uppercase"
          style={{ color: "#00F0FF" }}
        >
          1. Look up
        </p>

        <div className="flex gap-2">
          {(["user", "brand"] as TargetType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTargetType(t);
                setRow(null);
                setLookupError(null);
                setResult(null);
              }}
              className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{
                background:
                  targetType === t
                    ? "linear-gradient(135deg, #39FF14, #00F0FF)"
                    : "rgba(255,255,255,0.06)",
                color: targetType === t ? "#0A0A0A" : "rgba(255,255,255,0.6)",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            targetType === "user"
              ? "username OR user UUID"
              : "brand slug OR exact name"
          }
          className="w-full rounded-xl px-3 py-2 text-sm"
          style={{
            background: "rgba(10,0,20,0.6)",
            border: "1px solid rgba(45,10,78,0.9)",
            color: "#fff",
          }}
        />

        <button
          type="button"
          onClick={handleLookup}
          disabled={busy !== null}
          className="w-full rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #39FF14, #00F0FF)",
            color: "#0A0A0A",
          }}
        >
          {busy === "lookup" ? "Looking up…" : "Look up"}
        </button>

        {lookupError && (
          <p className="text-xs" style={{ color: "#FF00E5" }}>
            {lookupError}
          </p>
        )}
      </div>

      {/* Result + actions */}
      {row && (
        <>
          <div className="rounded-2xl p-5 space-y-2" style={SECTION_STYLE}>
            <p
              className="text-[11px] font-black tracking-widest uppercase"
              style={{ color: "#00F0FF" }}
            >
              Current state
            </p>
            <p className="text-sm font-bold text-white">{row.label}</p>
            <p className="text-xs text-slime-muted">
              id: <code>{row.id}</code>
            </p>
            <p className="text-xs">
              tier:{" "}
              <span
                style={{
                  color:
                    row.subscription_tier === "pro" ? "#39FF14" : "#888",
                }}
              >
                {row.subscription_tier ?? "(null)"}
              </span>{" "}
              · status:{" "}
              <span style={{ color: "#00F0FF" }}>
                {row.subscription_status ?? "(null)"}
              </span>
            </p>
            <p className="text-xs text-slime-muted">
              period_end: {row.subscription_current_period_end ?? "(null)"}
            </p>
            <p className="text-xs text-slime-muted">
              stripe_customer_id: {row.stripe_customer_id ?? "(null)"}
            </p>
          </div>

          {/* T103 sync */}
          <div className="rounded-2xl p-5 space-y-3" style={SECTION_STYLE}>
            <p
              className="text-[11px] font-black tracking-widest uppercase"
              style={{ color: "#00F0FF" }}
            >
              2a. Sync from Stripe (T103)
            </p>
            <p className="text-xs text-slime-muted leading-relaxed">
              Pulls the authoritative subscription state from Stripe and
              overwrites this row. Use when the webhook drifted.
            </p>
            <button
              type="button"
              onClick={handleSyncFromStripe}
              disabled={busy !== null || !row.stripe_customer_id}
              className="w-full rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-50"
              style={{
                background: "rgba(0,240,255,0.15)",
                border: "1px solid rgba(0,240,255,0.4)",
                color: "#00F0FF",
              }}
            >
              {busy === "sync"
                ? "Syncing…"
                : row.stripe_customer_id
                  ? "Sync now"
                  : "No stripe_customer_id"}
            </button>
          </div>

          {/* T102 manual override */}
          <div className="rounded-2xl p-5 space-y-3" style={SECTION_STYLE}>
            <p
              className="text-[11px] font-black tracking-widest uppercase"
              style={{ color: "#FF00E5" }}
            >
              2b. Set tier manually (T102)
            </p>
            <p className="text-xs text-slime-muted leading-relaxed">
              Direct DB write, bypasses Stripe. Use for QA / fresh account
              cycles. Warning: if the customer has a real live Stripe sub,
              the next webhook event will drift the row back.
            </p>
            <div className="flex gap-2">
              <select
                value={manualTier}
                onChange={(e) =>
                  setManualTier(e.target.value as "free" | "pro")
                }
                className="flex-1 rounded-xl px-3 py-2 text-sm"
                style={{
                  background: "rgba(10,0,20,0.6)",
                  border: "1px solid rgba(45,10,78,0.9)",
                  color: "#fff",
                }}
              >
                <option value="free">free</option>
                <option value="pro">pro</option>
              </select>
              {manualTier === "pro" && (
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value)}
                  className="flex-1 rounded-xl px-3 py-2 text-sm"
                  style={{
                    background: "rgba(10,0,20,0.6)",
                    border: "1px solid rgba(45,10,78,0.9)",
                    color: "#fff",
                  }}
                >
                  <option value="active">active</option>
                  <option value="trialing">trialing</option>
                  <option value="past_due">past_due</option>
                  <option value="canceled">canceled</option>
                </select>
              )}
            </div>
            <button
              type="button"
              onClick={handleSetTier}
              disabled={busy !== null}
              className="w-full rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-50"
              style={{
                background: "rgba(255,0,229,0.15)",
                border: "1px solid rgba(255,0,229,0.4)",
                color: "#FF00E5",
              }}
            >
              {busy === "set" ? "Setting…" : "Set tier now"}
            </button>
          </div>

          {result && (
            <div
              className="rounded-2xl p-4 text-xs"
              style={{
                background: result.startsWith("Error")
                  ? "rgba(239,68,68,0.1)"
                  : "rgba(57,255,20,0.08)",
                border: `1px solid ${
                  result.startsWith("Error")
                    ? "rgba(239,68,68,0.4)"
                    : "rgba(57,255,20,0.35)"
                }`,
                color: result.startsWith("Error") ? "#f87171" : "#39FF14",
              }}
            >
              {result}
            </div>
          )}
        </>
      )}
    </div>
  );
}

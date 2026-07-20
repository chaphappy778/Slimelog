// apps/web/components/collection/CareCardListClient.tsx
//
// T125 phase 2 — Pro-tier interactive care package editor.
// Renders per-slime cards with cadence picker + care notes textarea
// + recent-actions strip. Handles save via server actions.
//
// Aggregate strip at top shows this-month care activity.
//
// Design polish handled separately (T188 Part 4). Layout here is
// functional so Design can align to actual code paths.

"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import type {
  CareCardRow,
  CareAggregate,
} from "@/app/collection/care/page";
import {
  setLogAgingInterval,
  setLogCarePlanNotes,
} from "@/lib/aging-actions";
import { SLIME_BASE_TYPE_LABELS } from "@/lib/types";

interface Props {
  initialCards: CareCardRow[];
  aggregate: CareAggregate;
  highlightId: string | null;
}

// Preset cadence chip options. "Custom" opens a numeric input.
const CADENCE_PRESETS: { label: string; days: number }[] = [
  { label: "Weekly", days: 7 },
  { label: "Bi-weekly", days: 14 },
  { label: "Monthly", days: 30 },
  { label: "45 days", days: 45 },
  { label: "60 days", days: 60 },
  { label: "90 days", days: 90 },
];

export default function CareCardListClient({
  initialCards,
  aggregate,
  highlightId,
}: Props) {
  const [cards, setCards] = useState(initialCards);
  const highlightRef = useRef<HTMLDivElement | null>(null);

  // Scroll the highlighted card into view once on mount (from
  // /slimes/[id] deep-links).
  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [highlightId]);

  function updateCard(id: string, updates: Partial<CareCardRow>) {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
  }

  if (cards.length === 0) {
    return (
      <div className="px-4">
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: "rgba(45,10,78,0.20)",
            border: "1px solid rgba(0,240,255,0.35)",
          }}
        >
          <p
            className="text-lg mb-2"
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 800,
              color: "#FFFFFF",
            }}
          >
            No on-shelf slimes yet.
          </p>
          <p
            className="text-sm mb-4"
            style={{ color: "rgba(245,245,245,0.55)" }}
          >
            Log a slime and set it as On my shelf to build a care
            plan.
          </p>
          <Link
            href="/log"
            className="inline-block rounded-full"
            style={{
              padding: "10px 22px",
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 700,
              fontSize: 13,
              color: "#0A0A0A",
              background: "linear-gradient(135deg, #39FF14, #00F0FF)",
            }}
          >
            Log a slime
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 flex flex-col gap-6">
      {/* Aggregate strip */}
      <AggregateStrip aggregate={aggregate} />

      {/* Per-slime cards */}
      <div className="flex flex-col gap-4">
        {cards.map((card) => (
          <CareCard
            key={card.id}
            card={card}
            highlighted={card.id === highlightId}
            highlightRef={
              card.id === highlightId ? highlightRef : undefined
            }
            onUpdate={(updates) => updateCard(card.id, updates)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Aggregate strip ──────────────────────────────────────────────────

function AggregateStrip({ aggregate }: { aggregate: CareAggregate }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background:
          "linear-gradient(135deg, rgba(57,255,20,0.06), rgba(0,240,255,0.06))",
        border: "1px solid rgba(57,255,20,0.35)",
      }}
    >
      <p
        className="text-[11px] font-black tracking-widest uppercase mb-3"
        style={{ color: "#39FF14" }}
      >
        This month
      </p>
      <div className="flex flex-wrap gap-6">
        <Stat
          value={aggregate.actions_this_month}
          label={
            aggregate.actions_this_month === 1
              ? "care action logged"
              : "care actions logged"
          }
        />
        <Stat
          value={aggregate.slimes_cared_for_this_month}
          label={
            aggregate.slimes_cared_for_this_month === 1
              ? "slime cared for"
              : "slimes cared for"
          }
        />
        {aggregate.top_product && (
          <div>
            <p
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 900,
                fontSize: 20,
                color: "#00F0FF",
                lineHeight: 1,
              }}
            >
              {aggregate.top_product.display}
            </p>
            <p
              className="text-[11px] mt-1"
              style={{ color: "rgba(245,245,245,0.55)" }}
            >
              Your top product ({aggregate.top_product.count} uses)
            </p>
          </div>
        )}
      </div>
      <p
        className="mt-4 text-[11px]"
        style={{ color: "rgba(255,210,74,0.85)" }}
      >
        Coming soon: auto-refill subscriptions for your most-used
        products when the SlimeLog shop launches.
      </p>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p
        className="tabular-nums"
        style={{
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 900,
          fontSize: 28,
          color: "#FFFFFF",
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      <p
        className="text-[11px] mt-1"
        style={{ color: "rgba(245,245,245,0.55)" }}
      >
        {label}
      </p>
    </div>
  );
}

// ─── Per-slime care card ──────────────────────────────────────────────

function CareCard({
  card,
  highlighted,
  highlightRef,
  onUpdate,
}: {
  card: CareCardRow;
  highlighted: boolean;
  highlightRef?: React.RefObject<HTMLDivElement | null> | undefined;
  onUpdate: (updates: Partial<CareCardRow>) => void;
}) {
  // Cast to work around React 19 ref typing narrowing — RefObject<T|null>
  // is functionally identical to LegacyRef<T> for this use.
  const rowRef = highlightRef as
    | React.LegacyRef<HTMLDivElement>
    | undefined;
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(card.care_plan_notes ?? "");
  const [customDays, setCustomDays] = useState<string>(
    card.aging_interval_days ? String(card.aging_interval_days) : "",
  );
  const [showCustom, setShowCustom] = useState(
    card.aging_interval_days !== null &&
      !CADENCE_PRESETS.some((p) => p.days === card.aging_interval_days),
  );

  const currentInterval = card.aging_interval_days;
  const baseTypeLabel = card.base_type
    ? SLIME_BASE_TYPE_LABELS[card.base_type]
    : null;

  function saveInterval(days: number | null) {
    setError(null);
    onUpdate({ aging_interval_days: days });
    startSaving(async () => {
      const result = await setLogAgingInterval(card.id, days);
      if (!result.ok) {
        setError(result.error);
        onUpdate({ aging_interval_days: card.aging_interval_days });
      }
    });
  }

  function saveNotes() {
    setError(null);
    const trimmed = notes.trim() || null;
    startSaving(async () => {
      const result = await setLogCarePlanNotes(card.id, trimmed);
      if (!result.ok) {
        setError(result.error);
      } else {
        onUpdate({ care_plan_notes: trimmed });
      }
    });
  }

  return (
    <div
      ref={rowRef}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(45,10,78,0.30)",
        border: `1px solid ${
          highlighted ? "rgba(57,255,20,0.55)" : "rgba(45,10,78,0.7)"
        }`,
        boxShadow: highlighted
          ? "0 0 24px rgba(57,255,20,0.20)"
          : "none",
      }}
    >
      {/* Header row: photo + name + brand + base type + link out */}
      <div className="flex items-center gap-3 p-4 border-b border-white/5">
        <Link
          href={`/slimes/${card.id}`}
          className="shrink-0 rounded-lg overflow-hidden"
          style={{
            width: 56,
            height: 56,
            background: "rgba(45,10,78,0.5)",
            border: "1px solid rgba(45,10,78,0.7)",
          }}
        >
          {card.image_url ? (
            <Image
              src={card.image_url}
              alt={card.slime_name ?? "Slime"}
              width={56}
              height={56}
              className="object-cover w-full h-full"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,240,255,0.35), rgba(255,0,229,0.35))",
              }}
            />
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={`/slimes/${card.id}`}
            className="block truncate"
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 800,
              fontSize: 16,
              color: "#FFFFFF",
            }}
          >
            {card.slime_name || "Unnamed slime"}
          </Link>
          <p
            className="text-xs truncate mt-0.5"
            style={{ color: "rgba(245,245,245,0.55)" }}
          >
            {[card.brand_name_raw, baseTypeLabel]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Cadence editor */}
        <div>
          <p
            className="text-[11px] font-black tracking-widest uppercase mb-2"
            style={{ color: "#00F0FF" }}
          >
            Check-in cadence
          </p>
          <p
            className="text-xs mb-2"
            style={{ color: "rgba(245,245,245,0.55)" }}
          >
            Recommended for {baseTypeLabel?.toLowerCase() ?? "this base"}:
            every {card.default_interval_days} days
          </p>
          <div className="flex flex-wrap gap-2">
            <CadenceChip
              label="Default"
              active={currentInterval === null && !showCustom}
              onClick={() => {
                setShowCustom(false);
                saveInterval(null);
              }}
              disabled={saving}
            />
            {CADENCE_PRESETS.map((preset) => (
              <CadenceChip
                key={preset.days}
                label={preset.label}
                active={currentInterval === preset.days && !showCustom}
                onClick={() => {
                  setShowCustom(false);
                  saveInterval(preset.days);
                }}
                disabled={saving}
              />
            ))}
            <CadenceChip
              label="Custom"
              active={showCustom}
              onClick={() => setShowCustom(true)}
              disabled={saving}
            />
          </div>
          {showCustom && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                min="1"
                max="365"
                placeholder="e.g. 21"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                className="rounded-lg bg-transparent text-white text-sm px-3 py-2 outline-none"
                style={{
                  border: "1px solid rgba(45,10,78,0.7)",
                  width: 100,
                }}
              />
              <span
                className="text-xs"
                style={{ color: "rgba(245,245,245,0.55)" }}
              >
                days
              </span>
              <button
                type="button"
                onClick={() => {
                  const n = parseInt(customDays, 10);
                  if (!Number.isFinite(n) || n < 1 || n > 365) {
                    setError("Enter a number between 1 and 365.");
                    return;
                  }
                  saveInterval(n);
                }}
                disabled={saving}
                className="rounded-full px-3 py-1.5 text-xs"
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 700,
                  color: "#0A0A0A",
                  background:
                    "linear-gradient(135deg, #39FF14, #00F0FF)",
                }}
              >
                Save
              </button>
            </div>
          )}
        </div>

        {/* Care plan notes */}
        <div>
          <p
            className="text-[11px] font-black tracking-widest uppercase mb-2"
            style={{ color: "#00F0FF" }}
          >
            Care notes
          </p>
          <textarea
            rows={2}
            maxLength={500}
            placeholder="e.g. Add 1 pump contact solution every 2 weeks. Best after 3-day rest."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl bg-transparent text-white text-sm px-3 py-2 outline-none resize-none"
            style={{
              border: "1px solid rgba(45,10,78,0.7)",
            }}
          />
          <div className="flex items-center justify-between mt-1">
            <span
              className="text-[11px]"
              style={{ color: "rgba(245,245,245,0.4)" }}
            >
              {notes.length}/500
            </span>
            {notes !== (card.care_plan_notes ?? "") && (
              <button
                type="button"
                onClick={saveNotes}
                disabled={saving}
                className="rounded-full px-3 py-1 text-[11px]"
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 700,
                  color: "#0A0A0A",
                  background:
                    "linear-gradient(135deg, #39FF14, #00F0FF)",
                }}
              >
                Save notes
              </button>
            )}
          </div>
        </div>

        {/* Recent actions */}
        {card.recent_actions.length > 0 && (
          <div>
            <p
              className="text-[11px] font-black tracking-widest uppercase mb-2"
              style={{ color: "rgba(180,169,196,0.75)" }}
            >
              Recent care
            </p>
            <div className="flex flex-col gap-1.5">
              {card.recent_actions.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between text-xs"
                  style={{ color: "rgba(245,245,245,0.75)" }}
                >
                  <span>
                    {a.product_display ?? a.action_type} —{" "}
                    {relativeTime(a.performed_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div
            className="rounded-xl px-3 py-2 text-xs"
            style={{
              background: "rgba(255,61,110,0.10)",
              border: "1px solid rgba(255,61,110,0.35)",
              color: "#FF7BEB",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function CadenceChip({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full transition-all"
      style={{
        padding: "6px 12px",
        fontFamily: "Montserrat, sans-serif",
        fontWeight: 700,
        fontSize: 12,
        color: active ? "#0A0A0A" : "#00F0FF",
        background: active
          ? "linear-gradient(135deg, #39FF14, #00F0FF)"
          : "rgba(45,10,78,0.5)",
        border: `1px solid ${active ? "#39FF14" : "rgba(0,240,255,0.35)"}`,
        boxShadow: active ? "0 0 10px rgba(57,255,20,0.35)" : "none",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {label}
    </button>
  );
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

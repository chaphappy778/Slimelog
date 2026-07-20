// apps/web/components/collection/AgingListClient.tsx
//
// T125 — client-side renderer for /collection/aging. Three sections
// (Overdue / Warning / Fresh) with per-row actions.
//
// Optimistic UI: when the user taps an action, the row updates
// locally IMMEDIATELY and then fires the server action. On error,
// we revert. Prevents the "did anything happen?" pause between tap
// and server confirmation.

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { AgingLogRow } from "@/app/collection/aging/page";
import {
  snoozeLog,
  setLogAgingEnabled,
  setLogShelfState,
} from "@/lib/aging-actions";
import {
  SLIME_BASE_TYPE_LABELS,
  SLIME_BASE_TYPE_COLORS,
  type SlimeBaseType,
} from "@/lib/types";
// T125 phase 2 (2026-07-20): "Checked" button now opens the
// structured check-in modal instead of firing markLogChecked
// directly. Data-collection lane — every check-in yields structured
// care action rows.
import CareCheckinModal from "@/components/collection/CareCheckinModal";

interface Props {
  overdue: AgingLogRow[];
  warning: AgingLogRow[];
  fresh: AgingLogRow[];
}

export default function AgingListClient({
  overdue,
  warning,
  fresh,
}: Props) {
  // Local copies so optimistic updates can mutate without waiting for
  // the server. On mount we take server-provided snapshots.
  const [rows, setRows] = useState({
    overdue: [...overdue],
    warning: [...warning],
    fresh: [...fresh],
  });
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Any per-row inline UI (adjust-interval popover, error banner)
  // lives in a per-row state map keyed by log id.
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [expandFresh, setExpandFresh] = useState(false);
  // T125 phase 2 (2026-07-20): which log currently has the check-in
  // modal open. `null` = no modal open. Set by handleMarkChecked
  // below (which now opens the modal instead of firing directly).
  const [modalRow, setModalRow] = useState<AgingLogRow | null>(null);

  function bumpError(id: string, msg: string) {
    setRowError((prev) => ({ ...prev, [id]: msg }));
    setTimeout(() => {
      setRowError((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 3500);
  }

  function removeRow(id: string) {
    setRows((prev) => ({
      overdue: prev.overdue.filter((r) => r.id !== id),
      warning: prev.warning.filter((r) => r.id !== id),
      fresh: prev.fresh.filter((r) => r.id !== id),
    }));
  }

  function moveToFresh(row: AgingLogRow) {
    setRows((prev) => ({
      overdue: prev.overdue.filter((r) => r.id !== row.id),
      warning: prev.warning.filter((r) => r.id !== row.id),
      fresh: [{ ...row, aging_state: "fresh", days_since_check: 0 }, ...prev.fresh],
    }));
  }

  // T125 phase 2 (2026-07-20): "Checked" button now opens the
  // structured check-in modal. Modal fires markLogChecked with the
  // full care actions payload on Save. Optimistic move-to-fresh
  // happens after the modal saves successfully via the `onSaved`
  // callback wired below.
  function handleMarkChecked(row: AgingLogRow) {
    setModalRow(row);
  }

  function handleModalSaved(row: AgingLogRow) {
    moveToFresh(row);
    setModalRow(null);
  }

  async function handleSnooze(row: AgingLogRow, days: number) {
    moveToFresh(row);
    startTransition(async () => {
      const result = await snoozeLog(row.id, days);
      if (!result.ok) {
        bumpError(row.id, result.error);
        router.refresh();
      }
    });
  }

  async function handleArchive(row: AgingLogRow) {
    removeRow(row.id);
    startTransition(async () => {
      const result = await setLogShelfState(row.id, "archived");
      if (!result.ok) {
        bumpError(row.id, result.error);
        router.refresh();
      }
    });
  }

  async function handleTurnOff(row: AgingLogRow) {
    removeRow(row.id);
    startTransition(async () => {
      const result = await setLogAgingEnabled(row.id, false);
      if (!result.ok) {
        bumpError(row.id, result.error);
        router.refresh();
      }
    });
  }

  const showEmptyState =
    rows.overdue.length === 0 &&
    rows.warning.length === 0 &&
    rows.fresh.length === 0;

  if (showEmptyState) {
    return (
      <div className="px-4">
        <EmptyState />
      </div>
    );
  }

  return (
    <>
      {modalRow && (
        <CareCheckinModal
          logId={modalRow.id}
          slimeName={modalRow.slime_name}
          onClose={() => setModalRow(null)}
          onSaved={() => handleModalSaved(modalRow)}
        />
      )}
    <div className="px-4 flex flex-col gap-8">
      {rows.overdue.length > 0 && (
        <Section
          label="Overdue"
          accent="#FF3D6E"
          count={rows.overdue.length}
        >
          {rows.overdue.map((row) => (
            <AgingRow
              key={row.id}
              row={row}
              accent="#FF3D6E"
              error={rowError[row.id]}
              onMarkChecked={() => handleMarkChecked(row)}
              onSnooze={(days) => handleSnooze(row, days)}
              onArchive={() => handleArchive(row)}
              onTurnOff={() => handleTurnOff(row)}
              disabled={isPending}
            />
          ))}
        </Section>
      )}

      {rows.warning.length > 0 && (
        <Section
          label="Needs attention soon"
          accent="#FFAE3B"
          count={rows.warning.length}
        >
          {rows.warning.map((row) => (
            <AgingRow
              key={row.id}
              row={row}
              accent="#FFAE3B"
              error={rowError[row.id]}
              onMarkChecked={() => handleMarkChecked(row)}
              onSnooze={(days) => handleSnooze(row, days)}
              onArchive={() => handleArchive(row)}
              onTurnOff={() => handleTurnOff(row)}
              disabled={isPending}
            />
          ))}
        </Section>
      )}

      {rows.fresh.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setExpandFresh((x) => !x)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
            style={{
              background: "rgba(45,10,78,0.20)",
              border: "1px solid rgba(45,10,78,0.55)",
            }}
          >
            <div className="flex items-center gap-3">
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: "#39FF14",
                  boxShadow: "0 0 8px #39FF14",
                }}
              />
              <span
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 800,
                  fontSize: 13,
                  color: "#F5F5F5",
                  letterSpacing: "0.02em",
                }}
              >
                Fresh ({rows.fresh.length})
              </span>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(245,245,245,0.55)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{
                transform: expandFresh ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {expandFresh && (
            <div className="flex flex-col gap-2 mt-2">
              {rows.fresh.map((row) => (
                <AgingRow
                  key={row.id}
                  row={row}
                  accent="#39FF14"
                  error={rowError[row.id]}
                  onMarkChecked={() => handleMarkChecked(row)}
                  onSnooze={(days) => handleSnooze(row, days)}
                  onArchive={() => handleArchive(row)}
                  onTurnOff={() => handleTurnOff(row)}
                  disabled={isPending}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
    </>
  );
}

// ─── Solid-filled state pill (Fresh / Aging / Overdue) ───────────────
// Per Jennifer 2026-07-20 feedback: replaced the inline colored
// status text with a solid-filled pill (green/orange/red)
// borrowed from the Design mockup's category-language row.

function StatePill({
  state,
  label,
}: {
  state: "fresh" | "warning" | "overdue";
  label: string;
}) {
  const bg =
    state === "overdue"
      ? "#FF3D6E"
      : state === "warning"
        ? "#FFAE3B"
        : "#39FF14";
  return (
    <span
      className="inline-flex items-center rounded-full"
      style={{
        padding: "3px 10px",
        background: bg,
        color: "#0A0A0A",
        fontFamily: "Montserrat, sans-serif",
        fontWeight: 800,
        fontSize: 11,
        letterSpacing: "0.02em",
        boxShadow: `0 0 10px ${bg}55`,
      }}
    >
      {label}
    </span>
  );
}

// ─── Section header ───────────────────────────────────────────────────

function Section({
  label,
  accent,
  count,
  children,
}: {
  label: string;
  accent: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: 5,
            background: accent,
            boxShadow: `0 0 12px ${accent}88`,
          }}
        />
        <p
          className="section-label"
          style={{
            color: accent,
            margin: 0,
          }}
        >
          {label}
        </p>
        <span
          style={{
            color: "rgba(245,245,245,0.55)",
            fontSize: 13,
          }}
        >
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

// ─── Aging row ─────────────────────────────────────────────────────────

function AgingRow({
  row,
  accent,
  error,
  onMarkChecked,
  onArchive,
  disabled,
}: {
  row: AgingLogRow;
  accent: string;
  error?: string;
  onMarkChecked: () => void;
  onSnooze: (days: number) => void; // retained in signature for parent; not used here anymore
  onArchive: () => void;
  onTurnOff: () => void; // retained in signature for parent; not used here anymore
  disabled: boolean;
}) {
  // Per Jennifer 2026-07-20 feedback: dropped the sub-line
  // (brand name · base type — was cluttering the card) and the
  // three-dot menu (snooze + turn-off now covered by the global
  // Settings toggle). Photo fallback now uses the slime's
  // base-type signature gradient so the card visually reads like
  // other slime surfaces instead of introducing a new accent
  // gradient per-row. Solid-filled state pill (green/orange/red)
  // replaces the inline status text.
  const daysDelta = row.days_since_check - row.effective_interval_days;

  // State pill copy — short, action-focused.
  const stateLabel =
    row.aging_state === "overdue"
      ? `Overdue · ${daysDelta}d`
      : row.aging_state === "warning"
        ? `Aging · ${Math.max(0, -daysDelta)}d`
        : `Fresh · ${row.days_since_check}d`;

  // Fallback gradient — uses the slime's base-type accent color
  // pulled from the shared SLIME_BASE_TYPE_COLORS palette. Same
  // gradient the /discover type carousel uses so cards feel
  // consistent across surfaces.
  const baseAccent = row.base_type
    ? (SLIME_BASE_TYPE_COLORS[row.base_type as SlimeBaseType]?.text ??
      "#00F0FF")
    : "#00F0FF";

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(45,10,78,0.25)",
        border: `1px solid ${accent}55`,
        boxShadow:
          row.aging_state === "overdue"
            ? `0 0 20px ${accent}22`
            : "none",
      }}
    >
      <div className="flex items-center gap-3 p-3">
        <Link
          href={`/slimes/${row.id}`}
          className="shrink-0 rounded-lg overflow-hidden"
          style={{
            width: 56,
            height: 56,
            background: "rgba(45,10,78,0.5)",
            border: `1px solid ${baseAccent}55`,
          }}
        >
          {row.image_url ? (
            <Image
              src={row.image_url}
              alt={row.slime_name ?? "Slime"}
              width={56}
              height={56}
              className="object-cover w-full h-full"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${baseAccent}66, rgba(45,10,78,0.5))`,
              }}
              aria-hidden="true"
            />
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <Link
            href={`/slimes/${row.id}`}
            className="block truncate"
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 700,
              fontSize: 15,
              color: "#F5F5F5",
            }}
          >
            {row.slime_name || "Unnamed slime"}
          </Link>
          <div className="mt-1.5">
            <StatePill state={row.aging_state} label={stateLabel} />
          </div>
        </div>

        {/* Vertical stack: Checked (green filled) + Archive (orange
            outlined). Snooze + Turn-off dropped per Jennifer's spec
            — reminders can be turned off globally in Settings. */}
        <div className="shrink-0 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={onMarkChecked}
            disabled={disabled}
            className="rounded-full transition-all"
            style={{
              padding: "6px 14px",
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 800,
              fontSize: 11,
              background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              color: "#0A0A0A",
              border: "none",
              opacity: disabled ? 0.6 : 1,
              cursor: disabled ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              boxShadow: "0 0 10px rgba(57,255,20,0.35)",
            }}
          >
            Checked
          </button>
          <button
            type="button"
            onClick={onArchive}
            disabled={disabled}
            className="rounded-full transition-all"
            style={{
              padding: "6px 14px",
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 700,
              fontSize: 11,
              background: "transparent",
              color: "#FFAE3B",
              border: "1px solid rgba(255,174,59,0.55)",
              opacity: disabled ? 0.6 : 1,
              cursor: disabled ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Archive
          </button>
        </div>
      </div>

      {error && (
        <div
          className="px-3 py-2 text-xs"
          style={{
            background: "rgba(255,61,110,0.10)",
            color: "#FF7BEB",
            borderTop: "1px solid rgba(255,61,110,0.35)",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Action chip in the row's expand menu ─────────────────────────────

function ActionChip({
  label,
  onClick,
  disabled,
  variant = "default",
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  variant?: "default" | "warn" | "muted";
}) {
  const color =
    variant === "warn"
      ? "#FFAE3B"
      : variant === "muted"
        ? "rgba(245,245,245,0.6)"
        : "#00F0FF";
  const border =
    variant === "warn"
      ? "rgba(255,174,59,0.55)"
      : variant === "muted"
        ? "rgba(45,10,78,0.7)"
        : "rgba(0,240,255,0.55)";
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
        fontSize: 11,
        color,
        background: "transparent",
        border: `1px solid ${border}`,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      className="rounded-2xl p-8 text-center"
      style={{
        background: "rgba(45,10,78,0.20)",
        border: "1px solid rgba(57,255,20,0.35)",
        boxShadow: "0 0 24px rgba(57,255,20,0.15)",
      }}
    >
      <div
        style={{
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 900,
          fontSize: 42,
          color: "#39FF14",
          letterSpacing: "-0.02em",
        }}
      >
        ✨
      </div>
      <h3
        className="mt-3"
        style={{
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 800,
          fontSize: 20,
          color: "#F5F5F5",
        }}
      >
        Your shelf is fresh
      </h3>
      <p
        className="mt-2"
        style={{
          color: "rgba(245,245,245,0.55)",
          fontSize: 14,
          lineHeight: 1.5,
          maxWidth: 320,
          margin: "8px auto 0",
        }}
      >
        No slimes are due for a check-in right now. We&apos;ll flag
        them here as they age.
      </p>
      <Link
        href="/collection"
        className="inline-block mt-5 rounded-full"
        style={{
          padding: "10px 22px",
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 700,
          fontSize: 13,
          color: "#0A0A0A",
          background: "linear-gradient(135deg, #39FF14, #00F0FF)",
          border: "none",
        }}
      >
        Back to your collection
      </Link>
    </div>
  );
}

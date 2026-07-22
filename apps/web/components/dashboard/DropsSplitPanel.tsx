// apps/web/components/dashboard/DropsSplitPanel.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { SLIME_BASE_TYPE_LABELS } from "@/lib/types";
import type { SlimeBaseType } from "@/lib/types";
import { ImageUpload } from "@/components/ImageUpload";

// ─── Types ────────────────────────────────────────────────────────────────────

type DropStatus = "announced" | "live" | "sold_out" | "restocked" | "cancelled";

interface Drop {
  id: string;
  name: string;
  description: string | null;
  drop_at: string | null;
  status: DropStatus;
  shop_url: string | null;
  cover_image_url: string | null;
  recurrence_pattern: RecurrencePattern | null;
  parent_drop_id: string | null;
  drop_type: "new_drop" | "restock" | null;
  discount_code: string | null;
  free_shipping_threshold: number | null;
}

interface CatalogSlime {
  id: string;
  name: string;
  base_type: SlimeBaseType;
  colors: string[] | null;
  image_url: string | null;
}

interface DropSlimeEntry {
  slime_id: string | null;
  name: string;
  base_type: SlimeBaseType | "";
  price: string;
  scent_notes: string;
  image_url: string | null;
}

interface RecurrencePattern {
  frequency: "weekly" | "biweekly" | "monthly";
  day_of_week: number | null;
  day_of_month: number | null;
  hour: number;
  minute: number;
  end_type: "never" | "after" | "on_date";
  end_after: number | null;
  end_date: string | null;
}

interface DropsSplitPanelProps {
  brandId: string;
  userId: string;
  initialDrops: Drop[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<
  DropStatus,
  { color: string; bg: string; border: string; label: string }
> = {
  announced: {
    color: "#22d3ee",
    bg: "rgba(34,211,238,0.1)",
    border: "rgba(34,211,238,0.25)",
    label: "Announced",
  },
  live: {
    color: "#39FF14",
    bg: "rgba(57,255,20,0.1)",
    border: "rgba(57,255,20,0.25)",
    label: "Live",
  },
  sold_out: {
    color: "#8f83b0",
    bg: "rgba(255,255,255,0.03)",
    border: "rgba(150,110,240,0.18)",
    label: "Sold Out",
  },
  restocked: {
    color: "#4488FF",
    bg: "rgba(68,136,255,0.1)",
    border: "rgba(68,136,255,0.25)",
    label: "Restocked",
  },
  cancelled: {
    color: "#FF3D6E",
    bg: "rgba(255,61,110,0.1)",
    border: "rgba(255,61,110,0.25)",
    label: "Cancelled",
  },
};

const NEXT_STATUS: Partial<
  Record<DropStatus, { status: DropStatus; label: string }[]>
> = {
  announced: [
    { status: "live", label: "Go Live" },
    { status: "cancelled", label: "Cancel" },
  ],
  live: [{ status: "sold_out", label: "Mark Sold Out" }],
  sold_out: [{ status: "restocked", label: "Restock" }],
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);

const DEFAULT_RECURRENCE: RecurrencePattern = {
  frequency: "weekly",
  day_of_week: 5,
  day_of_month: null,
  hour: 12,
  minute: 0,
  end_type: "never",
  end_after: null,
  end_date: null,
};

// ─── Shared style helpers ─────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:ring-1 focus:ring-[#ff2bd6]/40 placeholder:text-[#6b6180]";
const inputStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(150,110,240,0.24)",
  fontFamily: "Inter, sans-serif",
};
const selectStyle = { ...inputStyle, appearance: "none" as const };

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block text-xs font-bold uppercase tracking-widest mb-1.5"
      style={{
        color: "#8f83b0",
        fontFamily: "Montserrat, sans-serif",
      }}
    >
      {children}
    </label>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "TBA";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─── DateTimePicker ───────────────────────────────────────────────────────────

interface DateTimePickerProps {
  value: string;
  onChange: (iso: string) => void;
}

function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const parsed = value ? new Date(value) : null;
  const [month, setMonth] = useState(
    parsed ? parsed.getMonth() : new Date().getMonth(),
  );
  const [day, setDay] = useState(parsed ? parsed.getDate() : 1);
  const [year, setYear] = useState(
    parsed ? parsed.getFullYear() : new Date().getFullYear(),
  );
  const [hour, setHour] = useState(parsed ? parsed.getHours() % 12 || 12 : 12);
  const [minute, setMinute] = useState(
    parsed ? Math.round(parsed.getMinutes() / 15) * 15 : 0,
  );
  const [ampm, setAmpm] = useState<"AM" | "PM">(
    parsed ? (parsed.getHours() >= 12 ? "PM" : "AM") : "PM",
  );

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear + i);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const emit = (
    m: number,
    d: number,
    y: number,
    h: number,
    min: number,
    ap: "AM" | "PM",
  ) => {
    const h24 = ap === "PM" ? (h === 12 ? 12 : h + 12) : h === 12 ? 0 : h;
    onChange(new Date(y, m, d, h24, min).toISOString());
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <select
            value={month}
            onChange={(e) => {
              const v = Number(e.target.value);
              setMonth(v);
              emit(v, day, year, hour, minute, ampm);
            }}
            className="w-full rounded-lg px-2 py-2 text-sm text-white outline-none"
            style={selectStyle}
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i} style={{ background: "#0F0A1A" }}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div style={{ width: 72 }}>
          <select
            value={day}
            onChange={(e) => {
              const v = Number(e.target.value);
              setDay(v);
              emit(month, v, year, hour, minute, ampm);
            }}
            className="w-full rounded-lg px-2 py-2 text-sm text-white outline-none"
            style={selectStyle}
          >
            {days.map((d) => (
              <option key={d} value={d} style={{ background: "#0F0A1A" }}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div style={{ width: 88 }}>
          <select
            value={year}
            onChange={(e) => {
              const v = Number(e.target.value);
              setYear(v);
              emit(month, day, v, hour, minute, ampm);
            }}
            className="w-full rounded-lg px-2 py-2 text-sm text-white outline-none"
            style={selectStyle}
          >
            {years.map((y) => (
              <option key={y} value={y} style={{ background: "#0F0A1A" }}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <select
            value={hour}
            onChange={(e) => {
              const v = Number(e.target.value);
              setHour(v);
              emit(month, day, year, v, minute, ampm);
            }}
            className="w-full rounded-lg px-2 py-2 text-sm text-white outline-none"
            style={selectStyle}
          >
            {HOURS.map((h) => (
              <option key={h} value={h} style={{ background: "#0F0A1A" }}>
                {h}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <select
            value={minute}
            onChange={(e) => {
              const v = Number(e.target.value);
              setMinute(v);
              emit(month, day, year, hour, v, ampm);
            }}
            className="w-full rounded-lg px-2 py-2 text-sm text-white outline-none"
            style={selectStyle}
          >
            {[0, 15, 30, 45].map((m) => (
              <option key={m} value={m} style={{ background: "#0F0A1A" }}>
                {String(m).padStart(2, "0")}
              </option>
            ))}
          </select>
        </div>
        <div style={{ width: 80 }}>
          <select
            value={ampm}
            onChange={(e) => {
              const v = e.target.value as "AM" | "PM";
              setAmpm(v);
              emit(month, day, year, hour, minute, v);
            }}
            className="w-full rounded-lg px-2 py-2 text-sm text-white outline-none"
            style={selectStyle}
          >
            <option value="AM" style={{ background: "#0F0A1A" }}>
              AM
            </option>
            <option value="PM" style={{ background: "#0F0A1A" }}>
              PM
            </option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── RecurrenceBuilder ────────────────────────────────────────────────────────

interface RecurrenceBuilderProps {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  pattern: RecurrencePattern;
  onChange: (p: RecurrencePattern) => void;
}

function RecurrenceBuilder({
  enabled,
  onToggle,
  pattern,
  onChange,
}: RecurrenceBuilderProps) {
  const set = <K extends keyof RecurrencePattern>(
    k: K,
    v: RecurrencePattern[K],
  ) => onChange({ ...pattern, [k]: v });

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid rgba(150,110,240,0.18)" }}
    >
      <button
        type="button"
        onClick={() => onToggle(!enabled)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold transition-all"
        style={{
          background: enabled ? "rgba(255,43,214,0.08)" : "rgba(255,255,255,0.03)",
        }}
      >
        <span
          style={{
            color: enabled ? "#ff2bd6" : "rgba(245,245,245,0.5)",
            fontFamily: "Montserrat, sans-serif",
          }}
        >
          Recurring Drop
        </span>
        <div
          className="w-10 h-5 rounded-full relative transition-all"
          style={{ background: enabled ? "#ff2bd6" : "rgba(150,110,240,0.18)" }}
        >
          <div
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
            style={{ left: enabled ? "22px" : "2px" }}
          />
        </div>
      </button>
      {enabled && (
        <div
          className="px-4 py-4 space-y-4"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          <div>
            <FormLabel>Frequency</FormLabel>
            <div className="flex gap-2">
              {(["weekly", "biweekly", "monthly"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => set("frequency", f)}
                  className="flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all"
                  style={{
                    background:
                      pattern.frequency === f
                        ? "rgba(255,43,214,0.15)"
                        : "rgba(255,255,255,0.03)",
                    border: `1px solid ${pattern.frequency === f ? "rgba(255,43,214,0.4)" : "rgba(150,110,240,0.18)"}`,
                    color:
                      pattern.frequency === f
                        ? "#ff2bd6"
                        : "rgba(245,245,245,0.5)",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          {(pattern.frequency === "weekly" ||
            pattern.frequency === "biweekly") && (
            <div>
              <FormLabel>Day of Week</FormLabel>
              <select
                value={pattern.day_of_week ?? 5}
                onChange={(e) => set("day_of_week", Number(e.target.value))}
                className={inputClass}
                style={selectStyle}
              >
                {DAYS_OF_WEEK.map((d, i) => (
                  <option key={i} value={i} style={{ background: "#0F0A1A" }}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}
          {pattern.frequency === "monthly" && (
            <div>
              <FormLabel>Day of Month</FormLabel>
              <select
                value={pattern.day_of_month ?? 1}
                onChange={(e) => set("day_of_month", Number(e.target.value))}
                className={inputClass}
                style={selectStyle}
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d} style={{ background: "#0F0A1A" }}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <FormLabel>Ends</FormLabel>
            <div className="flex gap-2 mb-3">
              {(["never", "after", "on_date"] as const).map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => set("end_type", e)}
                  className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background:
                      pattern.end_type === e
                        ? "rgba(34,211,238,0.12)"
                        : "rgba(255,255,255,0.03)",
                    border: `1px solid ${pattern.end_type === e ? "rgba(34,211,238,0.35)" : "rgba(150,110,240,0.18)"}`,
                    color:
                      pattern.end_type === e
                        ? "#22d3ee"
                        : "rgba(245,245,245,0.5)",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  {e === "never"
                    ? "Never"
                    : e === "after"
                      ? "After"
                      : "On Date"}
                </button>
              ))}
            </div>
            {pattern.end_type === "after" && (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={pattern.end_after ?? 4}
                  onChange={(e) => set("end_after", Number(e.target.value))}
                  className="w-24 rounded-lg px-3 py-2 text-sm text-white outline-none"
                  style={inputStyle}
                />
                <span
                  className="text-sm"
                  style={{ color: "rgba(245,245,245,0.5)" }}
                >
                  occurrences
                </span>
              </div>
            )}
            {pattern.end_type === "on_date" && (
              <input
                type="date"
                value={pattern.end_date ?? ""}
                onChange={(e) => set("end_date", e.target.value)}
                className={inputClass}
                style={{ ...inputStyle, colorScheme: "dark" }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CatalogPanel — RIGHT column ──────────────────────────────────────────────

interface CatalogPanelProps {
  brandId: string;
  attachedIds: Set<string>;
  onAttach: (slime: CatalogSlime) => void;
  onAddNew: (slimeData: {
    name: string;
    base_type: SlimeBaseType;
  }) => Promise<CatalogSlime | null>;
  isActive: boolean;
  dropType: "new_drop" | "restock";
}

function CatalogPanel({
  brandId,
  attachedIds,
  onAttach,
  onAddNew,
  isActive,
  dropType,
}: CatalogPanelProps) {
  const supabase = createClient();
  const [brandSlimes, setBrandSlimes] = useState<CatalogSlime[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<SlimeBaseType | "all">("all");
  const [showAddNew, setShowAddNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<SlimeBaseType>("butter");
  const [addingNew, setAddingNew] = useState(false);

  useEffect(() => {
    supabase
      .from("slimes")
      .select("id, name, base_type, colors, image_url")
      .eq("brand_id", brandId)
      .eq("is_brand_official", true)
      .order("name")
      .then(({ data }: { data: CatalogSlime[] | null }) => {
        setBrandSlimes(data ?? []);
      });
  }, [brandId]); // eslint-disable-line

  const presentTypes = Array.from(new Set(brandSlimes.map((s) => s.base_type)));

  const available = brandSlimes.filter((s) => {
    if (attachedIds.has(s.id)) return false;
    if (typeFilter !== "all" && s.base_type !== typeFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const handleAddNew = async () => {
    if (!newName.trim()) return;
    setAddingNew(true);
    const result = await onAddNew({ name: newName.trim(), base_type: newType });
    if (result) {
      setBrandSlimes((prev) => [...prev, result]);
      setNewName("");
      setNewType("butter");
      setShowAddNew(false);
    }
    setAddingNew(false);
  };

  const panelOpacity = isActive ? 1 : 0.4;

  return (
    <div
      className="flex flex-col h-full transition-opacity duration-200"
      style={{
        opacity: panelOpacity,
        borderLeft: "1px solid rgba(150,110,240,0.18)",
        pointerEvents: isActive ? "auto" : "none",
      }}
    >
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(150,110,240,0.14)" }}
      >
        <p
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: "#22d3ee", fontFamily: "Montserrat, sans-serif" }}
        >
          {dropType === "restock"
            ? "Select Slimes to Restock"
            : "Brand Catalog"}
        </p>
        <input
          className={inputClass}
          style={{ ...inputStyle, marginBottom: 8 }}
          placeholder="Search slimes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {presentTypes.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-all"
              style={{
                background:
                  typeFilter === "all"
                    ? "rgba(34,211,238,0.15)"
                    : "rgba(255,255,255,0.03)",
                border: `1px solid ${typeFilter === "all" ? "rgba(34,211,238,0.4)" : "rgba(150,110,240,0.14)"}`,
                color:
                  typeFilter === "all" ? "#22d3ee" : "#8f83b0",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              All
            </button>
            {presentTypes.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t === typeFilter ? "all" : t)}
                className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-all"
                style={{
                  background:
                    typeFilter === t
                      ? "rgba(34,211,238,0.15)"
                      : "rgba(255,255,255,0.03)",
                  border: `1px solid ${typeFilter === t ? "rgba(34,211,238,0.4)" : "rgba(150,110,240,0.14)"}`,
                  color: typeFilter === t ? "#22d3ee" : "#8f83b0",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {SLIME_BASE_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Catalog list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
        {available.length === 0 && !showAddNew && (
          <p
            className="text-xs text-center py-6"
            style={{
              color: "#6b6180",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {brandSlimes.length === 0
              ? "No slimes in catalog yet"
              : attachedIds.size > 0 && available.length === 0
                ? "All catalog slimes are in this drop"
                : "No slimes match"}
          </p>
        )}
        {available.map((slime) => (
          <div
            key={slime.id}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(150,110,240,0.16)",
            }}
          >
            <div className="min-w-0 mr-2">
              <p
                className="text-sm font-medium text-white truncate"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {slime.name}
              </p>
              <p
                className="text-[11px]"
                style={{ color: "#8f83b0" }}
              >
                {SLIME_BASE_TYPE_LABELS[slime.base_type]}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onAttach(slime)}
              className="flex-shrink-0 text-xs px-2.5 py-1 rounded-md transition-all"
              style={{
                color: "#ff2bd6",
                background: "rgba(255,43,214,0.08)",
                border: "1px solid rgba(255,43,214,0.25)",
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 700,
              }}
            >
              {dropType === "restock" ? "Restock" : "+ Add"}
            </button>
          </div>
        ))}
      </div>

      {/* Create New Slime */}
      <div
        className="px-3 pb-4 pt-2 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(150,110,240,0.14)" }}
      >
        {!showAddNew ? (
          <button
            type="button"
            onClick={() => setShowAddNew(true)}
            className="w-full py-2.5 rounded-lg text-xs font-bold transition-all"
            style={{
              color: "#ff2bd6",
              background: "rgba(255,43,214,0.06)",
              border: "1px solid rgba(255,43,214,0.2)",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            + Create New Slime
          </button>
        ) : (
          <div
            className="rounded-xl p-3 space-y-3"
            style={{
              background: "rgba(255,43,214,0.05)",
              border: "1px solid rgba(255,43,214,0.2)",
            }}
          >
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "#ff2bd6", fontFamily: "Montserrat, sans-serif" }}
            >
              New Slime
            </p>
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="Slime name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as SlimeBaseType)}
              className={inputClass}
              style={selectStyle}
            >
              {(
                Object.entries(SLIME_BASE_TYPE_LABELS) as [
                  SlimeBaseType,
                  string,
                ][]
              ).map(([val, label]) => (
                <option key={val} value={val} style={{ background: "#0F0A1A" }}>
                  {label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddNew(false);
                  setNewName("");
                }}
                className="flex-1 py-2 rounded-lg text-xs font-semibold"
                style={{
                  color: "#8f83b0",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(150,110,240,0.18)",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddNew}
                disabled={addingNew || !newName.trim()}
                className="flex-1 py-2 rounded-lg text-xs font-bold disabled:opacity-50 transition-all"
                style={{
                  background: "linear-gradient(135deg, #ff2bd6, #a855f7)",
                  boxShadow: "0 8px 24px -6px rgba(255,43,214,0.5)",
                  color: "#fff",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {addingNew ? "Adding..." : "Add to Drop"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Recurring drop generator ─────────────────────────────────────────────────

function generateRecurringDrops(
  base: {
    name: string;
    description: string;
    shop_url: string;
    brand_id: string;
    announced_by: string;
  },
  startDate: Date,
  pattern: RecurrencePattern,
  parentId: string,
) {
  const results: Array<{
    name: string;
    description: string | null;
    shop_url: string | null;
    brand_id: string;
    announced_by: string;
    drop_at: string;
    status: DropStatus;
    recurrence_pattern: RecurrencePattern;
    parent_drop_id: string;
  }> = [];
  const maxDate = new Date(startDate);
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  let current = new Date(startDate);
  let count = 0;
  const maxOccurrences =
    pattern.end_type === "after" ? (pattern.end_after ?? 4) : 52;
  const endDate =
    pattern.end_type === "on_date" && pattern.end_date
      ? new Date(pattern.end_date)
      : null;

  const advance = (d: Date) => {
    const next = new Date(d);
    if (pattern.frequency === "weekly") next.setDate(next.getDate() + 7);
    else if (pattern.frequency === "biweekly")
      next.setDate(next.getDate() + 14);
    else next.setMonth(next.getMonth() + 1);
    return next;
  };

  current = advance(current);
  while (count < maxOccurrences && current < maxDate) {
    if (endDate && current > endDate) break;
    results.push({
      ...base,
      description: base.description || null,
      shop_url: base.shop_url || null,
      drop_at: current.toISOString(),
      status: "announced" as DropStatus,
      recurrence_pattern: pattern,
      parent_drop_id: parentId,
    });
    current = advance(current);
    count++;
  }
  return results;
}

// ─── Expandable slime rows ────────────────────────────────────────────────────

interface SlimeRowsProps {
  attachedSlimes: DropSlimeEntry[];
  expandedSlimeIdx: number | null;
  setExpandedSlimeIdx: (idx: number | null) => void;
  onUpdateSlime: (idx: number, updates: Partial<DropSlimeEntry>) => void;
  onDetach: (slimeId: string | null, idx: number) => void;
}

function SlimeRows({
  attachedSlimes,
  expandedSlimeIdx,
  setExpandedSlimeIdx,
  onUpdateSlime,
  onDetach,
}: SlimeRowsProps) {
  return (
    <div className="space-y-1.5">
      {attachedSlimes.map((slime, idx) => (
        <div
          key={idx}
          className="rounded-lg overflow-hidden"
          style={{
            background: "rgba(255,43,214,0.07)",
            border: "1px solid rgba(255,43,214,0.18)",
          }}
        >
          <div className="flex items-center justify-between px-3 py-2">
            <button
              type="button"
              className="flex-1 text-left"
              onClick={() =>
                setExpandedSlimeIdx(expandedSlimeIdx === idx ? null : idx)
              }
            >
              <p
                className="text-sm font-medium text-white"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {slime.name || "Unnamed"}
              </p>
              <p
                className="text-[11px]"
                style={{ color: "#8f83b0" }}
              >
                {slime.base_type
                  ? SLIME_BASE_TYPE_LABELS[slime.base_type as SlimeBaseType]
                  : "—"}
                {slime.price ? ` · $${slime.price}` : ""}
              </p>
            </button>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() =>
                  setExpandedSlimeIdx(expandedSlimeIdx === idx ? null : idx)
                }
                className="w-6 h-6 flex items-center justify-center rounded"
                style={{ color: "#8f83b0" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d={
                      expandedSlimeIdx === idx ? "M2 8l4-4 4 4" : "M2 4l4 4 4-4"
                    }
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onDetach(slime.slime_id, idx)}
                className="w-6 h-6 flex items-center justify-center rounded-md flex-shrink-0"
                style={{
                  color: "#FF3D6E",
                  background: "rgba(255,61,110,0.08)",
                  border: "1px solid rgba(255,61,110,0.2)",
                }}
                title="Remove"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M1 1l8 8M9 1L1 9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          {expandedSlimeIdx === idx && (
            <div
              className="px-3 pb-3 space-y-2"
              style={{ borderTop: "1px solid rgba(255,43,214,0.15)" }}
            >
              <div className="pt-2">
                <FormLabel>Name</FormLabel>
                <input
                  type="text"
                  value={slime.name}
                  onChange={(e) => onUpdateSlime(idx, { name: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="Slime name"
                />
              </div>
              <div>
                <FormLabel>Base Type</FormLabel>
                <select
                  value={slime.base_type}
                  onChange={(e) =>
                    onUpdateSlime(idx, {
                      base_type: e.target.value as SlimeBaseType,
                    })
                  }
                  className={inputClass}
                  style={selectStyle}
                >
                  <option value="" style={{ background: "#0F0A1A" }}>
                    Select type
                  </option>
                  {(
                    Object.entries(SLIME_BASE_TYPE_LABELS) as [
                      SlimeBaseType,
                      string,
                    ][]
                  ).map(([val, label]) => (
                    <option
                      key={val}
                      value={val}
                      style={{ background: "#0F0A1A" }}
                    >
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FormLabel>Price</FormLabel>
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm"
                    style={{ color: "#8f83b0" }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={slime.price}
                    onChange={(e) =>
                      onUpdateSlime(idx, { price: e.target.value })
                    }
                    className={inputClass}
                    style={inputStyle}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <FormLabel>Scent Notes</FormLabel>
                <input
                  type="text"
                  value={slime.scent_notes}
                  onChange={(e) =>
                    onUpdateSlime(idx, { scent_notes: e.target.value })
                  }
                  maxLength={100}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="e.g. Strawberry shortcake"
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── WizardStepIndicator ──────────────────────────────────────────────────────

interface WizardStepIndicatorProps {
  step: 1 | 2 | 3 | 4;
}

const STEP_LABELS = ["Cover", "Details", "Slimes", "Preview"];

function WizardStepIndicator({ step }: WizardStepIndicatorProps) {
  return (
    <div className="flex items-center justify-center px-4 py-4">
      {STEP_LABELS.map((label, i) => {
        const stepNum = (i + 1) as 1 | 2 | 3 | 4;
        const isCompleted = stepNum < step;
        const isCurrent = stepNum === step;
        return (
          <div key={stepNum} className="flex items-center">
            <div className="flex flex-col items-center">
              <svg width="12" height="12" viewBox="0 0 12 12">
                <circle
                  cx="6"
                  cy="6"
                  r="5"
                  fill={
                    isCompleted
                      ? "#ff2bd6"
                      : isCurrent
                        ? "rgba(255,43,214,0.2)"
                        : "rgba(150,110,240,0.18)"
                  }
                  stroke={
                    isCompleted || isCurrent ? "#ff2bd6" : "rgba(150,110,240,0.24)"
                  }
                  strokeWidth="1.5"
                />
                {isCompleted && (
                  <path
                    d="M3.5 6l1.5 1.5 3-3"
                    stroke="#fff"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                )}
              </svg>
              <span
                className="text-[10px] mt-1 font-semibold"
                style={{
                  color: isCurrent
                    ? "#ff2bd6"
                    : isCompleted
                      ? "rgba(255,43,214,0.6)"
                      : "#6b6180",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className="mb-3 mx-1"
                style={{
                  width: 28,
                  height: 1,
                  background:
                    stepNum < step
                      ? "rgba(255,43,214,0.5)"
                      : "rgba(150,110,240,0.18)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Wizard nav button helpers ────────────────────────────────────────────────

function WizardNextButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-5 py-2.5 rounded-lg text-sm font-bold disabled:opacity-40 transition-opacity hover:opacity-90"
      style={{
        background: "linear-gradient(135deg, #ff2bd6, #a855f7)",
        boxShadow: "0 8px 24px -6px rgba(255,43,214,0.5)",
        color: "#fff",
        fontFamily: "Montserrat, sans-serif",
        fontWeight: 700,
      }}
    >
      {children}
    </button>
  );
}

function WizardBackButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-5 py-2.5 rounded-lg text-sm font-bold transition-all"
      style={{
        color: "#8f83b0",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(150,110,240,0.18)",
        fontFamily: "Montserrat, sans-serif",
        fontWeight: 700,
      }}
    >
      {children}
    </button>
  );
}

// ─── CreateWizard ─────────────────────────────────────────────────────────────

type WizardForm = {
  name: string;
  description: string;
  drop_at: string;
  status: DropStatus;
  shop_url: string;
  drop_type: "new_drop" | "restock";
  discount_code: string;
  free_shipping_threshold: string;
  cover_image_url: string | null;
};

interface CreateWizardProps {
  step: 1 | 2 | 3 | 4;
  setStep: (s: 1 | 2 | 3 | 4) => void;
  form: WizardForm;
  setForm: React.Dispatch<React.SetStateAction<WizardForm>>;
  attachedSlimes: DropSlimeEntry[];
  onDetach: (slimeId: string | null, idx: number) => void;
  recurringEnabled: boolean;
  setRecurringEnabled: (v: boolean) => void;
  recurrencePattern: RecurrencePattern;
  setRecurrencePattern: (p: RecurrencePattern) => void;
  error: string | null;
  saving: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  userId: string;
  expandedSlimeIdx: number | null;
  setExpandedSlimeIdx: (idx: number | null) => void;
  onUpdateSlime: (idx: number, updates: Partial<DropSlimeEntry>) => void;
}

function CreateWizard({
  step,
  setStep,
  form,
  setForm,
  attachedSlimes,
  onDetach,
  recurringEnabled,
  setRecurringEnabled,
  recurrencePattern,
  setRecurrencePattern,
  error,
  saving,
  onSubmit,
  onCancel,
  userId,
  expandedSlimeIdx,
  setExpandedSlimeIdx,
  onUpdateSlime,
}: CreateWizardProps) {
  const nameValid = form.name.trim().length > 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Step indicator */}
      <div style={{ borderBottom: "1px solid rgba(150,110,240,0.14)" }}>
        <WizardStepIndicator step={step} />
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        {/* ── Step 1: Cover Photo ── */}
        {step === 1 && (
          <div className="p-6 space-y-4 max-w-xl">
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "#22d3ee", fontFamily: "Montserrat, sans-serif" }}
            >
              Cover Photo
            </p>
            <ImageUpload
              bucket="slime-photos"
              userId={userId}
              existingUrl={form.cover_image_url}
              onUploadComplete={(url) =>
                setForm((f) => ({ ...f, cover_image_url: url }))
              }
              onRemove={() => setForm((f) => ({ ...f, cover_image_url: null }))}
              label="Drop Cover Photo"
              aspectRatio="4:3"
            />
            <p
              className="text-xs"
              style={{
                color: "#8f83b0",
                fontFamily: "Inter, sans-serif",
              }}
            >
              A 4:3 image works best. You can skip this and add one later.
            </p>
            <div className="flex justify-between pt-2">
              <WizardBackButton onClick={onCancel}>Cancel</WizardBackButton>
              <WizardNextButton onClick={() => setStep(2)}>
                Next
              </WizardNextButton>
            </div>
          </div>
        )}

        {/* ── Step 2: Drop Details ── */}
        {step === 2 && (
          <div className="p-6 space-y-4 max-w-xl">
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "#22d3ee", fontFamily: "Montserrat, sans-serif" }}
            >
              Drop Details
            </p>

            {/* Drop Type */}
            <div>
              <FormLabel>Drop Type</FormLabel>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, drop_type: "new_drop" }))
                  }
                  className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background:
                      form.drop_type === "new_drop"
                        ? "rgba(34,211,238,0.12)"
                        : "rgba(255,255,255,0.03)",
                    border: `1px solid ${form.drop_type === "new_drop" ? "rgba(34,211,238,0.35)" : "rgba(150,110,240,0.18)"}`,
                    color:
                      form.drop_type === "new_drop"
                        ? "#22d3ee"
                        : "#8f83b0",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  New Drop
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, drop_type: "restock" }))
                  }
                  className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background:
                      form.drop_type === "restock"
                        ? "rgba(255,184,0,0.12)"
                        : "rgba(255,255,255,0.03)",
                    border: `1px solid ${form.drop_type === "restock" ? "rgba(255,184,0,0.3)" : "rgba(150,110,240,0.18)"}`,
                    color:
                      form.drop_type === "restock"
                        ? "#FFB800"
                        : "#8f83b0",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  Restock
                </button>
              </div>
            </div>

            {/* Drop Name */}
            <div>
              <FormLabel>Drop Name *</FormLabel>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Summer Pastel Collection"
                className={inputClass}
                style={inputStyle}
              />
            </div>

            {/* Date & Time */}
            <div>
              <FormLabel>Date &amp; Time</FormLabel>
              <DateTimePicker
                value={form.drop_at}
                onChange={(iso) => setForm((f) => ({ ...f, drop_at: iso }))}
              />
            </div>

            {/* Status */}
            <div>
              <FormLabel>Status</FormLabel>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as DropStatus,
                  }))
                }
                className={inputClass}
                style={selectStyle}
              >
                {(
                  [
                    "announced",
                    "live",
                    "sold_out",
                    "restocked",
                    "cancelled",
                  ] as DropStatus[]
                ).map((s) => (
                  <option key={s} value={s} style={{ background: "#0F0A1A" }}>
                    {s
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <FormLabel>Description</FormLabel>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={3}
                placeholder="Tell fans what to expect..."
                className={`${inputClass} resize-none`}
                style={inputStyle}
              />
            </div>

            {/* Shop URL */}
            <div>
              <FormLabel>Shop URL</FormLabel>
              <input
                type="url"
                value={form.shop_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, shop_url: e.target.value }))
                }
                placeholder="https://yourshop.com/drop"
                className={inputClass}
                style={inputStyle}
              />
            </div>

            {/* Discount Code */}
            <div>
              <FormLabel>Discount Code</FormLabel>
              <input
                type="text"
                value={form.discount_code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discount_code: e.target.value }))
                }
                placeholder="e.g. SUMMER10"
                className={inputClass}
                style={inputStyle}
              />
            </div>

            {/* Free Shipping Threshold */}
            <div>
              <FormLabel>Free Shipping Threshold</FormLabel>
              <div className="flex items-center gap-2">
                <span
                  className="text-sm"
                  style={{ color: "#8f83b0" }}
                >
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  value={form.free_shipping_threshold}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      free_shipping_threshold: e.target.value,
                    }))
                  }
                  placeholder="25"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Recurrence */}
            <RecurrenceBuilder
              enabled={recurringEnabled}
              onToggle={setRecurringEnabled}
              pattern={recurrencePattern}
              onChange={setRecurrencePattern}
            />

            <div className="flex justify-between pt-2">
              <WizardBackButton onClick={() => setStep(1)}>
                Back
              </WizardBackButton>
              <WizardNextButton
                onClick={() => setStep(3)}
                disabled={!nameValid}
              >
                Next
              </WizardNextButton>
            </div>
          </div>
        )}

        {/* ── Step 3: Slimes ── */}
        {step === 3 && (
          <div className="p-6 space-y-4 max-w-xl">
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "#22d3ee", fontFamily: "Montserrat, sans-serif" }}
            >
              Slimes
            </p>
            <p
              className="text-xs"
              style={{
                color: "#8f83b0",
                fontFamily: "Inter, sans-serif",
              }}
            >
              Optional. You can add slimes after creating the drop.
            </p>
            {attachedSlimes.length === 0 ? (
              <p
                className="text-xs py-4"
                style={{
                  color: "#6b6180",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Use the catalog panel on the right to add slimes to this drop.
              </p>
            ) : (
              <SlimeRows
                attachedSlimes={attachedSlimes}
                expandedSlimeIdx={expandedSlimeIdx}
                setExpandedSlimeIdx={setExpandedSlimeIdx}
                onUpdateSlime={onUpdateSlime}
                onDetach={onDetach}
              />
            )}
            <div className="flex justify-between pt-2">
              <WizardBackButton onClick={() => setStep(2)}>
                Back
              </WizardBackButton>
              <WizardNextButton onClick={() => setStep(4)}>
                Next
              </WizardNextButton>
            </div>
          </div>
        )}

        {/* ── Step 4: Preview & Create ── */}
        {step === 4 && (
          <div className="p-6 space-y-5 max-w-xl">
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "#22d3ee", fontFamily: "Montserrat, sans-serif" }}
            >
              Preview &amp; Create
            </p>

            {/* Cover image preview */}
            {form.cover_image_url && (
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid rgba(150,110,240,0.18)" }}
              >
                <img
                  src={form.cover_image_url}
                  alt="Drop cover"
                  className="w-full object-cover rounded-xl"
                  style={{ maxHeight: 180 }}
                />
              </div>
            )}

            {/* Summary grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Drop Type */}
              {form.drop_type && (
                <div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest mb-1"
                    style={{
                      color: "#6b6180",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    Type
                  </p>
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{
                      color:
                        form.drop_type === "restock" ? "#FFB800" : "#22d3ee",
                      background:
                        form.drop_type === "restock"
                          ? "rgba(255,184,0,0.12)"
                          : "rgba(34,211,238,0.12)",
                      border: `1px solid ${form.drop_type === "restock" ? "rgba(255,184,0,0.3)" : "rgba(34,211,238,0.3)"}`,
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    {form.drop_type === "restock" ? "Restock" : "New Drop"}
                  </span>
                </div>
              )}

              {/* Status */}
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mb-1"
                  style={{
                    color: "#6b6180",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  Status
                </p>
                <span
                  className="text-xs font-bold px-3 py-1 rounded-full"
                  style={{
                    color: STATUS_STYLES[form.status].color,
                    background: STATUS_STYLES[form.status].bg,
                    border: `1px solid ${STATUS_STYLES[form.status].border}`,
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  {STATUS_STYLES[form.status].label.toUpperCase()}
                </span>
              </div>

              {/* Date */}
              {form.drop_at && (
                <div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest mb-1"
                    style={{
                      color: "#6b6180",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    Date &amp; Time
                  </p>
                  <p
                    className="text-sm text-white"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {formatDate(form.drop_at)}
                  </p>
                </div>
              )}

              {/* Discount Code */}
              {form.discount_code && (
                <div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest mb-1"
                    style={{
                      color: "#6b6180",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    Discount Code
                  </p>
                  <p
                    className="text-sm text-white"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {form.discount_code}
                  </p>
                </div>
              )}

              {/* Free Shipping */}
              {form.free_shipping_threshold && (
                <div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest mb-1"
                    style={{
                      color: "#6b6180",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    Free Shipping Over
                  </p>
                  <p
                    className="text-sm text-white"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    ${form.free_shipping_threshold}
                  </p>
                </div>
              )}

              {/* Slimes count */}
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mb-1"
                  style={{
                    color: "#6b6180",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  Slimes
                </p>
                <p
                  className="text-sm"
                  style={{
                    color:
                      attachedSlimes.length > 0
                        ? "#ff2bd6"
                        : "#6b6180",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {attachedSlimes.length > 0
                    ? `${attachedSlimes.length} slime${attachedSlimes.length !== 1 ? "s" : ""} in this drop`
                    : "No slimes added"}
                </p>
              </div>
            </div>

            {/* Drop Name — large */}
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-1"
                style={{
                  color: "#6b6180",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                Drop Name
              </p>
              <p
                className="text-xl font-bold text-white"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                {form.name}
              </p>
            </div>

            {/* Description */}
            {form.description && (
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mb-1"
                  style={{
                    color: "#6b6180",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  Description
                </p>
                <p
                  className="text-sm"
                  style={{
                    color: "rgba(245,245,245,0.6)",
                    fontFamily: "Inter, sans-serif",
                    lineHeight: 1.6,
                  }}
                >
                  {form.description}
                </p>
              </div>
            )}

            {/* Shop URL */}
            {form.shop_url && (
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mb-1"
                  style={{
                    color: "#6b6180",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  Shop URL
                </p>
                <a
                  href={form.shop_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:opacity-80 transition-opacity"
                  style={{ color: "#22d3ee", fontFamily: "Inter, sans-serif" }}
                >
                  {form.shop_url}
                </a>
              </div>
            )}

            {/* Recurring summary */}
            {recurringEnabled && (
              <div
                className="px-3 py-2 rounded-lg text-xs"
                style={{
                  background: "rgba(255,43,214,0.07)",
                  border: "1px solid rgba(255,43,214,0.2)",
                  color: "#ff2bd6",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Recurring drop ·{" "}
                {recurrencePattern.frequency.charAt(0).toUpperCase() +
                  recurrencePattern.frequency.slice(1)}
              </div>
            )}

            {error && (
              <p
                className="text-xs text-red-400"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {error}
              </p>
            )}

            <div className="flex justify-between pt-2">
              <WizardBackButton onClick={() => setStep(3)}>
                Back
              </WizardBackButton>
              <button
                type="button"
                onClick={onSubmit}
                disabled={saving}
                className="px-6 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                style={{
                  background: "linear-gradient(135deg, #ff2bd6, #a855f7)",
                  boxShadow: "0 8px 24px -6px rgba(255,43,214,0.5)",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {saving
                  ? "Creating..."
                  : recurringEnabled
                    ? "Create Drop Series"
                    : "Create Drop"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DetailPanel ──────────────────────────────────────────────────────────────

interface DetailPanelProps {
  selected: Drop;
  attachedSlimes: DropSlimeEntry[];
  confirmDelete: boolean;
  setConfirmDelete: (v: boolean) => void;
  onStatusChange: (dropId: string, newStatus: DropStatus) => void;
  onDetach: (slimeId: string | null, idx: number) => void;
  onDelete: () => void;
  expandedSlimeIdx: number | null;
  setExpandedSlimeIdx: (idx: number | null) => void;
  onUpdateSlime: (idx: number, updates: Partial<DropSlimeEntry>) => void;
}

function DetailPanel({
  selected,
  attachedSlimes,
  confirmDelete,
  setConfirmDelete,
  onStatusChange,
  onDetach,
  onDelete,
  expandedSlimeIdx,
  setExpandedSlimeIdx,
  onUpdateSlime,
}: DetailPanelProps) {
  const styles = STATUS_STYLES[selected.status];
  return (
    <div className="p-6 space-y-5 overflow-y-auto flex-1">
      <div className="flex items-start justify-between">
        <h2
          className="text-xl font-bold text-white"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          {selected.name}
        </h2>
        <span
          className="text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 flex-shrink-0"
          style={{
            color: styles.color,
            background: styles.bg,
            border: `1px solid ${styles.border}`,
            fontFamily: "Montserrat, sans-serif",
          }}
        >
          {selected.status === "live" && (
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          )}
          {styles.label.toUpperCase()}
        </span>
      </div>
      <p
        className="text-sm"
        style={{
          color: "#8f83b0",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {formatDate(selected.drop_at)}
      </p>
      {selected.recurrence_pattern && (
        <div
          className="px-3 py-2 rounded-lg text-xs"
          style={{
            background: "rgba(255,43,214,0.07)",
            border: "1px solid rgba(255,43,214,0.2)",
            color: "#ff2bd6",
          }}
        >
          Recurring ·{" "}
          {selected.recurrence_pattern.frequency.charAt(0).toUpperCase() +
            selected.recurrence_pattern.frequency.slice(1)}
        </div>
      )}
      {selected.description && (
        <p
          className="text-sm"
          style={{
            color: "rgba(245,245,245,0.6)",
            fontFamily: "Inter, sans-serif",
            lineHeight: 1.6,
          }}
        >
          {selected.description}
        </p>
      )}
      {selected.shop_url && (
        <a
          href={selected.shop_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity"
          style={{ color: "#22d3ee" }}
        >
          View Shop Link
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 10L10 2M10 2H5M10 2V7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </a>
      )}
      {selected.drop_type && (
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold px-3 py-1 rounded-full"
            style={{
              color: selected.drop_type === "restock" ? "#FFB800" : "#22d3ee",
              background:
                selected.drop_type === "restock"
                  ? "rgba(255,184,0,0.12)"
                  : "rgba(34,211,238,0.12)",
              border: `1px solid ${selected.drop_type === "restock" ? "rgba(255,184,0,0.3)" : "rgba(34,211,238,0.3)"}`,
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            {selected.drop_type === "restock" ? "Restock" : "New Drop"}
          </span>
        </div>
      )}
      {selected.discount_code && (
        <p className="text-sm" style={{ color: "rgba(245,245,245,0.6)" }}>
          <span style={{ color: "#8f83b0" }}>Code: </span>
          {selected.discount_code}
        </p>
      )}
      {selected.free_shipping_threshold != null && (
        <p className="text-sm" style={{ color: "rgba(245,245,245,0.6)" }}>
          Free shipping on orders over $
          {Number.isInteger(selected.free_shipping_threshold)
            ? selected.free_shipping_threshold
            : selected.free_shipping_threshold.toFixed(2)}
        </p>
      )}
      {NEXT_STATUS[selected.status] && (
        <div>
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "#22d3ee", fontFamily: "Montserrat, sans-serif" }}
          >
            Update Status
          </p>
          <div className="flex gap-2 flex-wrap">
            {NEXT_STATUS[selected.status]!.map((action) => (
              <button
                key={action.status}
                type="button"
                onClick={() => onStatusChange(selected.id, action.status)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background:
                    action.status === "live"
                      ? "linear-gradient(135deg, #ff2bd6, #a855f7)"
                      : "rgba(255,255,255,0.03)",
                  color:
                    action.status === "live"
                      ? "#fff"
                      : "rgba(245,245,245,0.7)",
                  border:
                    action.status !== "live"
                      ? "1px solid rgba(150,110,240,0.18)"
                      : "none",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div
        style={{ borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: 16 }}
      >
        <p
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: "#ff2bd6", fontFamily: "Montserrat, sans-serif" }}
        >
          Slimes in Drop{" "}
          {attachedSlimes.length > 0 && `(${attachedSlimes.length})`}
        </p>
        {attachedSlimes.length === 0 ? (
          <p className="text-xs" style={{ color: "#6b6180" }}>
            No slimes added yet. Use the catalog panel to add slimes.
          </p>
        ) : (
          <SlimeRows
            attachedSlimes={attachedSlimes}
            expandedSlimeIdx={expandedSlimeIdx}
            setExpandedSlimeIdx={setExpandedSlimeIdx}
            onUpdateSlime={onUpdateSlime}
            onDetach={onDetach}
          />
        )}
      </div>
      <div
        style={{ borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: 16 }}
      >
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{
              color: "#FF3D6E",
              background: "rgba(255,61,110,0.08)",
              border: "1px solid rgba(255,61,110,0.2)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Delete Drop
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-xs" style={{ color: "rgba(245,245,245,0.5)" }}>
              Are you sure?
            </p>
            <button
              type="button"
              onClick={onDelete}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{
                color: "#FF3D6E",
                background: "rgba(255,61,110,0.15)",
                border: "1px solid rgba(255,61,110,0.3)",
              }}
            >
              Confirm Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-xs"
              style={{ color: "#8f83b0" }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DropsSplitPanel({
  brandId,
  userId,
  initialDrops,
}: DropsSplitPanelProps) {
  const [drops, setDrops] = useState<Drop[]>(initialDrops);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"empty" | "detail" | "create">("empty");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [attachedSlimes, setAttachedSlimes] = useState<DropSlimeEntry[]>([]);
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurrencePattern, setRecurrencePattern] =
    useState<RecurrencePattern>(DEFAULT_RECURRENCE);
  const [expandedSlimeIdx, setExpandedSlimeIdx] = useState<number | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const supabase = createClient();

  const emptyForm: WizardForm = {
    name: "",
    description: "",
    drop_at: "",
    status: "announced" as DropStatus,
    shop_url: "",
    drop_type: "new_drop" as "new_drop" | "restock",
    discount_code: "",
    free_shipping_threshold: "",
    cover_image_url: null,
  };
  const [form, setForm] = useState<WizardForm>(emptyForm);

  const upcoming = drops.filter((d) =>
    ["announced", "live"].includes(d.status),
  );
  const past = drops.filter((d) =>
    ["sold_out", "restocked", "cancelled"].includes(d.status),
  );
  const displayed = tab === "upcoming" ? upcoming : past;
  const selected = drops.find((d) => d.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId || mode !== "detail") return;
    supabase
      .from("drop_slimes")
      .select("slime_id, name, base_type, price, scent_notes, image_url")
      .eq("drop_id", selectedId)
      .then(({ data }: { data: Array<Record<string, unknown>> | null }) => {
        const entries: DropSlimeEntry[] = (data ?? []).map((r) => ({
          slime_id: r.slime_id as string | null,
          name: (r.name as string) ?? "",
          base_type: (r.base_type as SlimeBaseType) ?? "",
          price: r.price != null ? String(r.price) : "",
          scent_notes: (r.scent_notes as string) ?? "",
          image_url: (r.image_url as string) ?? null,
        }));
        setAttachedSlimes(entries);
      });
  }, [selectedId, mode]); // eslint-disable-line

  const startCreate = () => {
    setSelectedId(null);
    setForm(emptyForm);
    setError(null);
    setConfirmDelete(false);
    setAttachedSlimes([]);
    setRecurringEnabled(false);
    setRecurrencePattern(DEFAULT_RECURRENCE);
    setExpandedSlimeIdx(null);
    setWizardStep(1);
    setMode("create");
  };

  const handleUpdateSlime = (idx: number, updates: Partial<DropSlimeEntry>) => {
    setAttachedSlimes((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...updates } : s)),
    );
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError("Drop name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("drops")
      .insert({
        brand_id: brandId,
        name: form.name.trim(),
        description: form.description || null,
        drop_at: form.drop_at ? new Date(form.drop_at).toISOString() : null,
        status: form.status,
        shop_url: form.shop_url || null,
        cover_image_url: form.cover_image_url || null,
        drop_type: form.drop_type,
        discount_code: form.discount_code || null,
        free_shipping_threshold: form.free_shipping_threshold
          ? parseFloat(form.free_shipping_threshold)
          : null,
        announced_by: userId,
        recurrence_pattern: recurringEnabled ? recurrencePattern : null,
      })
      .select()
      .single();
    if (err || !data) {
      setError(err?.message ?? "Failed to create drop.");
      setSaving(false);
      return;
    }
    const newDrop = data as Drop;
    if (attachedSlimes.length > 0) {
      await supabase.from("drop_slimes").insert(
        attachedSlimes.map((s) => ({
          drop_id: newDrop.id,
          slime_id: s.slime_id,
          name: s.name || null,
          base_type: s.base_type || null,
          price: s.price ? parseFloat(s.price) : null,
          scent_notes: s.scent_notes || null,
          image_url: s.image_url || null,
        })),
      );
    }
    if (recurringEnabled && form.drop_at) {
      const futureDrops = generateRecurringDrops(
        {
          name: form.name.trim(),
          description: form.description,
          shop_url: form.shop_url,
          brand_id: brandId,
          announced_by: userId,
        },
        new Date(form.drop_at),
        recurrencePattern,
        newDrop.id,
      );
      if (futureDrops.length > 0) {
        const { data: futureData } = await supabase
          .from("drops")
          .insert(futureDrops)
          .select();
        if (futureData)
          setDrops((prev) => [...prev, ...(futureData as Drop[])]);
      }
    }
    setDrops((prev) => [newDrop, ...prev]);
    setSelectedId(newDrop.id);
    setMode("detail");
    setSaving(false);
  };

  const handleStatusChange = async (dropId: string, newStatus: DropStatus) => {
    const { error: err } = await supabase
      .from("drops")
      .update({ status: newStatus })
      .eq("id", dropId);
    if (!err)
      setDrops(
        drops.map((d) => (d.id === dropId ? { ...d, status: newStatus } : d)),
      );
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const { error: err } = await supabase
      .from("drops")
      .delete()
      .eq("id", selectedId);
    if (!err) {
      setDrops(drops.filter((d) => d.id !== selectedId));
      setSelectedId(null);
      setMode("empty");
      setConfirmDelete(false);
    }
  };

  const handleAttachSlime = async (slime: CatalogSlime) => {
    const entry: DropSlimeEntry = {
      slime_id: slime.id,
      name: slime.name,
      base_type: slime.base_type,
      price: "",
      scent_notes: "",
      image_url: slime.image_url,
    };
    if (selectedId) {
      await supabase
        .from("drop_slimes")
        .insert({ drop_id: selectedId, slime_id: slime.id });
    }
    setAttachedSlimes((prev) => [...prev, entry]);
  };

  const handleDetachSlime = async (slimeId: string | null, idx: number) => {
    if (selectedId && slimeId) {
      await supabase
        .from("drop_slimes")
        .delete()
        .eq("drop_id", selectedId)
        .eq("slime_id", slimeId);
    }
    setAttachedSlimes((prev) => prev.filter((_, i) => i !== idx));
    if (expandedSlimeIdx === idx) setExpandedSlimeIdx(null);
  };

  const handleAddNewSlime = async (slimeData: {
    name: string;
    base_type: SlimeBaseType;
  }): Promise<CatalogSlime | null> => {
    const { data, error: err } = await supabase
      .from("slimes")
      .insert({
        brand_id: brandId,
        name: slimeData.name,
        base_type: slimeData.base_type,
        is_brand_official: true,
        created_by: userId,
      })
      .select("id, name, base_type, colors, image_url")
      .single();
    if (err || !data) return null;
    const newSlime = data as CatalogSlime;
    const entry: DropSlimeEntry = {
      slime_id: newSlime.id,
      name: newSlime.name,
      base_type: newSlime.base_type,
      price: "",
      scent_notes: "",
      image_url: newSlime.image_url,
    };
    if (selectedId) {
      await supabase
        .from("drop_slimes")
        .insert({ drop_id: selectedId, slime_id: newSlime.id });
    }
    setAttachedSlimes((prev) => [...prev, entry]);
    return newSlime;
  };

  const attachedIds = new Set(
    attachedSlimes
      .map((s) => s.slime_id)
      .filter((id): id is string => id !== null),
  );
  const catalogActive = mode === "create" || mode === "detail";

  // Catalog panel should only be active during step 3 when in create mode
  const catalogActiveCreate = mode === "create" ? wizardStep === 3 : true;

  return (
    <div
      className="rounded-2xl overflow-hidden flex"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(150,110,240,0.18)",
        height: "calc(100vh - 200px)",
        minHeight: "520px",
      }}
    >
      {/* ── LEFT PANEL: Drop list ── */}
      <div
        className="flex flex-col flex-shrink-0"
        style={{ width: 280, borderRight: "1px solid rgba(150,110,240,0.18)" }}
      >
        <div
          className="flex gap-1 p-3"
          style={{ borderBottom: "1px solid rgba(150,110,240,0.14)" }}
        >
          {(["upcoming", "past"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="flex-1 text-xs font-semibold py-1.5 rounded-md capitalize transition-all"
              style={{
                background: tab === t ? "rgba(255,43,214,0.1)" : "transparent",
                color: tab === t ? "#ff2bd6" : "#8f83b0",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {t} ({t === "upcoming" ? upcoming.length : past.length})
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {displayed.length === 0 ? (
            <div className="p-6 text-center">
              <p
                className="text-sm"
                style={{
                  color: "#6b6180",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {tab === "upcoming" ? "No upcoming drops" : "No past drops"}
              </p>
            </div>
          ) : (
            displayed.map((drop) => {
              const dropStyles = STATUS_STYLES[drop.status];
              return (
                <button
                  key={drop.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(drop.id);
                    setMode("detail");
                    setConfirmDelete(false);
                    setAttachedSlimes([]);
                    setExpandedSlimeIdx(null);
                  }}
                  className="w-full text-left px-4 py-3.5 transition-all"
                  style={{
                    background:
                      selectedId === drop.id
                        ? "rgba(255,43,214,0.05)"
                        : "transparent",
                    borderLeft:
                      selectedId === drop.id
                        ? "3px solid #ff2bd6"
                        : "3px solid transparent",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className="text-sm font-medium text-white truncate"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {drop.name}
                    </p>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0 flex items-center gap-1"
                      style={{
                        color: dropStyles.color,
                        background: dropStyles.bg,
                        border: `1px solid ${dropStyles.border}`,
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      {drop.status === "live" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      )}
                      {dropStyles.label.toUpperCase()}
                    </span>
                  </div>
                  <p
                    className="text-xs mt-1"
                    style={{
                      color: "#8f83b0",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    {formatDate(drop.drop_at)}
                  </p>
                  {drop.recurrence_pattern && (
                    <p
                      className="text-[10px] mt-0.5"
                      style={{ color: "rgba(255,43,214,0.5)" }}
                    >
                      Recurring
                    </p>
                  )}
                </button>
              );
            })
          )}
        </div>
        <div
          className="p-3"
          style={{ borderTop: "1px solid rgba(150,110,240,0.14)" }}
        >
          <button
            type="button"
            onClick={startCreate}
            className="w-full py-2.5 rounded-lg text-sm font-bold text-white hover:opacity-90 transition-opacity"
            style={{
              background: "linear-gradient(135deg, #ff2bd6, #a855f7)",
              boxShadow: "0 8px 24px -6px rgba(255,43,214,0.5)",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            + New Drop
          </button>
        </div>
      </div>

      {/* ── CENTER PANEL ── */}
      <div className="hidden md:flex flex-1 flex-col overflow-hidden">
        {mode === "empty" && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(150,110,240,0.18)",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ color: "#6b6180" }}
                >
                  <path
                    d="M12 3L15.5 10.5H20.5L16.5 15L18 21L12 17.5L6 21L7.5 15L3.5 10.5H8.5L12 3Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p
                className="text-sm"
                style={{
                  color: "#6b6180",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Select a drop or create a new one
              </p>
            </div>
          </div>
        )}
        {mode === "detail" && selected && (
          <DetailPanel
            selected={selected}
            attachedSlimes={attachedSlimes}
            confirmDelete={confirmDelete}
            setConfirmDelete={setConfirmDelete}
            onStatusChange={handleStatusChange}
            onDetach={handleDetachSlime}
            onDelete={handleDelete}
            expandedSlimeIdx={expandedSlimeIdx}
            setExpandedSlimeIdx={setExpandedSlimeIdx}
            onUpdateSlime={handleUpdateSlime}
          />
        )}
        {mode === "create" && (
          <CreateWizard
            step={wizardStep}
            setStep={setWizardStep}
            form={form}
            setForm={setForm}
            attachedSlimes={attachedSlimes}
            onDetach={handleDetachSlime}
            recurringEnabled={recurringEnabled}
            setRecurringEnabled={setRecurringEnabled}
            recurrencePattern={recurrencePattern}
            setRecurrencePattern={setRecurrencePattern}
            error={error}
            saving={saving}
            onSubmit={handleCreate}
            onCancel={() => setMode("empty")}
            userId={userId}
            expandedSlimeIdx={expandedSlimeIdx}
            setExpandedSlimeIdx={setExpandedSlimeIdx}
            onUpdateSlime={handleUpdateSlime}
          />
        )}
      </div>

      {/* ── RIGHT PANEL: Brand catalog browser ── */}
      <div
        className="hidden md:flex flex-col flex-shrink-0"
        style={{ width: 300 }}
      >
        <CatalogPanel
          brandId={brandId}
          attachedIds={attachedIds}
          onAttach={handleAttachSlime}
          onAddNew={handleAddNewSlime}
          isActive={catalogActive && catalogActiveCreate}
          dropType={
            mode === "detail" && selected
              ? (selected.drop_type ?? "new_drop")
              : form.drop_type
          }
        />
      </div>

      {/* ── Mobile bottom sheet ── */}
      {((mode === "detail" && selected !== null) || mode === "create") && (
        <div
          className="md:hidden fixed inset-0 z-50"
          style={{ background: "rgba(10,10,10,0.8)" }}
        >
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl flex flex-col"
            style={{
              background: "#0A0A0A",
              border: "1px solid rgba(150,110,240,0.24)",
              maxHeight: "90vh",
            }}
          >
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0"
              style={{
                background: "#0A0A0A",
                borderBottom: "1px solid rgba(255,255,255,0.03)",
              }}
            >
              <div
                className="w-8 h-1 rounded-full absolute left-1/2 -translate-x-1/2 top-2"
                style={{ background: "rgba(150,110,240,0.24)" }}
              />
              <p
                className="text-sm font-bold text-white mt-2"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                {mode === "create" ? "New Drop" : selected?.name}
              </p>
              <button
                type="button"
                onClick={() => {
                  setMode("empty");
                  setSelectedId(null);
                }}
                className="mt-2 p-1.5 rounded-lg"
                style={{
                  color: "#8f83b0",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M1 1l12 12M13 1L1 13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 pb-10">
              {mode === "detail" && selected && (
                <DetailPanel
                  selected={selected}
                  attachedSlimes={attachedSlimes}
                  confirmDelete={confirmDelete}
                  setConfirmDelete={setConfirmDelete}
                  onStatusChange={handleStatusChange}
                  onDetach={handleDetachSlime}
                  onDelete={handleDelete}
                  expandedSlimeIdx={expandedSlimeIdx}
                  setExpandedSlimeIdx={setExpandedSlimeIdx}
                  onUpdateSlime={handleUpdateSlime}
                />
              )}
              {mode === "create" && (
                <CreateWizard
                  step={wizardStep}
                  setStep={setWizardStep}
                  form={form}
                  setForm={setForm}
                  attachedSlimes={attachedSlimes}
                  onDetach={handleDetachSlime}
                  recurringEnabled={recurringEnabled}
                  setRecurringEnabled={setRecurringEnabled}
                  recurrencePattern={recurrencePattern}
                  setRecurrencePattern={setRecurrencePattern}
                  error={error}
                  saving={saving}
                  onSubmit={handleCreate}
                  onCancel={() => setMode("empty")}
                  userId={userId}
                  expandedSlimeIdx={expandedSlimeIdx}
                  setExpandedSlimeIdx={setExpandedSlimeIdx}
                  onUpdateSlime={handleUpdateSlime}
                />
              )}
              {/* Mobile catalog — only show during step 3 in create mode, always show in detail mode */}
              {(mode === "detail" ||
                (mode === "create" && wizardStep === 3)) && (
                <div
                  className="px-5 pb-4 pt-2"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.03)" }}
                >
                  <p
                    className="text-xs font-bold uppercase tracking-widest mb-3"
                    style={{
                      color: "#22d3ee",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    Add from Catalog
                  </p>
                  <CatalogPanel
                    brandId={brandId}
                    attachedIds={attachedIds}
                    onAttach={handleAttachSlime}
                    onAddNew={handleAddNewSlime}
                    isActive={true}
                    dropType={
                      mode === "detail" && selected
                        ? (selected.drop_type ?? "new_drop")
                        : form.drop_type
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { SLIME_TYPE_LABELS } from "@/lib/types";
import type { SlimeType } from "@/lib/types";

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
}

interface BrandSlime {
  id: string;
  name: string;
  slime_type: SlimeType;
  colors: string[] | null;
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

const STATUS_STYLES: Record<
  DropStatus,
  { color: string; bg: string; border: string; label: string }
> = {
  announced: {
    color: "#00F0FF",
    bg: "rgba(0,240,255,0.1)",
    border: "rgba(0,240,255,0.25)",
    label: "Announced",
  },
  live: {
    color: "#39FF14",
    bg: "rgba(57,255,20,0.1)",
    border: "rgba(57,255,20,0.25)",
    label: "Live",
  },
  sold_out: {
    color: "rgba(245,245,245,0.35)",
    bg: "rgba(45,10,78,0.4)",
    border: "rgba(45,10,78,0.7)",
    label: "Sold Out",
  },
  restocked: {
    color: "#4488FF",
    bg: "rgba(68,136,255,0.1)",
    border: "rgba(68,136,255,0.25)",
    label: "Restocked",
  },
  cancelled: {
    color: "#FF4444",
    bg: "rgba(255,68,68,0.1)",
    border: "rgba(255,68,68,0.25)",
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

const inputClass =
  "w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none transition-colors";
const inputStyle = {
  background: "rgba(45,10,78,0.35)",
  border: "1px solid rgba(45,10,78,0.8)",
  fontFamily: "Inter, sans-serif",
};
const selectStyle = { ...inputStyle, appearance: "none" as const };

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block text-xs font-bold uppercase tracking-widest mb-1.5"
      style={{
        color: "rgba(245,245,245,0.4)",
        fontFamily: "Montserrat, sans-serif",
      }}
    >
      {children}
    </label>
  );
}

// ─── Custom Date/Time Picker ──────────────────────────────────────────────────

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

  // No useEffect — call onChange directly to avoid infinite re-render loop
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

// ─── Recurrence Builder ───────────────────────────────────────────────────────

interface RecurrenceBuilderProps {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  pattern: RecurrencePattern;
  onChange: (p: RecurrencePattern) => void;
}

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
      style={{ border: "1px solid rgba(45,10,78,0.7)" }}
    >
      <button
        type="button"
        onClick={() => onToggle(!enabled)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold transition-all"
        style={{
          background: enabled ? "rgba(57,255,20,0.08)" : "rgba(45,10,78,0.25)",
        }}
      >
        <span
          style={{
            color: enabled ? "#39FF14" : "rgba(245,245,245,0.5)",
            fontFamily: "Montserrat, sans-serif",
          }}
        >
          Recurring Drop
        </span>
        <div
          className="w-10 h-5 rounded-full relative transition-all"
          style={{ background: enabled ? "#39FF14" : "rgba(45,10,78,0.6)" }}
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
          style={{ background: "rgba(45,10,78,0.15)" }}
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
                        ? "rgba(57,255,20,0.15)"
                        : "rgba(45,10,78,0.3)",
                    border: `1px solid ${pattern.frequency === f ? "rgba(57,255,20,0.4)" : "rgba(45,10,78,0.6)"}`,
                    color:
                      pattern.frequency === f
                        ? "#39FF14"
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
                        ? "rgba(0,240,255,0.12)"
                        : "rgba(45,10,78,0.3)",
                    border: `1px solid ${pattern.end_type === e ? "rgba(0,240,255,0.35)" : "rgba(45,10,78,0.6)"}`,
                    color:
                      pattern.end_type === e
                        ? "#00F0FF"
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

// ─── Slime Picker ─────────────────────────────────────────────────────────────

interface SlimePickerProps {
  brandId: string;
  attached: BrandSlime[];
  onAttach: (slime: BrandSlime) => void;
  onDetach: (slimeId: string) => void;
  onAddNew: (slime: {
    name: string;
    slime_type: SlimeType;
  }) => Promise<BrandSlime | null>;
}

function SlimePicker({
  brandId,
  attached,
  onAttach,
  onDetach,
  onAddNew,
}: SlimePickerProps) {
  const supabase = createClient();
  const [brandSlimes, setBrandSlimes] = useState<BrandSlime[]>([]);
  const [search, setSearch] = useState("");
  const [showAddNew, setShowAddNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<SlimeType>("butter");
  const [addingNew, setAddingNew] = useState(false);
  const dragItem = useRef<string | null>(null);

  useEffect(() => {
    supabase
      .from("slimes")
      .select("id, name, slime_type, colors, image_url")
      .eq("brand_id", brandId)
      .eq("is_brand_official", true)
      .order("name")
      .then(({ data }: { data: BrandSlime[] | null }) => {
        setBrandSlimes(data ?? []);
      });
  }, [brandId]); // eslint-disable-line

  const attachedIds = new Set(attached.map((s) => s.id));
  const available = brandSlimes.filter(
    (s) =>
      !attachedIds.has(s.id) &&
      s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAddNew = async () => {
    if (!newName.trim()) return;
    setAddingNew(true);
    const result = await onAddNew({
      name: newName.trim(),
      slime_type: newType,
    });
    if (result) {
      setBrandSlimes((prev) => [...prev, result]);
      setNewName("");
      setShowAddNew(false);
    }
    setAddingNew(false);
  };

  return (
    <div className="space-y-3">
      {attached.length > 0 && (
        <div className="space-y-1.5">
          <p
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "#00F0FF", fontFamily: "Montserrat, sans-serif" }}
          >
            In This Drop ({attached.length})
          </p>
          {attached.map((slime) => (
            <div
              key={slime.id}
              className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{
                background: "rgba(57,255,20,0.07)",
                border: "1px solid rgba(57,255,20,0.2)",
              }}
            >
              <div>
                <p className="text-sm font-medium text-white">{slime.name}</p>
                <p
                  className="text-xs"
                  style={{ color: "rgba(245,245,245,0.4)" }}
                >
                  {SLIME_TYPE_LABELS[slime.slime_type]}
                </p>
              </div>
              <button
                onClick={() => onDetach(slime.id)}
                className="text-xs px-2 py-1 rounded-md transition-all"
                style={{
                  color: "#FF4444",
                  background: "rgba(255,68,68,0.08)",
                  border: "1px solid rgba(255,68,68,0.2)",
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <div>
        <p
          className="text-xs font-bold uppercase tracking-widest mb-2"
          style={{
            color: "rgba(245,245,245,0.4)",
            fontFamily: "Montserrat, sans-serif",
          }}
        >
          Add from Catalog
        </p>
        <input
          className={inputClass}
          style={inputStyle}
          placeholder="Search slimes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {available.length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {available.map((slime) => (
            <div
              key={slime.id}
              draggable
              onDragStart={() => {
                dragItem.current = slime.id;
              }}
              onDragEnd={() => {
                dragItem.current = null;
              }}
              className="flex items-center justify-between px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-all"
              style={{
                background: "rgba(45,10,78,0.3)",
                border: "1px solid rgba(45,10,78,0.6)",
              }}
            >
              <div className="flex items-center gap-2">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  style={{ color: "rgba(245,245,245,0.2)", flexShrink: 0 }}
                >
                  <circle cx="3" cy="3" r="1" fill="currentColor" />
                  <circle cx="9" cy="3" r="1" fill="currentColor" />
                  <circle cx="3" cy="9" r="1" fill="currentColor" />
                  <circle cx="9" cy="9" r="1" fill="currentColor" />
                  <circle cx="3" cy="6" r="1" fill="currentColor" />
                  <circle cx="9" cy="6" r="1" fill="currentColor" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-white">{slime.name}</p>
                  <p
                    className="text-xs"
                    style={{ color: "rgba(245,245,245,0.4)" }}
                  >
                    {SLIME_TYPE_LABELS[slime.slime_type]}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onAttach(slime)}
                className="text-xs px-2 py-1 rounded-md transition-all"
                style={{
                  color: "#39FF14",
                  background: "rgba(57,255,20,0.08)",
                  border: "1px solid rgba(57,255,20,0.2)",
                }}
              >
                + Add
              </button>
            </div>
          ))}
        </div>
      )}
      {available.length === 0 && search && (
        <p
          className="text-xs text-center py-2"
          style={{ color: "rgba(245,245,245,0.3)" }}
        >
          No slimes match
        </p>
      )}
      {!showAddNew ? (
        <button
          type="button"
          onClick={() => setShowAddNew(true)}
          className="w-full py-2.5 rounded-lg text-xs font-bold transition-all"
          style={{
            color: "#FF00E5",
            background: "rgba(255,0,229,0.06)",
            border: "1px solid rgba(255,0,229,0.2)",
            fontFamily: "Montserrat, sans-serif",
          }}
        >
          + Create New Slime
        </button>
      ) : (
        <div
          className="rounded-xl p-3 space-y-3"
          style={{
            background: "rgba(255,0,229,0.05)",
            border: "1px solid rgba(255,0,229,0.2)",
          }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "#FF00E5", fontFamily: "Montserrat, sans-serif" }}
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
            onChange={(e) => setNewType(e.target.value as SlimeType)}
            className={inputClass}
            style={selectStyle}
          >
            {(Object.entries(SLIME_TYPE_LABELS) as [SlimeType, string][]).map(
              ([val, label]) => (
                <option key={val} value={val} style={{ background: "#0F0A1A" }}>
                  {label}
                </option>
              ),
            )}
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAddNew(false)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold"
              style={{
                color: "rgba(245,245,245,0.4)",
                background: "rgba(45,10,78,0.3)",
                border: "1px solid rgba(45,10,78,0.6)",
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
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                color: "#0A0A0A",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              {addingNew ? "Adding..." : "Add to Drop"}
            </button>
          </div>
        </div>
      )}
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
): Array<{
  name: string;
  description: string | null;
  shop_url: string | null;
  brand_id: string;
  announced_by: string;
  drop_at: string;
  status: DropStatus;
  recurrence_pattern: RecurrencePattern;
  parent_drop_id: string;
}> {
  const results = [];
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
  const [attachedSlimes, setAttachedSlimes] = useState<BrandSlime[]>([]);
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurrencePattern, setRecurrencePattern] =
    useState<RecurrencePattern>(DEFAULT_RECURRENCE);
  const supabase = createClient();

  const emptyForm = {
    name: "",
    description: "",
    drop_at: "",
    status: "announced" as DropStatus,
    shop_url: "",
  };
  const [form, setForm] = useState(emptyForm);

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
      .select("slime_id, slimes(id, name, slime_type, colors, image_url)")
      .eq("drop_id", selectedId)
      .then(({ data }: { data: Array<Record<string, unknown>> | null }) => {
        const slimes = (data ?? [])
          .map((r) => r.slimes as BrandSlime)
          .filter(Boolean);
        setAttachedSlimes(slimes);
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
    setMode("create");
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
      await supabase
        .from("drop_slimes")
        .insert(
          attachedSlimes.map((s) => ({ drop_id: newDrop.id, slime_id: s.id })),
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

  const handleAttachSlime = async (slime: BrandSlime) => {
    if (!selectedId) {
      setAttachedSlimes((prev) => [...prev, slime]);
      return;
    }
    await supabase
      .from("drop_slimes")
      .insert({ drop_id: selectedId, slime_id: slime.id });
    setAttachedSlimes((prev) => [...prev, slime]);
  };

  const handleDetachSlime = async (slimeId: string) => {
    if (selectedId)
      await supabase
        .from("drop_slimes")
        .delete()
        .eq("drop_id", selectedId)
        .eq("slime_id", slimeId);
    setAttachedSlimes((prev) => prev.filter((s) => s.id !== slimeId));
  };

  const handleAddNewSlime = async (slimeData: {
    name: string;
    slime_type: SlimeType;
  }): Promise<BrandSlime | null> => {
    const { data, error: err } = await supabase
      .from("slimes")
      .insert({
        brand_id: brandId,
        name: slimeData.name,
        slime_type: slimeData.slime_type,
        is_brand_official: true,
        created_by: userId,
      })
      .select("id, name, slime_type, colors, image_url")
      .single();
    if (err || !data) return null;
    const newSlime = data as BrandSlime;
    if (selectedId)
      await supabase
        .from("drop_slimes")
        .insert({ drop_id: selectedId, slime_id: newSlime.id });
    setAttachedSlimes((prev) => [...prev, newSlime]);
    return newSlime;
  };

  const DetailPanel = () => {
    if (!selected) return null;
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
            color: "rgba(245,245,245,0.4)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {formatDate(selected.drop_at)}
        </p>
        {selected.recurrence_pattern && (
          <div
            className="px-3 py-2 rounded-lg text-xs"
            style={{
              background: "rgba(57,255,20,0.07)",
              border: "1px solid rgba(57,255,20,0.2)",
              color: "#39FF14",
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
            style={{ color: "#00F0FF" }}
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
        {NEXT_STATUS[selected.status] && (
          <div>
            <p
              className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: "#00F0FF", fontFamily: "Montserrat, sans-serif" }}
            >
              Update Status
            </p>
            <div className="flex gap-2 flex-wrap">
              {NEXT_STATUS[selected.status]!.map((action) => (
                <button
                  key={action.status}
                  onClick={() => handleStatusChange(selected.id, action.status)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background:
                      action.status === "live"
                        ? "linear-gradient(135deg, #39FF14, #00F0FF)"
                        : "rgba(45,10,78,0.4)",
                    color:
                      action.status === "live"
                        ? "#0A0A0A"
                        : "rgba(245,245,245,0.7)",
                    border:
                      action.status !== "live"
                        ? "1px solid rgba(45,10,78,0.7)"
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
          style={{ borderTop: "1px solid rgba(45,10,78,0.4)", paddingTop: 16 }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "#FF00E5", fontFamily: "Montserrat, sans-serif" }}
          >
            Slimes in Drop
          </p>
          <SlimePicker
            brandId={brandId}
            attached={attachedSlimes}
            onAttach={handleAttachSlime}
            onDetach={handleDetachSlime}
            onAddNew={handleAddNewSlime}
          />
        </div>
        <div
          style={{ borderTop: "1px solid rgba(45,10,78,0.4)", paddingTop: 16 }}
        >
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{
                color: "#FF4444",
                background: "rgba(255,68,68,0.08)",
                border: "1px solid rgba(255,68,68,0.2)",
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
                onClick={handleDelete}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{
                  color: "#FF4444",
                  background: "rgba(255,68,68,0.15)",
                  border: "1px solid rgba(255,68,68,0.3)",
                }}
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs"
                style={{ color: "rgba(245,245,245,0.4)" }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const CreatePanel = () => (
    <div className="p-6 overflow-y-auto flex-1">
      <div className="flex items-center justify-between mb-6">
        <h2
          className="text-xl font-bold text-white"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          New Drop
        </h2>
        <button
          onClick={() => setMode("empty")}
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{
            color: "rgba(245,245,245,0.4)",
            background: "rgba(45,10,78,0.3)",
          }}
        >
          Cancel
        </button>
      </div>
      <div className="space-y-4 max-w-xl">
        <div>
          <FormLabel>Drop Name *</FormLabel>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Summer Pastel Collection"
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <FormLabel>Date & Time</FormLabel>
          <DateTimePicker
            value={form.drop_at}
            onChange={(iso) => setForm((f) => ({ ...f, drop_at: iso }))}
          />
        </div>
        <div>
          <FormLabel>Status</FormLabel>
          <select
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as DropStatus })
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
                {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FormLabel>Description</FormLabel>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="Tell fans what to expect..."
            className={`${inputClass} resize-none`}
            style={inputStyle}
          />
        </div>
        <div>
          <FormLabel>Shop URL</FormLabel>
          <input
            type="url"
            value={form.shop_url}
            onChange={(e) => setForm({ ...form, shop_url: e.target.value })}
            placeholder="https://yourshop.com/drop"
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div
          style={{ borderTop: "1px solid rgba(45,10,78,0.4)", paddingTop: 16 }}
        >
          <FormLabel>Slimes in Drop</FormLabel>
          <SlimePicker
            brandId={brandId}
            attached={attachedSlimes}
            onAttach={handleAttachSlime}
            onDetach={handleDetachSlime}
            onAddNew={handleAddNewSlime}
          />
        </div>
        <RecurrenceBuilder
          enabled={recurringEnabled}
          onToggle={setRecurringEnabled}
          pattern={recurrencePattern}
          onChange={setRecurrencePattern}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          onClick={handleCreate}
          disabled={saving}
          className="px-6 py-2.5 rounded-lg text-sm font-bold text-[#0A0A0A] disabled:opacity-50 hover:opacity-90 transition-opacity"
          style={{
            background: "linear-gradient(135deg, #39FF14, #00F0FF)",
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
  );

  return (
    <div
      className="rounded-xl overflow-hidden flex"
      style={{
        background: "rgba(45,10,78,0.15)",
        border: "1px solid rgba(45,10,78,0.7)",
        height: "calc(100vh - 200px)",
        minHeight: "520px",
      }}
    >
      {/* ── Left panel ── */}
      <div
        className="flex flex-col flex-shrink-0 w-full md:w-80"
        style={{ borderRight: "1px solid rgba(45,10,78,0.6)" }}
      >
        <div
          className="flex gap-1 p-3"
          style={{ borderBottom: "1px solid rgba(45,10,78,0.5)" }}
        >
          {(["upcoming", "past"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 text-xs font-semibold py-1.5 rounded-md capitalize transition-all"
              style={{
                background: tab === t ? "rgba(57,255,20,0.1)" : "transparent",
                color: tab === t ? "#39FF14" : "rgba(245,245,245,0.4)",
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
                  color: "rgba(245,245,245,0.3)",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {tab === "upcoming" ? "No upcoming drops" : "No past drops"}
              </p>
            </div>
          ) : (
            displayed.map((drop) => {
              const styles = STATUS_STYLES[drop.status];
              return (
                <button
                  key={drop.id}
                  onClick={() => {
                    setSelectedId(drop.id);
                    setMode("detail");
                    setConfirmDelete(false);
                    setAttachedSlimes([]);
                  }}
                  className="w-full text-left px-4 py-3.5 transition-all"
                  style={{
                    background:
                      selectedId === drop.id
                        ? "rgba(57,255,20,0.05)"
                        : "transparent",
                    borderLeft:
                      selectedId === drop.id
                        ? "3px solid #39FF14"
                        : "3px solid transparent",
                    borderBottom: "1px solid rgba(45,10,78,0.4)",
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
                        color: styles.color,
                        background: styles.bg,
                        border: `1px solid ${styles.border}`,
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      {drop.status === "live" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      )}
                      {styles.label.toUpperCase()}
                    </span>
                  </div>
                  <p
                    className="text-xs mt-1"
                    style={{
                      color: "rgba(245,245,245,0.35)",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    {formatDate(drop.drop_at)}
                  </p>
                  {drop.recurrence_pattern && (
                    <p
                      className="text-[10px] mt-0.5"
                      style={{ color: "rgba(57,255,20,0.5)" }}
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
          style={{ borderTop: "1px solid rgba(45,10,78,0.5)" }}
        >
          <button
            onClick={startCreate}
            className="w-full py-2.5 rounded-lg text-sm font-bold text-[#0A0A0A] hover:opacity-90 transition-opacity"
            style={{
              background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            + New Drop
          </button>
        </div>
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
              border: "1px solid rgba(45,10,78,0.8)",
              maxHeight: "90vh",
            }}
          >
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0"
              style={{
                background: "#0A0A0A",
                borderBottom: "1px solid rgba(45,10,78,0.4)",
              }}
            >
              <div
                className="w-8 h-1 rounded-full absolute left-1/2 -translate-x-1/2 top-2"
                style={{ background: "rgba(45,10,78,0.8)" }}
              />
              <p
                className="text-sm font-bold text-white mt-2"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                {mode === "create" ? "New Drop" : selected?.name}
              </p>
              <button
                onClick={() => {
                  setMode("empty");
                  setSelectedId(null);
                }}
                className="mt-2 p-1.5 rounded-lg"
                style={{
                  color: "rgba(245,245,245,0.4)",
                  background: "rgba(45,10,78,0.3)",
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
            <div className="overflow-y-auto flex-1 px-5 py-4 pb-10">
              {mode === "detail" && selected && <DetailPanel />}
              {mode === "create" && <CreatePanel />}
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop right panel ── */}
      <div className="hidden md:flex flex-1 flex-col overflow-hidden">
        {mode === "empty" && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center"
                style={{
                  background: "rgba(45,10,78,0.4)",
                  border: "1px solid rgba(45,10,78,0.7)",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ color: "rgba(245,245,245,0.2)" }}
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
                  color: "rgba(245,245,245,0.3)",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Select a drop to view details or create a new one
              </p>
            </div>
          </div>
        )}
        {mode === "detail" && selected && <DetailPanel />}
        {mode === "create" && <CreatePanel />}
      </div>
    </div>
  );
}

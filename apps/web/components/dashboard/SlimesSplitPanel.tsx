"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SLIME_TYPES = [
  "butter",
  "clear",
  "cloud",
  "icee",
  "fluffy",
  "floam",
  "snow_fizz",
  "thick_and_glossy",
  "jelly",
  "beaded",
  "clay",
  "cloud_cream",
  "magnetic",
  "thermochromic",
  "avalanche",
  "slay",
];

const TYPE_DISPLAY: Record<string, string> = Object.fromEntries(
  SLIME_TYPES.map((t) => [
    t,
    t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  ]),
);

type FilterTab = "all" | "active" | "limited" | "discontinued";

interface Slime {
  id: string;
  name: string;
  slime_type: string;
  description: string | null;
  colors: string[] | null;
  scent: string | null;
  retail_price: number | null;
  is_limited: boolean;
  is_discontinued: boolean;
  avg_texture: number | null;
  avg_scent: number | null;
  avg_sound: number | null;
  avg_drizzle: number | null;
  avg_creativity: number | null;
  avg_sensory_fit: number | null;
  avg_overall: number | null;
  total_ratings: number | null;
  image_url: string | null;
}

interface SlimesSplitPanelProps {
  brandId: string;
  userId: string;
  initialSlimes: Slime[];
}

type PanelMode = "empty" | "detail" | "add" | "edit";

const DIMENSIONS = [
  { key: "avg_texture", label: "Texture" },
  { key: "avg_scent", label: "Scent" },
  { key: "avg_sound", label: "Sound" },
  { key: "avg_drizzle", label: "Drizzle" },
  { key: "avg_creativity", label: "Creativity" },
  { key: "avg_sensory_fit", label: "Sensory Fit" },
];

function RatingBar({ label, value }: { label: string; value: number | null }) {
  const pct = value ? (value / 5) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span
          className="text-xs"
          style={{
            color: "rgba(245,245,245,0.5)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {label}
        </span>
        <span
          className="text-xs font-semibold"
          style={{
            color: value ? "#39FF14" : "rgba(245,245,245,0.2)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {value ? value.toFixed(1) : "—"}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(45,10,78,0.6)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #39FF14, #00F0FF)",
          }}
        />
      </div>
    </div>
  );
}

function FormInput({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block text-xs font-bold uppercase tracking-widest mb-1.5"
        style={{
          color: "rgba(245,245,245,0.4)",
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        {label}
        {required && <span style={{ color: "#FF00E5" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none transition-colors focus:ring-1 focus:ring-[#39FF14]/30";
const inputStyle = {
  background: "rgba(45,10,78,0.35)",
  border: "1px solid rgba(45,10,78,0.8)",
  fontFamily: "Inter, sans-serif",
};

export default function SlimesSplitPanel({
  brandId,
  userId,
  initialSlimes,
}: SlimesSplitPanelProps) {
  const [slimes, setSlimes] = useState<Slime[]>(initialSlimes);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<PanelMode>("empty");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [colorInput, setColorInput] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const supabase = createClient();

  const emptyForm = {
    name: "",
    slime_type: "butter",
    description: "",
    scent: "",
    retail_price: "",
    is_limited: false,
    is_discontinued: false,
  };
  const [form, setForm] = useState(emptyForm);

  const selected = slimes.find((s) => s.id === selectedId) ?? null;

  const filtered = slimes.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all"
        ? true
        : filter === "active"
          ? !s.is_discontinued
          : filter === "limited"
            ? s.is_limited
            : filter === "discontinued"
              ? s.is_discontinued
              : true;
    return matchSearch && matchFilter;
  });

  const startAdd = () => {
    setSelectedId(null);
    setForm(emptyForm);
    setColors([]);
    setColorInput("");
    setError(null);
    setMode("add");
  };

  const startEdit = (slime: Slime) => {
    setForm({
      name: slime.name,
      slime_type: slime.slime_type,
      description: slime.description ?? "",
      scent: slime.scent ?? "",
      retail_price: slime.retail_price?.toString() ?? "",
      is_limited: slime.is_limited,
      is_discontinued: slime.is_discontinued,
    });
    setColors(slime.colors ?? []);
    setColorInput("");
    setError(null);
    setMode("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Slime name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      slime_type: form.slime_type,
      description: form.description || null,
      colors: colors.length > 0 ? colors : null,
      scent: form.scent || null,
      retail_price: form.retail_price ? parseFloat(form.retail_price) : null,
      is_limited: form.is_limited,
      is_discontinued: form.is_discontinued,
    };
    if (mode === "add") {
      const { data, error: err } = await supabase
        .from("slimes")
        .insert({
          ...payload,
          brand_id: brandId,
          is_brand_official: true,
          created_by: userId,
        })
        .select()
        .single();
      setSaving(false);
      if (err) {
        setError(err.message);
        return;
      }
      if (data) {
        setSlimes([data as Slime, ...slimes]);
        setSelectedId(data.id);
        setMode("detail");
      }
    } else if (mode === "edit" && selectedId) {
      const { data, error: err } = await supabase
        .from("slimes")
        .update(payload)
        .eq("id", selectedId)
        .select()
        .single();
      setSaving(false);
      if (err) {
        setError(err.message);
        return;
      }
      if (data) {
        setSlimes(
          slimes.map((s) => (s.id === selectedId ? (data as Slime) : s)),
        );
        setMode("detail");
      }
    }
  };

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "limited", label: "Limited" },
    { key: "discontinued", label: "Discontinued" },
  ];

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
      {/* ── Left Panel: List ── */}
      <div
        className="flex flex-col flex-shrink-0 w-full md:w-80"
        style={{ borderRight: "1px solid rgba(45,10,78,0.6)" }}
      >
        {/* Search */}
        <div
          className="p-3"
          style={{ borderBottom: "1px solid rgba(45,10,78,0.5)" }}
        >
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
              style={{ color: "rgba(245,245,245,0.3)" }}
              viewBox="0 0 16 16"
              fill="none"
            >
              <circle
                cx="7"
                cy="7"
                r="5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M10.5 10.5L14 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search slimes..."
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg outline-none text-white"
              style={{
                background: "rgba(45,10,78,0.3)",
                border: "1px solid rgba(45,10,78,0.7)",
                fontFamily: "Inter, sans-serif",
              }}
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div
          className="flex overflow-x-auto scrollbar-none px-3 py-2 gap-1.5"
          style={{ borderBottom: "1px solid rgba(45,10,78,0.5)" }}
        >
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-md transition-all"
              style={{
                background:
                  filter === tab.key ? "rgba(57,255,20,0.12)" : "transparent",
                color: filter === tab.key ? "#39FF14" : "rgba(245,245,245,0.4)",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Slime list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-6 text-center">
              <p
                className="text-sm"
                style={{
                  color: "rgba(245,245,245,0.3)",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                No slimes found
              </p>
            </div>
          ) : (
            filtered.map((slime) => (
              <button
                key={slime.id}
                onClick={() => {
                  setSelectedId(slime.id);
                  setMode("detail");
                }}
                className="w-full text-left px-4 py-3 transition-all"
                style={{
                  background:
                    selectedId === slime.id
                      ? "rgba(57,255,20,0.06)"
                      : "transparent",
                  borderLeft:
                    selectedId === slime.id
                      ? "3px solid #39FF14"
                      : "3px solid transparent",
                  borderBottom: "1px solid rgba(45,10,78,0.4)",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className="text-sm font-medium text-white truncate"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {slime.name}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{
                        color: "rgba(245,245,245,0.4)",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {TYPE_DISPLAY[slime.slime_type] ?? slime.slime_type}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className="text-xs font-bold"
                      style={{
                        color: slime.avg_overall
                          ? "#39FF14"
                          : "rgba(245,245,245,0.2)",
                      }}
                    >
                      {slime.avg_overall ? slime.avg_overall.toFixed(1) : "—"}
                    </p>
                    <p
                      className="text-[10px]"
                      style={{ color: "rgba(245,245,245,0.3)" }}
                    >
                      {slime.total_ratings ?? 0} rated
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 mt-1.5">
                  {slime.is_limited && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-widest"
                      style={{
                        color: "#FF00E5",
                        background: "rgba(255,0,229,0.1)",
                      }}
                    >
                      LIMITED
                    </span>
                  )}
                  {slime.is_discontinued && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-widest"
                      style={{
                        color: "rgba(245,245,245,0.3)",
                        background: "rgba(45,10,78,0.4)",
                      }}
                    >
                      DISC
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Add button */}
        <div
          className="p-3"
          style={{ borderTop: "1px solid rgba(45,10,78,0.5)" }}
        >
          <button
            onClick={startAdd}
            className="w-full py-2.5 rounded-lg text-sm font-bold text-[#0A0A0A] transition-opacity hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            + Add Slime
          </button>
        </div>
      </div>

      {/* ── Mobile sheet overlay ── */}
      {(mode === "detail" || mode === "add" || mode === "edit") && (
        <div
          className="md:hidden fixed inset-0 z-50"
          style={{ background: "rgba(10,10,10,0.8)" }}
        >
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl overflow-y-auto"
            style={{
              background: "#0A0A0A",
              border: "1px solid rgba(45,10,78,0.8)",
              maxHeight: "85vh",
            }}
          >
            {/* Handle + close */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-5 pt-4 pb-3"
              style={{
                background: "#0A0A0A",
                borderBottom: "1px solid rgba(45,10,78,0.4)",
              }}
            >
              <div
                className="w-8 h-1 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2"
                style={{ background: "rgba(45,10,78,0.8)" }}
              />
              <p
                className="text-sm font-bold text-white mt-2"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                {mode === "add"
                  ? "Add Slime"
                  : mode === "edit"
                    ? "Edit Slime"
                    : selected?.name}
              </p>
              <button
                onClick={() => setMode("empty")}
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

            <div className="px-5 py-4 pb-10">
              {mode === "detail" && selected && (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        label: "Overall",
                        value: selected.avg_overall?.toFixed(1) ?? "—",
                        accent: "#39FF14",
                      },
                      {
                        label: "Ratings",
                        value: selected.total_ratings?.toLocaleString() ?? "0",
                        accent: "#fff",
                      },
                      {
                        label: "Price",
                        value: selected.retail_price
                          ? `$${selected.retail_price}`
                          : "—",
                        accent: "rgba(245,245,245,0.5)",
                      },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="rounded-lg p-3 text-center"
                        style={{
                          background: "rgba(45,10,78,0.3)",
                          border: "1px solid rgba(45,10,78,0.6)",
                        }}
                      >
                        <p
                          className="text-[10px] mb-1"
                          style={{
                            color: "rgba(245,245,245,0.4)",
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          {s.label}
                        </p>
                        <p
                          className="text-base font-bold"
                          style={{
                            color: s.accent,
                            fontFamily: "Montserrat, sans-serif",
                          }}
                        >
                          {s.value}
                        </p>
                      </div>
                    ))}
                  </div>
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
                  <div className="space-y-2.5">
                    {DIMENSIONS.map((d) => (
                      <RatingBar
                        key={d.key}
                        label={d.label}
                        value={(selected as any)[d.key]}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => startEdit(selected)}
                    className="w-full py-2.5 rounded-lg text-sm font-bold text-[#0A0A0A]"
                    style={{
                      background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    Edit Slime
                  </button>
                </div>
              )}

              {(mode === "add" || mode === "edit") && (
                <div className="space-y-4">
                  <FormInput label="Slime Name" required>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="e.g. Midnight Butter"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </FormInput>
                  <FormInput label="Type">
                    <select
                      value={form.slime_type}
                      onChange={(e) =>
                        setForm({ ...form, slime_type: e.target.value })
                      }
                      className={inputClass}
                      style={{ ...inputStyle, appearance: "none" as const }}
                    >
                      {SLIME_TYPES.map((t) => (
                        <option
                          key={t}
                          value={t}
                          style={{ background: "#0F0A1A" }}
                        >
                          {TYPE_DISPLAY[t]}
                        </option>
                      ))}
                    </select>
                  </FormInput>
                  <FormInput label="Description">
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      rows={3}
                      className={`${inputClass} resize-none`}
                      style={inputStyle}
                      placeholder="Describe this slime..."
                    />
                  </FormInput>
                  <FormInput label="Scent">
                    <input
                      type="text"
                      value={form.scent}
                      onChange={(e) =>
                        setForm({ ...form, scent: e.target.value })
                      }
                      placeholder="vanilla..."
                      className={inputClass}
                      style={inputStyle}
                    />
                  </FormInput>
                  <FormInput label="Retail Price (USD)">
                    <input
                      type="number"
                      value={form.retail_price}
                      onChange={(e) =>
                        setForm({ ...form, retail_price: e.target.value })
                      }
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </FormInput>
                  <div className="flex gap-4">
                    {[
                      { key: "is_limited", label: "Limited" },
                      { key: "is_discontinued", label: "Discontinued" },
                    ].map((tog) => (
                      <label
                        key={tog.key}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <button
                          onClick={() =>
                            setForm({
                              ...form,
                              [tog.key]: !(form as any)[tog.key],
                            })
                          }
                          className="w-9 h-5 rounded-full relative transition-all"
                          style={{
                            background: (form as any)[tog.key]
                              ? "#39FF14"
                              : "rgba(45,10,78,0.6)",
                          }}
                        >
                          <span
                            className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                            style={{
                              left: (form as any)[tog.key] ? "18px" : "2px",
                            }}
                          />
                        </button>
                        <span
                          className="text-sm"
                          style={{
                            color: "rgba(245,245,245,0.6)",
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          {tog.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-3 rounded-lg text-sm font-bold text-[#0A0A0A] disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    {saving
                      ? "Saving..."
                      : mode === "add"
                        ? "Add to Catalog"
                        : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Right Panel ── */}
      <div className="hidden md:flex flex-1 flex-col overflow-y-auto">
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
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
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
                Select a slime to view details or add a new one
              </p>
            </div>
          </div>
        )}

        {mode === "detail" && selected && (
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2
                  className="text-xl font-bold text-white"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  {selected.name}
                </h2>
                <p
                  className="text-sm mt-1"
                  style={{
                    color: "rgba(245,245,245,0.5)",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {TYPE_DISPLAY[selected.slime_type] ?? selected.slime_type}
                  {selected.retail_price && ` · $${selected.retail_price}`}
                </p>
              </div>
              <button
                onClick={() => startEdit(selected)}
                className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: "rgba(57,255,20,0.08)",
                  border: "1px solid rgba(57,255,20,0.2)",
                  color: "#39FF14",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                Edit
              </button>
            </div>

            {selected.description && (
              <p
                className="text-sm mb-6"
                style={{
                  color: "rgba(245,245,245,0.6)",
                  fontFamily: "Inter, sans-serif",
                  lineHeight: 1.6,
                }}
              >
                {selected.description}
              </p>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                {
                  label: "Overall",
                  value: selected.avg_overall?.toFixed(1) ?? "—",
                  accent: "#39FF14",
                },
                {
                  label: "Total Ratings",
                  value: selected.total_ratings?.toLocaleString() ?? "0",
                  accent: "#fff",
                },
                {
                  label: "Price",
                  value: selected.retail_price
                    ? `$${selected.retail_price}`
                    : "—",
                  accent: "rgba(245,245,245,0.5)",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg p-3 text-center"
                  style={{
                    background: "rgba(45,10,78,0.3)",
                    border: "1px solid rgba(45,10,78,0.6)",
                  }}
                >
                  <p
                    className="text-xs mb-1"
                    style={{
                      color: "rgba(245,245,245,0.4)",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    {s.label}
                  </p>
                  <p
                    className="text-lg font-bold"
                    style={{
                      color: s.accent,
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Rating dimensions */}
            <div className="mb-6 space-y-3">
              <p
                className="text-xs font-bold uppercase tracking-widest"
                style={{
                  color: "#00F0FF",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                Rating Breakdown
              </p>
              {DIMENSIONS.map((d) => (
                <RatingBar
                  key={d.key}
                  label={d.label}
                  value={(selected as any)[d.key]}
                />
              ))}
            </div>

            {/* Colors & Scent */}
            {(selected.colors?.length || selected.scent) && (
              <div className="space-y-3">
                {selected.colors && selected.colors.length > 0 && (
                  <div>
                    <p
                      className="text-xs font-bold uppercase tracking-widest mb-2"
                      style={{
                        color: "#00F0FF",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      Colors
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.colors.map((c) => (
                        <span
                          key={c}
                          className="text-xs px-2.5 py-1 rounded-full"
                          style={{
                            background: "rgba(45,10,78,0.4)",
                            color: "rgba(245,245,245,0.7)",
                            border: "1px solid rgba(45,10,78,0.7)",
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selected.scent && (
                  <div>
                    <p
                      className="text-xs font-bold uppercase tracking-widest mb-1"
                      style={{
                        color: "#00F0FF",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      Scent
                    </p>
                    <p
                      className="text-sm"
                      style={{
                        color: "rgba(245,245,245,0.6)",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {selected.scent}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {(mode === "add" || mode === "edit") && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-xl font-bold text-white"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                {mode === "add" ? "Add New Slime" : "Edit Slime"}
              </h2>
              <button
                onClick={() => setMode(selectedId ? "detail" : "empty")}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{
                  color: "rgba(245,245,245,0.4)",
                  background: "rgba(45,10,78,0.3)",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Cancel
              </button>
            </div>

            <div className="space-y-4 max-w-xl">
              <FormInput label="Slime Name" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Midnight Butter"
                  className={inputClass}
                  style={inputStyle}
                />
              </FormInput>

              <FormInput label="Type">
                <select
                  value={form.slime_type}
                  onChange={(e) =>
                    setForm({ ...form, slime_type: e.target.value })
                  }
                  className={inputClass}
                  style={{ ...inputStyle, appearance: "none" }}
                >
                  {SLIME_TYPES.map((t) => (
                    <option key={t} value={t} style={{ background: "#0F0A1A" }}>
                      {TYPE_DISPLAY[t]}
                    </option>
                  ))}
                </select>
              </FormInput>

              <FormInput label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  className={`${inputClass} resize-none`}
                  style={inputStyle}
                  placeholder="Describe this slime..."
                />
              </FormInput>

              <FormInput label="Colors (Enter to add)">
                <input
                  type="text"
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && colorInput.trim()) {
                      e.preventDefault();
                      if (!colors.includes(colorInput.trim()))
                        setColors([...colors, colorInput.trim()]);
                      setColorInput("");
                    }
                  }}
                  placeholder="pink, lavender..."
                  className={inputClass}
                  style={inputStyle}
                />
                {colors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {colors.map((c) => (
                      <span
                        key={c}
                        className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5"
                        style={{
                          background: "rgba(57,255,20,0.08)",
                          color: "#39FF14",
                          border: "1px solid rgba(57,255,20,0.2)",
                          fontFamily: "Inter, sans-serif",
                        }}
                      >
                        {c}
                        <button
                          onClick={() =>
                            setColors(colors.filter((x) => x !== c))
                          }
                          className="opacity-60 hover:opacity-100 leading-none"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </FormInput>

              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Scent">
                  <input
                    type="text"
                    value={form.scent}
                    onChange={(e) =>
                      setForm({ ...form, scent: e.target.value })
                    }
                    placeholder="vanilla..."
                    className={inputClass}
                    style={inputStyle}
                  />
                </FormInput>
                <FormInput label="Retail Price (USD)">
                  <input
                    type="number"
                    value={form.retail_price}
                    onChange={(e) =>
                      setForm({ ...form, retail_price: e.target.value })
                    }
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    style={inputStyle}
                  />
                </FormInput>
              </div>

              <div className="flex gap-6">
                {[
                  { key: "is_limited", label: "Limited Edition" },
                  { key: "is_discontinued", label: "Discontinued" },
                ].map((tog) => (
                  <label
                    key={tog.key}
                    className="flex items-center gap-2.5 cursor-pointer"
                  >
                    <button
                      onClick={() =>
                        setForm({ ...form, [tog.key]: !(form as any)[tog.key] })
                      }
                      className="w-9 h-5 rounded-full relative transition-all"
                      style={{
                        background: (form as any)[tog.key]
                          ? "#39FF14"
                          : "rgba(45,10,78,0.6)",
                      }}
                    >
                      <span
                        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                        style={{
                          left: (form as any)[tog.key] ? "18px" : "2px",
                        }}
                      />
                    </button>
                    <span
                      className="text-sm"
                      style={{
                        color: "rgba(245,245,245,0.6)",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {tog.label}
                    </span>
                  </label>
                ))}
              </div>

              {error && (
                <p
                  className="text-xs text-red-400"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {error}
                </p>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-lg text-sm font-bold text-[#0A0A0A] disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {saving
                  ? "Saving..."
                  : mode === "add"
                    ? "Add to Catalog"
                    : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

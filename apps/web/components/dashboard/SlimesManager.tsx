"use client";

import { useState, useRef } from "react";
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
  avg_overall: number | null;
  total_ratings: number | null;
  image_url: string | null;
}

interface SlimesManagerProps {
  brandId: string;
  initialSlimes: Slime[];
  userId: string;
}

export default function SlimesManager({
  brandId,
  initialSlimes,
  userId,
}: SlimesManagerProps) {
  const [slimes, setSlimes] = useState<Slime[]>(initialSlimes);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [colorInput, setColorInput] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const supabase = createClient();

  const [form, setForm] = useState({
    name: "",
    slime_type: "butter",
    description: "",
    scent: "",
    retail_price: "",
    is_limited: false,
  });

  const filteredSlimes = slimes.filter((s) => {
    if (filter === "active") return !s.is_discontinued;
    if (filter === "limited") return s.is_limited;
    if (filter === "discontinued") return s.is_discontinued;
    return true;
  });

  const handleAddColor = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && colorInput.trim()) {
      e.preventDefault();
      if (!colors.includes(colorInput.trim())) {
        setColors([...colors, colorInput.trim()]);
      }
      setColorInput("");
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError("Slime name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("slimes")
      .insert({
        brand_id: brandId,
        name: form.name.trim(),
        slime_type: form.slime_type,
        description: form.description || null,
        colors: colors.length > 0 ? colors : null,
        scent: form.scent || null,
        retail_price: form.retail_price ? parseFloat(form.retail_price) : null,
        is_limited: form.is_limited,
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
    if (data) setSlimes([data as Slime, ...slimes]);
    setShowModal(false);
    setForm({
      name: "",
      slime_type: "butter",
      description: "",
      scent: "",
      retail_price: "",
      is_limited: false,
    });
    setColors([]);
  };

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: `All (${slimes.length})` },
    { key: "active", label: "Active" },
    { key: "limited", label: "Limited" },
    { key: "discontinued", label: "Discontinued" },
  ];

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#00F0FF]">
            Your Slimes
          </p>
          <p className="text-2xl font-bold text-white">
            {slimes.length} products
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-full text-sm font-bold text-[#0A0A0A]"
          style={{ background: "linear-gradient(135deg, #39FF14, #00F0FF)" }}
        >
          + Add Slime
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background:
                filter === tab.key
                  ? "rgba(57,255,20,0.15)"
                  : "rgba(45,10,78,0.4)",
              color: filter === tab.key ? "#39FF14" : "#6B5A7E",
              border:
                filter === tab.key
                  ? "1px solid rgba(57,255,20,0.3)"
                  : "1px solid rgba(45,10,78,0.7)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Slime Grid */}
      {filteredSlimes.length === 0 ? (
        <div
          className="rounded-xl p-8 border text-center"
          style={{
            background: "rgba(45,10,78,0.25)",
            borderColor: "rgba(45,10,78,0.7)",
          }}
        >
          <p className="text-4xl mb-3">🧪</p>
          <p className="text-[#9B8AAE] text-sm">
            No slimes here yet. Add your first!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredSlimes.map((slime) => (
            <div
              key={slime.id}
              className="rounded-xl border overflow-hidden"
              style={{
                background: "rgba(45,10,78,0.25)",
                borderColor: "rgba(45,10,78,0.7)",
              }}
            >
              {/* Color swatch or image */}
              <div
                className="h-20 flex items-center justify-center"
                style={{
                  background: slime.colors?.[0]
                    ? `linear-gradient(135deg, ${slime.colors[0]}, ${slime.colors[1] ?? slime.colors[0]})`
                    : "rgba(45,10,78,0.5)",
                }}
              >
                {!slime.image_url && !slime.colors?.length && (
                  <span className="text-3xl">🧪</span>
                )}
                {slime.image_url && (
                  <img
                    src={slime.image_url}
                    alt={slime.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-white truncate">
                  {slime.name}
                </p>
                <p className="text-xs text-[#6B5A7E] capitalize mt-0.5">
                  {slime.slime_type.replace(/_/g, " ")}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-bold text-[#39FF14]">
                    {slime.avg_overall
                      ? `${slime.avg_overall.toFixed(1)} ★`
                      : "—"}
                  </span>
                  <span className="text-xs text-[#6B5A7E]">
                    {slime.total_ratings ?? 0} ratings
                  </span>
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {slime.is_limited && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: "rgba(255,0,229,0.15)",
                        color: "#FF00E5",
                      }}
                    >
                      LIMITED
                    </span>
                  )}
                  {slime.is_discontinued && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: "rgba(107,90,126,0.3)",
                        color: "#9B8AAE",
                      }}
                    >
                      DISC.
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Slime Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(10,10,10,0.85)" }}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl border-t overflow-y-auto max-h-[90vh]"
            style={{ background: "#0F0A1A", borderColor: "rgba(45,10,78,0.9)" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-[#2D0A4E]" />
            </div>
            <div className="px-5 pb-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">Add Slime</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-[#6B5A7E] hover:text-white p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-[#6B5A7E] block mb-1.5">
                    Slime Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Midnight Butter"
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-[#39FF14]/40"
                    style={{
                      background: "rgba(45,10,78,0.4)",
                      border: "1px solid rgba(45,10,78,0.9)",
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-[#6B5A7E] block mb-1.5">
                    Slime Type
                  </label>
                  <select
                    value={form.slime_type}
                    onChange={(e) =>
                      setForm({ ...form, slime_type: e.target.value })
                    }
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                    style={{
                      background: "rgba(45,10,78,0.4)",
                      border: "1px solid rgba(45,10,78,0.9)",
                    }}
                  >
                    {SLIME_TYPES.map((t) => (
                      <option
                        key={t}
                        value={t}
                        style={{ background: "#0F0A1A" }}
                      >
                        {t
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-[#6B5A7E] block mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    rows={3}
                    placeholder="Tell the community about this slime..."
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none"
                    style={{
                      background: "rgba(45,10,78,0.4)",
                      border: "1px solid rgba(45,10,78,0.9)",
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-[#6B5A7E] block mb-1.5">
                    Colors (press Enter to add)
                  </label>
                  <input
                    type="text"
                    value={colorInput}
                    onChange={(e) => setColorInput(e.target.value)}
                    onKeyDown={handleAddColor}
                    placeholder="e.g. pink, lavender..."
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                    style={{
                      background: "rgba(45,10,78,0.4)",
                      border: "1px solid rgba(45,10,78,0.9)",
                    }}
                  />
                  {colors.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {colors.map((c) => (
                        <span
                          key={c}
                          className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5"
                          style={{
                            background: "rgba(57,255,20,0.1)",
                            color: "#39FF14",
                            border: "1px solid rgba(57,255,20,0.2)",
                          }}
                        >
                          {c}
                          <button
                            onClick={() =>
                              setColors(colors.filter((x) => x !== c))
                            }
                            className="opacity-60 hover:opacity-100"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-[#6B5A7E] block mb-1.5">
                    Scent
                  </label>
                  <input
                    type="text"
                    value={form.scent}
                    onChange={(e) =>
                      setForm({ ...form, scent: e.target.value })
                    }
                    placeholder="e.g. vanilla, strawberry..."
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                    style={{
                      background: "rgba(45,10,78,0.4)",
                      border: "1px solid rgba(45,10,78,0.9)",
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-[#6B5A7E] block mb-1.5">
                    Retail Price (USD)
                  </label>
                  <input
                    type="number"
                    value={form.retail_price}
                    onChange={(e) =>
                      setForm({ ...form, retail_price: e.target.value })
                    }
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                    style={{
                      background: "rgba(45,10,78,0.4)",
                      border: "1px solid rgba(45,10,78,0.9)",
                    }}
                  />
                </div>

                <div
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{
                    background: "rgba(45,10,78,0.25)",
                    border: "1px solid rgba(45,10,78,0.7)",
                  }}
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Limited Edition
                    </p>
                    <p className="text-xs text-[#6B5A7E]">
                      Mark as a limited release
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setForm({ ...form, is_limited: !form.is_limited })
                    }
                    className="w-11 h-6 rounded-full transition-all relative"
                    style={{
                      background: form.is_limited
                        ? "#39FF14"
                        : "rgba(45,10,78,0.8)",
                    }}
                  >
                    <span
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                      style={{ left: form.is_limited ? "22px" : "2px" }}
                    />
                  </button>
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="w-full py-3.5 rounded-xl font-bold text-[#0A0A0A] disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                  }}
                >
                  {saving ? "Saving..." : "Add to Catalog"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

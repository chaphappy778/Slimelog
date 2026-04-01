"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DropStatus = "announced" | "live" | "sold_out" | "restocked" | "cancelled";

interface Drop {
  id: string;
  name: string;
  description: string | null;
  drop_at: string | null;
  status: DropStatus;
  shop_url: string | null;
  cover_image_url: string | null;
}

interface DropsManagerProps {
  brandId: string;
  initialDrops: Drop[];
  userId: string;
}

const statusColors: Record<
  DropStatus,
  { color: string; bg: string; border: string }
> = {
  announced: {
    color: "#00F0FF",
    bg: "rgba(0,240,255,0.12)",
    border: "rgba(0,240,255,0.3)",
  },
  live: {
    color: "#39FF14",
    bg: "rgba(57,255,20,0.12)",
    border: "rgba(57,255,20,0.3)",
  },
  sold_out: {
    color: "#6B5A7E",
    bg: "rgba(107,90,126,0.2)",
    border: "rgba(107,90,126,0.4)",
  },
  restocked: {
    color: "#4488FF",
    bg: "rgba(68,136,255,0.12)",
    border: "rgba(68,136,255,0.3)",
  },
  cancelled: {
    color: "#FF4444",
    bg: "rgba(255,68,68,0.12)",
    border: "rgba(255,68,68,0.3)",
  },
};

const nextStatus: Partial<
  Record<DropStatus, { status: DropStatus; label: string }>
> = {
  announced: { status: "live", label: "Go Live" },
  live: { status: "sold_out", label: "Mark Sold Out" },
};

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

export default function DropsManager({
  brandId,
  initialDrops,
  userId,
}: DropsManagerProps) {
  const [drops, setDrops] = useState<Drop[]>(initialDrops);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const [form, setForm] = useState({
    name: "",
    description: "",
    drop_at: "",
    status: "announced" as DropStatus,
    shop_url: "",
  });

  const upcoming = drops.filter((d) =>
    ["announced", "live"].includes(d.status),
  );
  const past = drops.filter((d) =>
    ["sold_out", "restocked", "cancelled"].includes(d.status),
  );
  const displayed = tab === "upcoming" ? upcoming : past;

  const handleStatusChange = async (dropId: string, newStatus: DropStatus) => {
    const updates: Partial<Drop> = { status: newStatus };
    if (newStatus === "sold_out") updates.drop_at = new Date().toISOString();
    const { error: err } = await supabase
      .from("drops")
      .update(updates)
      .eq("id", dropId);
    if (!err)
      setDrops(drops.map((d) => (d.id === dropId ? { ...d, ...updates } : d)));
  };

  const handleDelete = async (dropId: string) => {
    if (!confirm("Delete this drop?")) return;
    const { error: err } = await supabase
      .from("drops")
      .delete()
      .eq("id", dropId);
    if (!err) setDrops(drops.filter((d) => d.id !== dropId));
  };

  const handleSubmit = async () => {
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
      })
      .select()
      .single();
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data) setDrops([data as Drop, ...drops]);
    setShowModal(false);
    setForm({
      name: "",
      description: "",
      drop_at: "",
      status: "announced",
      shop_url: "",
    });
  };

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#00F0FF]">
            Your Drops
          </p>
          <p className="text-2xl font-bold text-white">{drops.length} total</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-full text-sm font-bold text-[#0A0A0A]"
          style={{ background: "linear-gradient(135deg, #39FF14, #00F0FF)" }}
        >
          + New Drop
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold capitalize"
            style={{
              background:
                tab === t ? "rgba(57,255,20,0.15)" : "rgba(45,10,78,0.4)",
              color: tab === t ? "#39FF14" : "#6B5A7E",
              border:
                tab === t
                  ? "1px solid rgba(57,255,20,0.3)"
                  : "1px solid rgba(45,10,78,0.7)",
            }}
          >
            {t} ({t === "upcoming" ? upcoming.length : past.length})
          </button>
        ))}
      </div>

      {/* Drops List */}
      {displayed.length === 0 ? (
        <div
          className="rounded-xl p-8 border text-center"
          style={{
            background: "rgba(45,10,78,0.25)",
            borderColor: "rgba(45,10,78,0.7)",
          }}
        >
          <p className="text-4xl mb-3">📦</p>
          <p className="text-[#9B8AAE] text-sm">
            {tab === "upcoming"
              ? "No upcoming drops. Schedule one!"
              : "No past drops yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((drop) => {
            const styles = statusColors[drop.status];
            const advance = nextStatus[drop.status];
            return (
              <div
                key={drop.id}
                className="rounded-xl border p-4 space-y-3"
                style={{
                  background: "rgba(45,10,78,0.25)",
                  borderColor: "rgba(45,10,78,0.7)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{drop.name}</p>
                    <p className="text-xs text-[#6B5A7E] mt-0.5">
                      {formatDate(drop.drop_at)}
                    </p>
                    {drop.description && (
                      <p className="text-xs text-[#9B8AAE] mt-1 line-clamp-2">
                        {drop.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 flex items-center gap-1 ${drop.status === "live" ? "animate-pulse" : ""}`}
                    style={{
                      color: styles.color,
                      background: styles.bg,
                      border: `1px solid ${styles.border}`,
                    }}
                  >
                    {drop.status === "live" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    )}
                    {drop.status.replace(/_/g, " ").toUpperCase()}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {advance && (
                    <button
                      onClick={() =>
                        handleStatusChange(drop.id, advance.status)
                      }
                      className="text-xs font-bold px-3 py-1.5 rounded-full text-[#0A0A0A]"
                      style={{
                        background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                      }}
                    >
                      {advance.label}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(drop.id)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full text-[#FF4444]"
                    style={{
                      background: "rgba(255,68,68,0.1)",
                      border: "1px solid rgba(255,68,68,0.2)",
                    }}
                  >
                    Delete
                  </button>
                  {drop.shop_url && (
                    <a
                      href={drop.shop_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold px-3 py-1.5 rounded-full text-[#00F0FF] ml-auto"
                      style={{
                        background: "rgba(0,240,255,0.1)",
                        border: "1px solid rgba(0,240,255,0.2)",
                      }}
                    >
                      Shop Link ↗
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Drop Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(10,10,10,0.85)" }}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl border-t overflow-y-auto max-h-[85vh]"
            style={{ background: "#0F0A1A", borderColor: "rgba(45,10,78,0.9)" }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-[#2D0A4E]" />
            </div>
            <div className="px-5 pb-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">New Drop</h2>
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
                    Drop Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Summer Pastel Collection"
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                    style={{
                      background: "rgba(45,10,78,0.4)",
                      border: "1px solid rgba(45,10,78,0.9)",
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-[#6B5A7E] block mb-1.5">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={form.drop_at}
                    onChange={(e) =>
                      setForm({ ...form, drop_at: e.target.value })
                    }
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                    style={{
                      background: "rgba(45,10,78,0.4)",
                      border: "1px solid rgba(45,10,78,0.9)",
                      colorScheme: "dark",
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-[#6B5A7E] block mb-1.5">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as DropStatus })
                    }
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                    style={{
                      background: "rgba(45,10,78,0.4)",
                      border: "1px solid rgba(45,10,78,0.9)",
                    }}
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
                      <option
                        key={s}
                        value={s}
                        style={{ background: "#0F0A1A" }}
                      >
                        {s
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
                    placeholder="Tell fans what to expect..."
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none"
                    style={{
                      background: "rgba(45,10,78,0.4)",
                      border: "1px solid rgba(45,10,78,0.9)",
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-[#6B5A7E] block mb-1.5">
                    Shop URL
                  </label>
                  <input
                    type="url"
                    value={form.shop_url}
                    onChange={(e) =>
                      setForm({ ...form, shop_url: e.target.value })
                    }
                    placeholder="https://yourshop.com/drop"
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                    style={{
                      background: "rgba(45,10,78,0.4)",
                      border: "1px solid rgba(45,10,78,0.9)",
                    }}
                  />
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
                  {saving ? "Creating..." : "Create Drop"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

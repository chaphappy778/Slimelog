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

  const startCreate = () => {
    setSelectedId(null);
    setForm(emptyForm);
    setError(null);
    setConfirmDelete(false);
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
      })
      .select()
      .single();
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data) {
      setDrops([data as Drop, ...drops]);
      setSelectedId(data.id);
      setMode("detail");
    }
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
        {/* Tabs */}
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

        {/* Drop list */}
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
                </button>
              );
            })
          )}
        </div>

        {/* Create button */}
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

      {/* ── Mobile sheet overlay ── */}
      {(mode === "detail" && selected !== null) || mode === "create" ? (
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
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-5 pt-4 pb-3"
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
            <div className="px-5 py-4 pb-10">
              {mode === "detail" &&
                selected &&
                (() => {
                  const styles = STATUS_STYLES[selected.status];
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5"
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
                        <p
                          className="text-xs"
                          style={{
                            color: "rgba(245,245,245,0.4)",
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          {formatDate(selected.drop_at)}
                        </p>
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
                      {selected.shop_url && (
                        <a
                          href={selected.shop_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium"
                          style={{ color: "#00F0FF" }}
                        >
                          View Shop Link{" "}
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                          >
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
                        <div className="flex gap-2 flex-wrap">
                          {NEXT_STATUS[selected.status]!.map((action) => (
                            <button
                              key={action.status}
                              onClick={() =>
                                handleStatusChange(selected.id, action.status)
                              }
                              className="px-4 py-2 rounded-lg text-sm font-semibold"
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
                      )}
                      {!confirmDelete ? (
                        <button
                          onClick={() => setConfirmDelete(true)}
                          className="text-xs px-3 py-1.5 rounded-lg"
                          style={{
                            color: "#FF4444",
                            background: "rgba(255,68,68,0.08)",
                            border: "1px solid rgba(255,68,68,0.2)",
                          }}
                        >
                          Delete Drop
                        </button>
                      ) : (
                        <div className="flex items-center gap-3">
                          <p
                            className="text-xs"
                            style={{ color: "rgba(245,245,245,0.5)" }}
                          >
                            Are you sure?
                          </p>
                          <button
                            onClick={handleDelete}
                            className="text-xs px-3 py-1.5 rounded-lg"
                            style={{
                              color: "#FF4444",
                              background: "rgba(255,68,68,0.15)",
                              border: "1px solid rgba(255,68,68,0.3)",
                            }}
                          >
                            Confirm
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
                  );
                })()}

              {mode === "create" && (
                <div className="space-y-4">
                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                      style={{
                        color: "rgba(245,245,245,0.4)",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      Drop Name *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="Summer Pastel Collection"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                      style={{
                        color: "rgba(245,245,245,0.4)",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={form.drop_at}
                      onChange={(e) =>
                        setForm({ ...form, drop_at: e.target.value })
                      }
                      className={inputClass}
                      style={{ ...inputStyle, colorScheme: "dark" as const }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                      style={{
                        color: "rgba(245,245,245,0.4)",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      Description
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      rows={3}
                      className={`${inputClass} resize-none`}
                      style={inputStyle}
                      placeholder="Tell fans what to expect..."
                    />
                  </div>
                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                      style={{
                        color: "rgba(245,245,245,0.4)",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      Shop URL
                    </label>
                    <input
                      type="url"
                      value={form.shop_url}
                      onChange={(e) =>
                        setForm({ ...form, shop_url: e.target.value })
                      }
                      placeholder="https://yourshop.com/drop"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  <button
                    onClick={handleCreate}
                    disabled={saving}
                    className="w-full py-3 rounded-lg text-sm font-bold text-[#0A0A0A] disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    {saving ? "Creating..." : "Create Drop"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Right panel ── */}
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

        {mode === "detail" && selected && (
          <div className="p-6">
            <div className="flex items-start justify-between mb-2">
              <h2
                className="text-xl font-bold text-white"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                {selected.name}
              </h2>
              {(() => {
                const styles = STATUS_STYLES[selected.status];
                return (
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5"
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
                );
              })()}
            </div>

            <p
              className="text-sm mb-6"
              style={{
                color: "rgba(245,245,245,0.4)",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {formatDate(selected.drop_at)}
            </p>

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

            {selected.shop_url && (
              <a
                href={selected.shop_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium mb-6 hover:opacity-80 transition-opacity"
                style={{ color: "#00F0FF", fontFamily: "Inter, sans-serif" }}
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

            {/* Status actions */}
            {NEXT_STATUS[selected.status] && (
              <div className="mb-6">
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-3"
                  style={{
                    color: "#00F0FF",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  Update Status
                </p>
                <div className="flex gap-2 flex-wrap">
                  {NEXT_STATUS[selected.status]!.map((action) => (
                    <button
                      key={action.status}
                      onClick={() =>
                        handleStatusChange(selected.id, action.status)
                      }
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

            {/* Delete */}
            <div
              className="pt-4"
              style={{ borderTop: "1px solid rgba(45,10,78,0.4)" }}
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
                  <p
                    className="text-xs"
                    style={{
                      color: "rgba(245,245,245,0.5)",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    Are you sure?
                  </p>
                  <button
                    onClick={handleDelete}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{
                      color: "#FF4444",
                      background: "rgba(255,68,68,0.15)",
                      border: "1px solid rgba(255,68,68,0.3)",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs"
                    style={{
                      color: "rgba(245,245,245,0.4)",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === "create" && (
          <div className="p-6">
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
                  fontFamily: "Inter, sans-serif",
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FormLabel>Date & Time</FormLabel>
                  <input
                    type="datetime-local"
                    value={form.drop_at}
                    onChange={(e) =>
                      setForm({ ...form, drop_at: e.target.value })
                    }
                    className={inputClass}
                    style={{ ...inputStyle, colorScheme: "dark" }}
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
                    style={{ ...inputStyle, appearance: "none" }}
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
              </div>

              <div>
                <FormLabel>Description</FormLabel>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
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
                  onChange={(e) =>
                    setForm({ ...form, shop_url: e.target.value })
                  }
                  placeholder="https://yourshop.com/drop"
                  className={inputClass}
                  style={inputStyle}
                />
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
                onClick={handleCreate}
                disabled={saving}
                className="px-6 py-2.5 rounded-lg text-sm font-bold text-[#0A0A0A] disabled:opacity-50 hover:opacity-90 transition-opacity"
                style={{
                  background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {saving ? "Creating..." : "Create Drop"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

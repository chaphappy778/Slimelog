"use client";

import Link from "next/link";
import type { CollectionLog } from "@/lib/types";

const TYPE_COLORS: Record<string, string> = {
  butter: "#FFB347",
  clear: "#00F0FF",
  cloud: "#F5F5F5",
  icee: "#4FC3F7",
  fluffy: "#FF6B9D",
  floam: "#8BC34A",
  snow_fizz: "#E0E0E0",
  thick_and_glossy: "#9B59B6",
  jelly: "#4ECDC4",
  beaded: "#FF00E5",
  clay: "#E74C3C",
  cloud_cream: "#FFE66D",
  magnetic: "#78909C",
  thermochromic: "#F39C12",
  avalanche: "#3498DB",
  slay: "#39FF14",
};

const COLOR_SWATCHES: Record<string, string> = {
  pink: "#FF6B9D",
  green: "#39FF14",
  blue: "#4FC3F7",
  purple: "#9B59B6",
  white: "#F0F0F0",
  yellow: "#FFE66D",
  orange: "#FFB347",
  red: "#E74C3C",
  cyan: "#00F0FF",
  magenta: "#FF00E5",
  teal: "#4ECDC4",
  black: "#444",
  lavender: "#C4A0F0",
  peach: "#FFCBA4",
  mint: "#98FFD2",
  coral: "#FF6B6B",
  lilac: "#DDA0DD",
  rose: "#FF007F",
  gold: "#FFD700",
  silver: "#C0C0C0",
};

function getSwatchColor(colorName: string): string {
  const lower = colorName.toLowerCase();
  for (const [key, val] of Object.entries(COLOR_SWATCHES)) {
    if (lower.includes(key)) return val;
  }
  return "#666";
}

function RatingBar({ value }: { value: number | null | undefined }) {
  if (value == null) return null;
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: i <= value ? "#39FF14" : "rgba(57,255,20,0.15)",
          }}
        />
      ))}
    </div>
  );
}

const RATING_DIMENSIONS: Array<{ key: keyof CollectionLog; label: string }> = [
  { key: "rating_texture", label: "Texture" },
  { key: "rating_scent", label: "Scent" },
  { key: "rating_sound", label: "Sound" },
  { key: "rating_drizzle", label: "Drizzle" },
  { key: "rating_creativity", label: "Creativity" },
  { key: "rating_sensory_fit", label: "Sensory Fit" },
];

interface Props {
  log: CollectionLog;
  brandColor?: string;
  onClose: () => void;
}

export default function SlimeDetailCard({ log, brandColor, onClose }: Props) {
  const activeDimensions = RATING_DIMENSIONS.filter(
    ({ key }) => typeof log[key] === "number",
  );

  const brandDisplayColor = brandColor ?? "#00F0FF";
  const typeColor = log.slime_type
    ? (TYPE_COLORS[log.slime_type] ?? "#39FF14")
    : "#39FF14";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Row 1: Name + close */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1.3,
          }}
        >
          {log.slime_name ?? "Unnamed Slime"}
        </div>
        <button
          onClick={onClose}
          style={{
            flexShrink: 0,
            width: 28,
            height: 28,
            borderRadius: 6,
            background: "rgba(45,10,78,0.6)",
            border: "1px solid rgba(45,10,78,0.8)",
            color: "rgba(255,255,255,0.5)",
            fontSize: 16,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Row 2: Brand + type + collection badge */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          alignItems: "center",
        }}
      >
        {log.brand_name_raw && (
          <span
            style={{ fontSize: 13, fontWeight: 600, color: brandDisplayColor }}
          >
            {log.brand_name_raw}
          </span>
        )}
        {log.slime_type && (
          <span
            style={{
              padding: "2px 9px",
              borderRadius: 20,
              fontSize: 12,
              background: `${typeColor}18`,
              color: typeColor,
              border: `1px solid ${typeColor}40`,
            }}
          >
            {log.slime_type.replace(/_/g, " ")}
          </span>
        )}
        {log.in_wishlist ? (
          <span
            style={{
              padding: "2px 9px",
              borderRadius: 20,
              fontSize: 12,
              background: "rgba(148,0,211,0.15)",
              color: "#CC44FF",
              border: "1px solid rgba(148,0,211,0.35)",
            }}
          >
            Wishlist
          </span>
        ) : log.in_collection ? (
          <span
            style={{
              padding: "2px 9px",
              borderRadius: 20,
              fontSize: 12,
              background: "rgba(57,255,20,0.12)",
              color: "#39FF14",
              border: "1px solid rgba(57,255,20,0.3)",
            }}
          >
            In Collection
          </span>
        ) : null}
      </div>

      {/* Row 3: Color swatches */}
      {log.colors && log.colors.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {log.colors.map((c: string, i: number) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "2px 8px",
                borderRadius: 20,
                background: "rgba(45,10,78,0.4)",
                border: "1px solid rgba(45,10,78,0.6)",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: getSwatchColor(c),
                  flexShrink: 0,
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                {c}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Row 4: Overall rating */}
      {typeof log.rating_overall === "number" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: "#39FF14",
              lineHeight: 1,
            }}
          >
            {log.rating_overall}
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <RatingBar value={log.rating_overall} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              overall
            </span>
          </div>
        </div>
      )}

      {/* Row 5: Dimension rating grid */}
      {activeDimensions.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px 12px",
            padding: "10px 12px",
            background: "rgba(45,10,78,0.3)",
            borderRadius: 10,
            border: "1px solid rgba(45,10,78,0.5)",
          }}
        >
          {activeDimensions.map(({ key, label }) => (
            <div
              key={key}
              style={{ display: "flex", flexDirection: "column", gap: 3 }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.4)",
                  letterSpacing: "0.04em",
                }}
              >
                {label}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <RatingBar value={log[key] as number} />
                <span
                  style={{ fontSize: 11, color: "#39FF14", fontWeight: 700 }}
                >
                  {log[key] as number}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Row 6: Notes */}
      {log.notes && (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "rgba(255,255,255,0.45)",
            fontStyle: "italic",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: 1.5,
          }}
        >
          {log.notes}
        </p>
      )}

      {/* Row 7: Meta row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {log.created_at && (
          <span
            style={{
              padding: "3px 9px",
              borderRadius: 20,
              fontSize: 11,
              background: "rgba(45,10,78,0.35)",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            Logged{" "}
            {new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(new Date(log.created_at))}
          </span>
        )}
        {typeof log.cost_paid === "number" && (
          <span
            style={{
              padding: "3px 9px",
              borderRadius: 20,
              fontSize: 11,
              background: "rgba(45,10,78,0.35)",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(log.cost_paid as number)}
          </span>
        )}
        {log.purchased_from && (
          <span
            style={{
              padding: "3px 9px",
              borderRadius: 20,
              fontSize: 11,
              background: "rgba(45,10,78,0.35)",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            {log.purchased_from}
          </span>
        )}
        {log.purchased_at && (
          <span
            style={{
              padding: "3px 9px",
              borderRadius: 20,
              fontSize: 11,
              background: "rgba(45,10,78,0.35)",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            {new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(new Date(log.purchased_at))}
          </span>
        )}
      </div>

      {/* Row 8: View full details */}
      <Link
        href={`/slimes/${log.id}`}
        style={{
          display: "block",
          textAlign: "center",
          padding: "9px 0",
          borderRadius: 10,
          background: "rgba(0,240,255,0.08)",
          border: "1px solid rgba(0,240,255,0.25)",
          color: "#00F0FF",
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
          letterSpacing: "0.02em",
        }}
      >
        View Full Details
      </Link>
    </div>
  );
}

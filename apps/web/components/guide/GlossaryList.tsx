// apps/web/components/guide/GlossaryList.tsx
// T32 (2026-07-13): Two-column-on-desktop / one-column-on-mobile
// term/tag/definition rows. Used for Parts 2, 4, 10, 11. Tag pill color
// is set per part via the `accent` prop.

import type { GlossaryEntry } from "@/app/guide/content";

type Accent = "cyan" | "magenta" | "gold" | "green";

const ACCENT_STYLES: Record<
  Accent,
  { border: string; text: string; bg: string }
> = {
  cyan: {
    border: "rgba(0,240,255,0.35)",
    text: "#00F0FF",
    bg: "rgba(0,240,255,0.08)",
  },
  magenta: {
    border: "rgba(255,0,229,0.35)",
    text: "#FF7BEB",
    bg: "rgba(255,0,229,0.08)",
  },
  gold: {
    border: "rgba(255,210,74,0.35)",
    text: "#FFD24A",
    bg: "rgba(255,210,74,0.08)",
  },
  green: {
    border: "rgba(57,255,20,0.30)",
    text: "#7BFF7B",
    bg: "rgba(57,255,20,0.08)",
  },
};

interface GlossaryListProps {
  entries: GlossaryEntry[];
  accent: Accent;
}

export default function GlossaryList({ entries, accent }: GlossaryListProps) {
  const styles = ACCENT_STYLES[accent];
  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: "rgba(45,10,78,0.3)",
        border: "1px solid rgba(45,10,78,0.7)",
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2">
        {entries.map((entry, i) => (
          <div
            key={`${entry.term}-${i}`}
            className="px-4 py-3.5"
            style={{
              borderBottom: "1px solid rgba(45,10,78,0.55)",
            }}
          >
            <div className="flex items-baseline flex-wrap gap-2 mb-1.5">
              <span
                className="font-black text-white"
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontSize: 14,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.25,
                }}
              >
                {entry.term}
              </span>
              {entry.tag ? (
                <span
                  className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                  style={{
                    color: styles.text,
                    background: styles.bg,
                    border: `1px solid ${styles.border}`,
                    letterSpacing: "0.08em",
                  }}
                >
                  {entry.tag}
                </span>
              ) : null}
            </div>
            <p
              className="text-[13px] leading-relaxed"
              style={{ color: "rgba(245,245,245,0.78)" }}
            >
              {entry.definition}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

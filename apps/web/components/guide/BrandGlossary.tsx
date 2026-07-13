// apps/web/components/guide/BrandGlossary.tsx
// T32 (2026-07-13): Part 5. V4.1's Brand Glossary is really a slime-
// industry vocabulary glossary (product terms, sales terms, maker terms,
// care terms, community terms). Grouped by section with a small pill
// header per group.

import Link from "next/link";
import type { BrandGlossaryEntry } from "@/app/guide/content";

const SECTION_LABELS: Record<string, string> = {
  product: "Product & Texture",
  sales: "Drop & Sales",
  makers: "Makers & Shops",
  care: "Care & Condition",
  community: "Community & Culture",
};

const SECTION_ACCENT: Record<
  string,
  { text: string; border: string; bg: string }
> = {
  product: {
    text: "#00F0FF",
    border: "rgba(0,240,255,0.35)",
    bg: "rgba(0,240,255,0.08)",
  },
  sales: {
    text: "#39FF14",
    border: "rgba(57,255,20,0.30)",
    bg: "rgba(57,255,20,0.08)",
  },
  makers: {
    text: "#FFD24A",
    border: "rgba(255,210,74,0.35)",
    bg: "rgba(255,210,74,0.08)",
  },
  care: {
    text: "#FF7BEB",
    border: "rgba(255,0,229,0.30)",
    bg: "rgba(255,0,229,0.08)",
  },
  community: {
    text: "#CC44FF",
    border: "rgba(204,68,255,0.35)",
    bg: "rgba(204,68,255,0.08)",
  },
};

function groupBySection(
  entries: BrandGlossaryEntry[],
): Map<string, BrandGlossaryEntry[]> {
  const groups = new Map<string, BrandGlossaryEntry[]>();
  for (const entry of entries) {
    const existing = groups.get(entry.section) ?? [];
    existing.push(entry);
    groups.set(entry.section, existing);
  }
  return groups;
}

export default function BrandGlossary({
  entries,
}: {
  entries: BrandGlossaryEntry[];
}) {
  const grouped = groupBySection(entries);
  const orderedSections = [
    "product",
    "sales",
    "makers",
    "care",
    "community",
  ].filter((s) => grouped.has(s));

  return (
    <div className="space-y-6">
      {orderedSections.map((section) => {
        const label = SECTION_LABELS[section] ?? section;
        const accent = SECTION_ACCENT[section] ?? SECTION_ACCENT.product;
        const items = grouped.get(section) ?? [];
        return (
          <div key={section}>
            <div className="mb-3 flex items-center gap-2">
              <span
                className="text-[10.5px] font-bold uppercase rounded-full px-2.5 py-1"
                style={{
                  color: accent.text,
                  background: accent.bg,
                  border: `1px solid ${accent.border}`,
                  letterSpacing: "0.10em",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {label}
              </span>
            </div>
            <div
              className="rounded-3xl overflow-hidden"
              style={{
                background: "rgba(45,10,78,0.3)",
                border: "1px solid rgba(45,10,78,0.7)",
              }}
            >
              {items.map((entry, i) => (
                <BrandRow
                  key={`${entry.name}-${i}`}
                  entry={entry}
                  isLast={i === items.length - 1}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BrandRow({
  entry,
  isLast,
}: {
  entry: BrandGlossaryEntry;
  isLast: boolean;
}) {
  const content = (
    <div
      className="px-4 py-3.5 flex items-start gap-3"
      style={{
        borderBottom: isLast ? "none" : "1px solid rgba(45,10,78,0.55)",
      }}
    >
      <div className="flex-1 min-w-0">
        <div
          className="font-black text-white mb-1"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontSize: 14,
            letterSpacing: "-0.01em",
            lineHeight: 1.25,
          }}
        >
          {entry.name}
        </div>
        <p
          className="text-[13px] leading-relaxed"
          style={{ color: "rgba(245,245,245,0.78)", margin: 0 }}
        >
          {entry.oneLiner}
        </p>
      </div>
      {entry.slug ? (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0 mt-0.5"
          style={{ color: "rgba(245,245,245,0.4)" }}
          aria-hidden="true"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      ) : null}
    </div>
  );

  if (entry.slug) {
    return (
      <Link
        href={`/brands/${entry.slug}`}
        className="block transition-colors hover:bg-white/5"
      >
        {content}
      </Link>
    );
  }
  return content;
}

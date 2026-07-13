// apps/web/components/guide/ProseSection.tsx
// T32 (2026-07-13): Reading-column treatment for prose parts (Parts 6, 7,
// 9, 12). Max-width column, generous line-height, optional cyan/amber/
// magenta callout blocks.

import type { ProseSection as ProseSectionData } from "@/app/guide/content";

const CALLOUT_STYLES: Record<
  "info" | "warn" | "note",
  { border: string; text: string; bg: string }
> = {
  info: {
    border: "rgba(0,240,255,0.32)",
    text: "#00F0FF",
    bg: "rgba(0,240,255,0.09)",
  },
  warn: {
    border: "rgba(255,174,59,0.38)",
    text: "#FFAE3B",
    bg: "rgba(255,174,59,0.10)",
  },
  note: {
    border: "rgba(255,0,229,0.34)",
    text: "#FF7BEB",
    bg: "rgba(255,0,229,0.10)",
  },
};

export default function ProseSection({ data }: { data: ProseSectionData }) {
  return (
    <div
      className="rounded-3xl p-6 md:p-7"
      style={{
        background: "rgba(45,10,78,0.3)",
        border: "1px solid rgba(45,10,78,0.7)",
      }}
    >
      <div
        className="mx-auto"
        style={{ maxWidth: "65ch", color: "rgba(245,245,245,0.85)" }}
      >
        {data.intro.map((p, i) => (
          <p
            key={`intro-${i}`}
            className="mb-4 last:mb-0"
            style={{
              fontSize: 14,
              lineHeight: 1.65,
              color: "rgba(245,245,245,0.85)",
            }}
          >
            {p}
          </p>
        ))}

        {data.subsections.map((sub, si) => (
          <section key={`sub-${si}`} className="mt-6 first-of-type:mt-8">
            <h3
              className="mb-3 text-white"
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: "-0.01em",
              }}
            >
              {sub.heading}
            </h3>
            {sub.paragraphs.map((p, i) => (
              <p
                key={`sub-${si}-p-${i}`}
                className="mb-3 last:mb-0"
                style={{
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: "rgba(245,245,245,0.82)",
                }}
              >
                {p}
              </p>
            ))}
            {sub.callouts?.map((c, ci) => {
              const styles = CALLOUT_STYLES[c.tone];
              return (
                <div
                  key={`sub-${si}-c-${ci}`}
                  className="rounded-2xl px-4 py-3.5 mt-4"
                  style={{
                    background: styles.bg,
                    border: `1px solid ${styles.border}`,
                  }}
                >
                  <div
                    className="text-[10.5px] font-bold uppercase mb-1.5"
                    style={{
                      color: styles.text,
                      letterSpacing: "0.10em",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    {c.heading}
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: "rgba(245,245,245,0.85)",
                      margin: 0,
                    }}
                  >
                    {c.body}
                  </p>
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}

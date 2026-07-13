// apps/web/components/guide/SizeChipStrip.tsx
//
// T32c (2026-07-13): compact horizontal chip strip for the five slime
// container sizes (4/6/8/16/32 oz) in Guide Part 3. Replaces the
// two-column ContainerGrid treatment — reads tighter and cleaner for a
// short numeric ladder. Each chip carries its size prominently, with
// the description as a sub-line inside the chip.

export interface SizeEntry {
  name: string;
  description: string;
}

interface Props {
  entries: SizeEntry[];
}

export default function SizeChipStrip({ entries }: Props) {
  if (entries.length === 0) return null;

  return (
    <div
      className="flex gap-2 overflow-x-auto"
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        WebkitOverflowScrolling: "touch",
        margin: "0 -16px",
        padding: "2px 16px 8px",
      }}
    >
      {entries.map((entry) => (
        <div
          key={entry.name}
          className="rounded-2xl"
          style={{
            flex: "0 0 auto",
            width: 168,
            padding: "12px 14px 13px",
            background: "rgba(45,10,78,0.32)",
            border: "1px solid rgba(45,10,78,0.7)",
          }}
        >
          <div
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 900,
              fontSize: 22,
              letterSpacing: "-0.01em",
              lineHeight: 1,
              background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: 6,
            }}
          >
            {entry.name}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 11.5,
              lineHeight: 1.4,
              color: "rgba(245,245,245,0.72)",
              fontWeight: 500,
            }}
          >
            {entry.description}
          </p>
        </div>
      ))}
    </div>
  );
}

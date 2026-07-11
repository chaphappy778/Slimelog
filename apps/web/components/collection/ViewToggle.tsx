"use client";

type View = "cards" | "spiral" | "galaxy";

interface Props {
  active: View;
  onChange: (v: View) => void;
}

const VIEWS: { id: View; label: string }[] = [
  { id: "cards", label: "Cards" },
  { id: "spiral", label: "Spiral" },
  { id: "galaxy", label: "Galaxy" },
];

// Segmented pill switcher (Collection rework batch A, 2026-07-11).
// Restyled from the previous three side-by-side buttons into a single
// pill container so Spiral / Galaxy stop reading as equal-weight to
// Cards. Cards is the default and always pre-selected on mount by
// the parent page.
const VIEW_HINTS: Record<View, string> = {
  cards: "Your shelf, dense and scannable",
  spiral: "Timeline spiral — newest inward",
  galaxy: "Brand constellations",
};

export default function ViewToggle({ active, onChange }: Props) {
  return (
    <div className="mb-2">
      <div
        className="flex items-center gap-1 p-1 rounded-full"
        style={{
          background: "rgba(10,0,20,0.5)",
          border: "1px solid rgba(45,10,78,0.7)",
        }}
        role="tablist"
        aria-label="Collection view"
      >
        {VIEWS.map(({ id, label }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(id)}
              className="flex-1 text-center text-[13px] font-bold transition-all"
              style={{
                padding: "8px 4px",
                borderRadius: 999,
                border: "none",
                background: isActive
                  ? "linear-gradient(135deg, #39FF14, #00F0FF)"
                  : "transparent",
                color: isActive ? "#0A0A0A" : "rgba(255,255,255,0.55)",
                boxShadow: isActive ? "0 0 12px rgba(57,255,20,0.4)" : "none",
                cursor: "pointer",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p
        className="text-center text-[10.5px] font-medium mt-1.5"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        {VIEW_HINTS[active]}
      </p>
    </div>
  );
}

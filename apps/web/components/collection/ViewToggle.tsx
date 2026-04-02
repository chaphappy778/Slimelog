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

export default function ViewToggle({ active, onChange }: Props) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        marginBottom: 16,
      }}
    >
      {VIEWS.map(({ id, label }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 20,
              border: isActive ? "none" : "1px solid rgba(45,10,78,0.7)",
              background: isActive
                ? "linear-gradient(135deg, #39FF14 0%, #00F0FF 100%)"
                : "rgba(45,10,78,0.25)",
              color: isActive ? "#0A0A0A" : "rgba(255,255,255,0.6)",
              fontSize: 14,
              fontWeight: isActive ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.2s ease",
              letterSpacing: "0.02em",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

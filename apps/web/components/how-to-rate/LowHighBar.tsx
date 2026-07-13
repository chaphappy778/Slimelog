// apps/web/components/how-to-rate/LowHighBar.tsx
// T32e (2026-07-13): Compact horizontal fill-bar visual for the Score
// Examples block on /how-to-rate. LOW renders a ~25% partial fill in a
// tinted magenta so it reads as "the low end of the scale"; HIGH renders
// a full-width green fill with a soft glow.

interface LowHighBarProps {
  variant: "low" | "high";
  /** Optional short label rendered on top of the bar. */
  label?: string;
}

export default function LowHighBar({ variant, label }: LowHighBarProps) {
  const isHigh = variant === "high";
  return (
    <div
      className="relative rounded-full overflow-hidden"
      style={{
        height: 24,
        background: "rgba(45,10,78,0.4)",
        border: "1px solid rgba(45,10,78,0.6)",
      }}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <div
        style={{
          width: isHigh ? "100%" : "25%",
          height: "100%",
          background: isHigh
            ? "linear-gradient(90deg, #39FF14, #7BFF7B)"
            : "linear-gradient(90deg, rgba(255,61,110,0.75), rgba(45,10,78,0.9))",
          boxShadow: isHigh
            ? "0 0 16px rgba(57,255,20,0.45)"
            : "0 0 10px rgba(255,61,110,0.35)",
        }}
      />
      {label ? (
        <div
          className="absolute inset-0 flex items-center px-3 text-[10.5px] font-bold uppercase"
          style={{
            color: "#FFFFFF",
            letterSpacing: "0.06em",
            fontFamily: "Montserrat, sans-serif",
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}

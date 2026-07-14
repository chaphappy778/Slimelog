// apps/web/components/log/LogStepFooter.tsx
// [T-wizard 2026-07-13] Sticky log-wizard footer. Sits above the app's
// bottom nav and pins the Back / Next (or Save) buttons so the way
// forward is always reachable even on the tall Details and Ratings
// steps.
//
// Primary CTA: green→cyan gradient, black Montserrat 900 label, green
// glow shadow (matches the how-to-rate footer + Discover primary
// language).
//
// Secondary CTA: muted purple card treatment, white Montserrat 700.
// Renders "Cancel" on step 0 and "Back" on later steps.

"use client";

interface LogStepFooterProps {
  step: number;
  /** Whether the Next button is currently disabled (e.g. step 0
   *  requires a slime name). */
  nextDisabled?: boolean;
  /** Whether Save is currently running — flip the primary to a
   *  disabled + "Saving..." state. */
  saving?: boolean;
  onBack: () => void;
  onNext: () => void;
}

export default function LogStepFooter({
  step,
  nextDisabled = false,
  saving = false,
  onBack,
  onNext,
}: LogStepFooterProps) {
  const isLast = step === 3;
  const backLabel = step === 0 ? "Cancel" : "Back";
  const nextLabel = saving ? "Saving..." : isLast ? "Save" : "Next";

  return (
    <div
      className="sticky z-20"
      style={{
        // Sits directly above the app's bottom nav (which has its own
        // height). The bottom offset matches the bottom nav height
        // used elsewhere in the app.
        bottom: 0,
        display: "flex",
        gap: 12,
        padding: "12px 18px",
        background:
          "linear-gradient(0deg, rgba(16,0,32,0.98) 55%, rgba(16,0,32,0))",
        borderTop: "1px solid rgba(45,10,78,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <button
        type="button"
        onClick={onBack}
        className="active:scale-[0.98] transition-transform"
        style={{
          flex: 1,
          minHeight: 52,
          borderRadius: 16,
          background: "rgba(45,10,78,0.5)",
          border: "1px solid rgba(120,60,180,0.5)",
          color: "#FFFFFF",
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 700,
          fontSize: 15,
        }}
      >
        {backLabel}
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || saving}
        className="active:scale-[0.98] transition-transform"
        style={{
          flex: 1,
          minHeight: 52,
          border: "none",
          borderRadius: 16,
          background:
            nextDisabled || saving
              ? "rgba(45,10,78,0.35)"
              : "linear-gradient(135deg, #39FF14, #00F0FF)",
          color: nextDisabled || saving ? "rgba(245,245,245,0.35)" : "#04140A",
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 900,
          fontSize: 16,
          letterSpacing: "0.01em",
          boxShadow:
            nextDisabled || saving
              ? "none"
              : "0 0 22px rgba(57,255,20,0.4), 0 8px 24px -8px rgba(0,240,255,0.5)",
          cursor: nextDisabled || saving ? "not-allowed" : "pointer",
        }}
      >
        {nextLabel}
      </button>
    </div>
  );
}

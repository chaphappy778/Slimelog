// apps/web/components/log/LogStepHeader.tsx
// [T-wizard 2026-07-13] Sticky log-wizard header. Four numbered pills
// linked by connector segments, an eyebrow ("STEP 0N"), and a big
// Montserrat display title.
//
//   Pill states:
//     active — cyan border + cyan text + cyan glow + faint cyan bg
//     done   — green solid + black checkmark + green glow
//     muted  — purple outline + muted white text
//
//   Title: step 2 (Ratings) uses the full-rainbow gradient text
//   treatment (matches how-to-rate Overall). Everything else is
//   white.
//
//   Optional sub-step line renders under the title when the ratings
//   step is in sub-step mode (Axis n of 6 · Label). Tinted the
//   axis's accent color.

"use client";

interface LogStepHeaderProps {
  /** 0..3 — matches the wizard's step index. */
  step: number;
  /** Sub-step index within Ratings (0..5) when in sub-step mode. */
  subStep?: number;
  /** Axis label + accent for the optional sub-step line. */
  subStepAxis?: { label: string; accent: string };
}

const STEP_TITLES = [
  "What slime is this?",
  "Tell us more",
  "Rate it",
  "Any notes?",
];

export default function LogStepHeader({
  step,
  subStep,
  subStepAxis,
}: LogStepHeaderProps) {
  const isRainbowStep = step === 2;

  return (
    <div
      className="sticky top-0 z-20"
      style={{
        // Pull under the app's PageHeader (which we don't render inside
        // /log). The 14px pt puts us just below the notch.
        padding: "14px 18px 14px",
        background:
          "linear-gradient(180deg, rgba(16,0,32,0.96) 60%, rgba(16,0,32,0))",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      {/* Pill row */}
      <div className="flex items-center gap-0">
        {[0, 1, 2, 3].map((i) => {
          const isDone = i < step;
          const isActive = i === step;
          return (
            <PillWithConnector
              key={i}
              index={i}
              isDone={isDone}
              isActive={isActive}
              showConnector={i < 3}
              connectorOn={i < step}
            />
          );
        })}
      </div>

      {/* Eyebrow + title */}
      <div style={{ marginTop: 16 }}>
        <p
          className="uppercase"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: "0.16em",
            color: "#00F0FF",
            margin: 0,
          }}
        >
          Step 0{step + 1}
        </p>
        <h1
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: 30,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            margin: "4px 0 0",
            ...(isRainbowStep
              ? {
                  background:
                    "linear-gradient(90deg, #FF3D6E 0%, #FFAE3B 22%, #FFD24A 40%, #39FF14 58%, #00F0FF 76%, #FF00E5 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  color: "transparent",
                }
              : { color: "#FFFFFF" }),
          }}
        >
          {STEP_TITLES[step]}
        </h1>

        {/* Optional sub-step line for Ratings in sub-step mode.
            Renders "Axis n of 6 · Label" in the axis's accent color. */}
        {typeof subStep === "number" && subStepAxis && (
          <p
            className="uppercase"
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: "0.12em",
              color: subStepAxis.accent,
              margin: "8px 0 0",
            }}
          >
            Axis {subStep + 1} of 6 · {subStepAxis.label}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Pill + connector ──────────────────────────────────────────────────

function PillWithConnector({
  index,
  isDone,
  isActive,
  showConnector,
  connectorOn,
}: {
  index: number;
  isDone: boolean;
  isActive: boolean;
  showConnector: boolean;
  connectorOn: boolean;
}) {
  return (
    <>
      <div
        className="flex-none grid place-items-center"
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 800,
          fontSize: 14,
          ...(isDone
            ? {
                border: "2px solid #39FF14",
                background: "#39FF14",
                color: "#06210A",
                boxShadow: "0 0 14px rgba(57,255,20,0.5)",
              }
            : isActive
              ? {
                  border: "2px solid #00F0FF",
                  background: "rgba(0,240,255,0.12)",
                  color: "#00F0FF",
                  boxShadow:
                    "0 0 16px rgba(0,240,255,0.55), inset 0 0 10px rgba(0,240,255,0.25)",
                }
              : {
                  border: "2px solid rgba(120,60,180,0.5)",
                  background: "rgba(45,10,78,0.5)",
                  color: "rgba(245,245,245,0.55)",
                }),
        }}
        aria-current={isActive ? "step" : undefined}
      >
        {isDone ? (
          <svg
            width={15}
            height={15}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#06210A"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          index + 1
        )}
      </div>

      {showConnector && (
        <div
          aria-hidden="true"
          style={{
            flex: 1,
            height: 2,
            borderRadius: 2,
            background: connectorOn ? "#39FF14" : "rgba(120,60,180,0.4)",
            boxShadow: connectorOn ? "0 0 8px rgba(57,255,20,0.6)" : undefined,
          }}
        />
      )}
    </>
  );
}

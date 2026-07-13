// apps/web/components/PageWrapper.tsx
// Wraps every app page with the atmospheric dark-purple background
// that matches the landing page aesthetic.
//
// 2026-07-13 atmosphere pass:
//   - The wrapper's background gradient was previously anchored to the
//     TOP of the element. On tall pages (guide, how-to-rate) it left the
//     lower half solid black. Now the background sits on a fixed
//     viewport-attached layer so the purple gradient follows the scroll
//     and never fades into pitch dark.
//   - Added scattered ambient blur orbs (magenta top-right, cyan
//     mid-left, green bottom-center) as color pops. Fixed-positioned so
//     they stay in the viewport as you scroll. Optional via the `orbs`
//     prop — default off on shorter pages, on for guide + how-to-rate.
//
// Usage:
//   <PageWrapper>                                        // baseline
//   <PageWrapper dots glow="cyan">                       // + dots + glow accent
//   <PageWrapper dots glow="cyan" orbs>                  // + ambient blur orbs

interface PageWrapperProps {
  children: React.ReactNode;
  /** Subtle dot/star texture across the background */
  dots?: boolean;
  /** Extra radial glow accent behind hero content */
  glow?: "green" | "cyan" | "magenta" | "none";
  /**
   * Ambient blur orbs scattered across the viewport. Turn on for
   * long-scroll pages that need color pops throughout the fold
   * (guide, how-to-rate, marketplace, collection).
   */
  orbs?: boolean;
  className?: string;
}

const GLOW_STYLES: Record<string, string> = {
  green:
    "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(57,255,20,0.10) 0%, transparent 70%)",
  cyan: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,240,255,0.14) 0%, transparent 70%)",
  magenta:
    "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,0,229,0.10) 0%, transparent 70%)",
  none: "none",
};

export default function PageWrapper({
  children,
  dots = false,
  glow = "none",
  orbs = false,
  className = "",
}: PageWrapperProps) {
  return (
    <div
      className={`relative min-h-screen bg-slime-bg overflow-x-hidden ${className}`}
    >
      {/* Viewport-fixed atmospheric layers — sit behind content and
          don't scroll away. Purple gradient stays visible top-to-bottom
          instead of fading into black by the time you reach Part 5. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 90% at 50% 0%, #2D0A4E 0%, #1A0530 35%, #100020 65%, #0A0014 100%)",
        }}
      />

      {/* Radial glow accent layer (top-of-viewport tinted halo) */}
      {glow !== "none" && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0"
          style={{ background: GLOW_STYLES[glow] }}
        />
      )}

      {/* Ambient blur orbs. Three scattered color pops so the mid-fold
          feels alive instead of flat purple. All fixed to the viewport
          so they follow the scroll. */}
      {orbs && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        >
          <div
            style={{
              position: "absolute",
              top: "-8%",
              right: "-14%",
              width: "62vw",
              height: "62vw",
              maxWidth: 520,
              maxHeight: 520,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,0,229,0.22), transparent 70%)",
              filter: "blur(60px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "42%",
              left: "-22%",
              width: "70vw",
              height: "70vw",
              maxWidth: 560,
              maxHeight: 560,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(0,240,255,0.18), transparent 70%)",
              filter: "blur(72px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-16%",
              right: "-8%",
              width: "56vw",
              height: "56vw",
              maxWidth: 460,
              maxHeight: 460,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(57,255,20,0.15), transparent 70%)",
              filter: "blur(68px)",
            }}
          />
        </div>
      )}

      {/* Dot texture layer */}
      {dots && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.25) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            opacity: 0.18,
          }}
        />
      )}

      {/* Page content.
          2026-07-13: `px-1.5` (6px each side) as a safe global bump so
          pages that use `px-4` (16px) get an effective 22px horizontal
          breathing room. Fixes the "sliders too close to the edges"
          pain in the log wizard. */}
      <div className="relative z-10 px-1.5">{children}</div>
    </div>
  );
}

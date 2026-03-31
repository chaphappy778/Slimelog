// apps/web/components/PageWrapper.tsx
// Wraps every app page with the atmospheric dark-purple radial background
// that matches the landing page aesthetic.
// Usage: <PageWrapper> or <PageWrapper dots glow="cyan">

interface PageWrapperProps {
  children: React.ReactNode;
  /** Show subtle dot/star texture across the background */
  dots?: boolean;
  /** Extra radial glow accent behind hero content */
  glow?: "green" | "cyan" | "magenta" | "none";
  className?: string;
}

const GLOW_STYLES: Record<string, string> = {
  green:
    "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(57,255,20,0.08) 0%, transparent 70%)",
  cyan: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,240,255,0.10) 0%, transparent 70%)",
  magenta:
    "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,0,229,0.08) 0%, transparent 70%)",
  none: "none",
};

export default function PageWrapper({
  children,
  dots = false,
  glow = "none",
  className = "",
}: PageWrapperProps) {
  return (
    <div
      className={`relative min-h-screen bg-slime-bg overflow-x-hidden ${className}`}
      style={{
        background:
          "radial-gradient(ellipse 100% 60% at 50% 0%, #2D0A4E 0%, #100020 35%, #0A0A0A 65%)",
      }}
    >
      {/* Radial glow accent layer */}
      {glow !== "none" && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0"
          style={{ background: GLOW_STYLES[glow] }}
        />
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

      {/* Page content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

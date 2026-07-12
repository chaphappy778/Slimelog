// apps/web/components/leaderboard/LoadingSkeleton.tsx
// T107 (2026-07-11): 7 shimmering placeholder rows to bridge the gap
// while a brand's leaderboard is being refetched client-side.

"use client";

const SHIMMER_KEYFRAMES = `
@keyframes leaderboard-shimmer {
  0% { background-position: -240px 0; }
  100% { background-position: 240px 0; }
}
`;

const ROW_COUNT = 7;

export default function LoadingSkeleton() {
  return (
    <div>
      <style>{SHIMMER_KEYFRAMES}</style>
      <div
        className="section-label"
        style={{ color: "#00F0FF", marginBottom: 10 }}
      >
        Top 20 · All time
      </div>
      <div className="flex flex-col" style={{ gap: 10 }}>
        {Array.from({ length: ROW_COUNT }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div
      className="rounded-2xl"
      style={{
        background: "rgba(45,10,78,0.3)",
        border: "1px solid rgba(45,10,78,0.7)",
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Shimmer width={32} height={32} radius={8} />
      <Shimmer width={40} height={40} radius={999} />
      <div className="flex-1 flex flex-col" style={{ gap: 6 }}>
        <Shimmer width="60%" height={12} radius={4} />
        <Shimmer width="30%" height={10} radius={4} />
      </div>
      <Shimmer width={28} height={16} radius={4} />
    </div>
  );
}

function Shimmer({
  width,
  height,
  radius,
}: {
  width: number | string;
  height: number | string;
  radius: number;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background:
          "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(0,240,255,0.12) 50%, rgba(255,255,255,0.04) 100%)",
        backgroundSize: "480px 100%",
        animation: "leaderboard-shimmer 1.4s ease-in-out infinite",
      }}
    />
  );
}

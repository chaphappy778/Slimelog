// apps/web/components/collection/SpiralView.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { CollectionLog, SlimeBaseType } from "@/lib/types";
import SlimeDetailCard from "@/components/collection/SlimeDetailCard";
import TimelineView from "@/components/collection/TimelineView";
import type { LikeDataMap } from "@/app/collection/page";

// [Change 1] Added likeData and currentUserId to Props.
interface Props {
  logs: CollectionLog[];
  likeData: LikeDataMap;
  currentUserId: string | null;
}

// [Change SV1] Local palette kept for canvas blob fills (saturated hex
// values for legible blob rendering vs the bg/text pair the badge map
// provides). Typed Record<SlimeBaseType, string> to catch taxonomy drift
// at compile time. All 20 base types present; `thermochromic` removed.
// 2026-07-16 mig 077: basic added, cloud_cream renamed to snowbutter.
const TYPE_COLORS: Record<SlimeBaseType, string> = {
  avalanche: "#3498DB",
  basic: "#CBD5E1",
  beaded: "#FF00E5",
  butter: "#FFB347",
  clear: "#00F0FF",
  cloud: "#F5F5F5",
  floam: "#8BC34A",
  fluffy: "#FF6B9D",
  hybrid: "#B39DDB",
  icee: "#4FC3F7",
  jelly: "#4ECDC4",
  magnetic: "#78909C",
  sand: "#D2B48C",
  slay: "#39FF14",
  snow_fizz: "#E0E0E0",
  snowbutter: "#FFE66D",
  sugar_scrub: "#FFC1CC",
  thick_and_glossy: "#9B59B6",
  water: "#5DADE2",
  wax_and_wax_cracking: "#A569BD",
};

const PHI = (1 + Math.sqrt(5)) / 2;
const CANVAS_SIZE = 600;
const SPACING = 18;

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// 2026-07-11 (batch D refactor): always color by base_type. Previous
// fallback path used the log's first color, which meant two Butter
// slimes (one peach, one coral) rendered as different node colors —
// which broke the visual language "color = base type". Legend under
// the canvas relies on this consistency.
function getBlobColor(log: CollectionLog): string {
  if (log.base_type && TYPE_COLORS[log.base_type as SlimeBaseType]) {
    return TYPE_COLORS[log.base_type as SlimeBaseType];
  }
  return "#39FF14";
}

// [Touch T1] Helper: distance between two touch points.
function getTouchDist(t1: React.Touch, t2: React.Touch): number {
  return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
}

interface Transform {
  x: number;
  y: number;
  scale: number;
}

export default function SpiralView({ logs, likeData, currentUserId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedLog, setSelectedLog] = useState<CollectionLog | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [tab, setTab] = useState<"spiral" | "timeline">("spiral");
  const [transform, setTransform] = useState<Transform>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const blobPositions = useRef<
    Array<{ x: number; y: number; r: number; log: CollectionLog }>
  >([]);

  // [Touch T2] Pinch-to-zoom refs.
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartScale = useRef<number>(1);
  const pinchMidpoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  const brands = Array.from(
    new Set(logs.map((l) => l.brand_name_raw).filter(Boolean)),
  ) as string[];

  const filteredLogs =
    selectedBrands.size === 0
      ? logs
      : logs.filter(
          (l) => l.brand_name_raw && selectedBrands.has(l.brand_name_raw),
        );

  // 2026-07-11 (batch D refactor): sort by created_at desc so the newest
  // log occupies index 0 (center of the spiral) and older logs fan out.
  // The design's ask: "newest inward" — reads as time on a spiral so the
  // page conveys a chronological signal, not just a decorative arrangement.
  const sortedForSpiral = useCallback((source: CollectionLog[]) => {
    return [...source].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, []);

  const calcAutoFit = useCallback((logsToFit: CollectionLog[]): Transform => {
    if (logsToFit.length === 0) return { x: 0, y: 0, scale: 1 };
    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;
    const rawPositions = logsToFit.map((_, i) => {
      const angle = i * ((2 * Math.PI) / PHI);
      const dist = Math.sqrt(i + 1) * SPACING;
      return { x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist };
    });
    const allX = rawPositions.map((p) => p.x);
    const allY = rawPositions.map((p) => p.y);
    const minX = Math.min(...allX),
      maxX = Math.max(...allX);
    const minY = Math.min(...allY),
      maxY = Math.max(...allY);
    const contentW = maxX - minX + 60;
    const contentH = maxY - minY + 60;
    const scale = Math.min(CANVAS_SIZE / contentW, CANVAS_SIZE / contentH, 1.5);
    const contentCx = (minX + maxX) / 2;
    const contentCy = (minY + maxY) / 2;
    return {
      x: CANVAS_SIZE / 2 - contentCx * scale,
      y: CANVAS_SIZE / 2 - contentCy * scale,
      scale,
    };
  }, []);

  useEffect(() => {
    setTransform(calcAutoFit(filteredLogs));
  }, [filteredLogs, calcAutoFit]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = CANVAS_SIZE,
      H = CANVAS_SIZE,
      cx = W / 2,
      cy = H / 2;
    const t = transformRef.current;

    const grad = ctx.createRadialGradient(
      cx,
      cy * 0.6,
      0,
      cx,
      cy * 0.6,
      W * 0.7,
    );
    grad.addColorStop(0, "#2D0A4E");
    grad.addColorStop(0.5, "#100020");
    grad.addColorStop(1, "#0A0A0A");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(t.scale, t.scale);

    const positions: Array<{
      x: number;
      y: number;
      r: number;
      log: CollectionLog;
    }> = [];

    // Positions the newest log at the center (i=0). Older logs walk
    // outward in a phyllotaxis pattern — same golden-ratio geometry as
    // before, but now the axis carries temporal meaning.
    const drawOrder = sortedForSpiral(filteredLogs);

    drawOrder.forEach((log, i) => {
      const angle = i * ((2 * Math.PI) / PHI);
      const dist = Math.sqrt(i + 1) * SPACING;
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;
      const rating = log.rating_overall ?? null;
      // 2026-07-11 (D.1): wider dot size range so score contrast reads.
      // Previous 6–20px was almost uniform in a packed spiral. Now
      // 8–24px — the difference between a 2★ and a 5★ dot is real.
      const r = rating !== null ? 8 + (rating / 5) * 16 : 12;
      const color = getBlobColor(log);

      if (rating === 5) {
        ctx.beginPath();
        ctx.arc(x, y, r + 6, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(color, 0.25);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba("#ffffff", 0.25);
      ctx.fill();

      positions.push({ x, y, r, log });
    });

    // 2026-07-11: dropped the "now" + "newest inward · oldest outward"
    // canvas text. Read as clutter over the innermost cluster; users
    // can tap circles to inspect individual logs and the legend below
    // already tells them what the color/size mean. The temporal
    // arrangement stays (sortedForSpiral above) — it's still baked
    // into where dots sit, just without the label narration.

    ctx.restore();
    blobPositions.current = positions;
  }, [filteredLogs, sortedForSpiral]);

  useEffect(() => {
    draw();
  }, [draw, transform]);

  // Wheel zoom (mouse/trackpad)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (CANVAS_SIZE / rect.width);
      const my = (e.clientY - rect.top) * (CANVAS_SIZE / rect.height);
      setTransform((prev) => {
        const newScale = Math.max(0.3, Math.min(4, prev.scale * delta));
        const sc = newScale / prev.scale;
        return {
          x: mx - sc * (mx - prev.x),
          y: my - sc * (my - prev.y),
          scale: newScale,
        };
      });
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [tab]);

  // [Touch T3] Passive:false touch listeners to block page scroll during canvas interaction.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prevent = (e: TouchEvent) => e.preventDefault();
    canvas.addEventListener("touchmove", prevent, { passive: false });
    canvas.addEventListener("touchstart", prevent, { passive: false });
    return () => {
      canvas.removeEventListener("touchmove", prevent);
      canvas.removeEventListener("touchstart", prevent);
    };
  }, [tab]);

  // --- Mouse handlers ---
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    dragging.current = true;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      tx: transformRef.current.x,
      ty: transformRef.current.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = CANVAS_SIZE / rect.width;
    setTransform((prev) => ({
      ...prev,
      x: dragStart.current.tx + (e.clientX - dragStart.current.x) * sx,
      y: dragStart.current.ty + (e.clientY - dragStart.current.y) * sx,
    }));
  };

  const handleMouseUp = () => {
    dragging.current = false;
  };

  // Shared hit-test logic used by both click and tap.
  const hitTest = useCallback(
    (canvasX: number, canvasY: number): CollectionLog | null => {
      const t = transformRef.current;
      const cx = (canvasX - t.x) / t.scale;
      const cy = (canvasY - t.y) / t.scale;
      for (let i = blobPositions.current.length - 1; i >= 0; i--) {
        const { x, y, r, log } = blobPositions.current[i];
        if ((cx - x) ** 2 + (cy - y) ** 2 <= (r + 4) ** 2) {
          return log;
        }
      }
      return null;
    },
    [],
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (CANVAS_SIZE / rect.width);
      const my = (e.clientY - rect.top) * (CANVAS_SIZE / rect.height);
      setSelectedLog(hitTest(mx, my));
    },
    [hitTest],
  );

  // [Touch T4] Touch handlers: single-finger pan, two-finger pinch, tap-to-select.
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;

    if (e.touches.length === 1) {
      dragging.current = true;
      dragStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        tx: transformRef.current.x,
        ty: transformRef.current.y,
      };
      // Reset pinch state when going back to one finger.
      pinchStartDist.current = null;
      pinchMidpoint.current = null;
    } else if (e.touches.length === 2) {
      // [Touch T5] Two-finger pinch start: record initial distance, scale, and midpoint.
      dragging.current = false;
      const dist = getTouchDist(e.touches[0], e.touches[1]);
      pinchStartDist.current = dist;
      pinchStartScale.current = transformRef.current.scale;
      const midClientX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midClientY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      pinchMidpoint.current = {
        x: (midClientX - rect.left) * scaleX,
        y: (midClientY - rect.top) * scaleY,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;

    if (e.touches.length === 1 && dragging.current) {
      // [Touch T6] Single-finger pan.
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      setTransform((prev) => ({
        ...prev,
        x: dragStart.current.tx + dx * scaleX,
        y: dragStart.current.ty + dy * scaleX,
      }));
    } else if (
      e.touches.length === 2 &&
      pinchStartDist.current !== null &&
      pinchMidpoint.current !== null
    ) {
      // [Touch T7] Two-finger pinch-to-zoom, zooming toward the midpoint.
      const currentDist = getTouchDist(e.touches[0], e.touches[1]);
      const ratio = currentDist / pinchStartDist.current;
      const newScale = Math.max(
        0.3,
        Math.min(4, pinchStartScale.current * ratio),
      );
      const mid = pinchMidpoint.current;
      setTransform((prev) => {
        const sc = newScale / prev.scale;
        return {
          x: mid.x - sc * (mid.x - prev.x),
          y: mid.y - sc * (mid.y - prev.y),
          scale: newScale,
        };
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_SIZE / rect.width;
      const scaleY = CANVAS_SIZE / rect.height;
      const touchCanvasX = (touch.clientX - rect.left) * scaleX;
      const touchCanvasY = (touch.clientY - rect.top) * scaleY;

      // [Touch T8] Tap-to-select: only fire if touch didn't drift more than 8px.
      const moveX = touch.clientX - dragStart.current.x;
      const moveY = touch.clientY - dragStart.current.y;
      const moved = Math.hypot(moveX, moveY);

      if (moved < 8) {
        setSelectedLog(hitTest(touchCanvasX, touchCanvasY));
      }
    }

    dragging.current = false;
    pinchStartDist.current = null;
    pinchMidpoint.current = null;
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand);
      else next.add(brand);
      return next;
    });
  };

  const zoomIn = () =>
    setTransform((p) => ({ ...p, scale: Math.min(4, p.scale * 1.2) }));
  const zoomOut = () =>
    setTransform((p) => ({ ...p, scale: Math.max(0.3, p.scale * 0.8) }));
  const resetView = () => setTransform(calcAutoFit(filteredLogs));

  const tabBar = (
    <div
      style={{
        display: "flex",
        gap: 0,
        borderBottom: "1px solid rgba(45,10,78,0.5)",
      }}
    >
      {(["spiral", "timeline"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTab(t)}
          style={{
            flex: 1,
            padding: "9px 0",
            background: "transparent",
            border: "none",
            borderBottom:
              tab === t ? "2px solid #39FF14" : "2px solid transparent",
            color: tab === t ? "#39FF14" : "rgba(255,255,255,0.4)",
            fontSize: 13,
            fontWeight: tab === t ? 700 : 400,
            cursor: "pointer",
            textTransform: "capitalize",
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );

  const brandFilter = brands.length > 0 && (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setBrandDropdownOpen((v) => !v)}
        style={{
          width: "100%",
          padding: "10px 14px",
          background: "rgba(45,10,78,0.4)",
          // 2026-07-11: highlight the entire dropdown row when brands
          // are selected. Border shifts from muted purple \u2192 cyan glow
          // so the affordance reads as "actionable \u2014 tap me to open."
          border:
            selectedBrands.size > 0
              ? "1px solid rgba(0,240,255,0.55)"
              : "1px solid rgba(45,10,78,0.7)",
          boxShadow:
            selectedBrands.size > 0
              ? "0 0 12px rgba(0,240,255,0.25)"
              : "none",
          borderRadius: 10,
          color: selectedBrands.size > 0 ? "#00F0FF" : "rgba(255,255,255,0.6)",
          fontSize: 14,
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>
          {selectedBrands.size === 0
            ? "All Brands"
            : `${selectedBrands.size} brand${selectedBrands.size > 1 ? "s" : ""} selected`}
        </span>
        {/* 2026-07-11: pop the chevron in neon cyan when there are
            selected brands, so users have a clear "tap me" cue. Adds
            a soft cyan glow when open to signal expanded state. */}
        <span
          style={{
            color:
              selectedBrands.size > 0
                ? "#00F0FF"
                : "rgba(255,255,255,0.4)",
            fontSize: 13,
            fontWeight: selectedBrands.size > 0 ? 700 : 400,
            textShadow:
              selectedBrands.size > 0
                ? "0 0 6px rgba(0,240,255,0.75)"
                : "none",
            transition: "transform 160ms ease",
            transform: brandDropdownOpen ? "rotate(180deg)" : "rotate(0)",
            display: "inline-block",
            lineHeight: 1,
          }}
        >
          {"\u25bc"}
        </span>
      </button>
      {brandDropdownOpen && (
        <div
          style={{
            position: "absolute",
            top: "110%",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "rgba(20,5,40,0.98)",
            border: "1px solid rgba(45,10,78,0.8)",
            borderRadius: 10,
            overflow: "hidden",
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setSelectedBrands(new Set());
              setBrandDropdownOpen(false);
            }}
            style={{
              width: "100%",
              padding: "10px 14px",
              background:
                selectedBrands.size === 0
                  ? "rgba(57,255,20,0.1)"
                  : "transparent",
              border: "none",
              borderBottom: "1px solid rgba(45,10,78,0.5)",
              color:
                selectedBrands.size === 0 ? "#39FF14" : "rgba(255,255,255,0.6)",
              fontSize: 14,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            All Brands
          </button>
          {brands.map((brand) => {
            const isSelected = selectedBrands.has(brand);
            return (
              <button
                key={brand}
                type="button"
                onClick={() => toggleBrand(brand)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: isSelected
                    ? "rgba(57,255,20,0.08)"
                    : "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(45,10,78,0.3)",
                  color: isSelected ? "#39FF14" : "rgba(255,255,255,0.7)",
                  fontSize: 14,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                {brand}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const canvasBlock = (
    <div style={{ position: "relative" }}>
      <div
        ref={containerRef}
        style={{
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(45,10,78,0.7)",
          cursor: dragging.current ? "grabbing" : "grab",
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={{ width: "100%", display: "block" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleCanvasClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </div>

      {/* Zoom controls */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {[
          { label: "+", action: zoomIn },
          { label: "\u2212", action: zoomOut },
          { label: "R", action: resetView },
        ].map(({ label, action }) => (
          <button
            key={label}
            type="button"
            onClick={action}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(45,10,78,0.8)",
              border: "1px solid rgba(45,10,78,0.9)",
              color: "rgba(255,255,255,0.7)",
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          fontSize: 11,
          color: "rgba(255,255,255,0.25)",
        }}
      >
        scroll to zoom · drag to pan
      </div>
    </div>
  );

  // [Change 2] Look up likeData for the selected log; fall back to zeros if not found.
  const selectedLikeEntry = selectedLog
    ? (likeData[selectedLog.id] ?? {
        likeCount: 0,
        commentCount: 0,
        isLiked: false,
      })
    : null;

  const detailCard = selectedLog && selectedLikeEntry && (
    <div
      style={{
        background: "rgba(45,10,78,0.5)",
        border: "1px solid rgba(45,10,78,0.7)",
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      {/* [Change 3] Added imageUrl, brandSlug, onImageOpen to match updated SlimeDetailCard props. */}
      <SlimeDetailCard
        log={selectedLog}
        imageUrl={null}
        brandSlug={null}
        brandLogoUrl={null}
        onClose={() => setSelectedLog(null)}
        onImageOpen={() => {}}
        likeCount={selectedLikeEntry.likeCount}
        commentCount={selectedLikeEntry.commentCount}
        isLikedByCurrentUser={selectedLikeEntry.isLiked}
        currentUserId={currentUserId}
      />
    </div>
  );

  // 2026-07-11 (batch D refactor): base-type color legend under the
  // canvas. Only shows types that are actually present in the filtered
  // logs — no dead entries. Reads as the key to the "color = base type,
  // size = your score" language the design was after.
  const legendEntries: { label: string; color: string }[] = (() => {
    const seen = new Set<string>();
    const entries: { label: string; color: string }[] = [];
    for (const log of filteredLogs) {
      const key = log.base_type ?? "";
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const color = TYPE_COLORS[key as SlimeBaseType] ?? "#39FF14";
      const label = key
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      entries.push({ label, color });
    }
    return entries.sort((a, b) => a.label.localeCompare(b.label));
  })();

  const legendBlock = tab === "spiral" && legendEntries.length > 0 && (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        padding: "10px 12px",
        background: "rgba(45,10,78,0.3)",
        border: "1px solid rgba(45,10,78,0.7)",
        borderRadius: 12,
      }}
      aria-label="Base type color legend"
    >
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.4)",
          alignSelf: "center",
          marginRight: 4,
        }}
      >
        Legend
      </span>
      {legendEntries.map(({ label, color }) => (
        <span
          key={label}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 600,
            color: "rgba(255,255,255,0.75)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 9,
              height: 9,
              borderRadius: 999,
              background: color,
              boxShadow: `0 0 6px ${hexToRgba(color, 0.6)}`,
              display: "inline-block",
            }}
          />
          {label}
        </span>
      ))}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          marginLeft: "auto",
          fontSize: 10,
          fontWeight: 600,
          color: "rgba(255,255,255,0.5)",
        }}
      >
        {/* Mini size scale — dot examples that teach "size = score"
            at a glance. Three points: low, mid, top. */}
        <span
          aria-hidden="true"
          style={{
            width: 5,
            height: 5,
            borderRadius: 999,
            background: "rgba(255,255,255,0.7)",
            display: "inline-block",
          }}
        />
        <span
          aria-hidden="true"
          style={{
            width: 9,
            height: 9,
            borderRadius: 999,
            background: "rgba(255,255,255,0.75)",
            display: "inline-block",
          }}
        />
        <span
          aria-hidden="true"
          style={{
            width: 14,
            height: 14,
            borderRadius: 999,
            background: "rgba(255,255,255,0.8)",
            display: "inline-block",
          }}
        />
        <span style={{ marginLeft: 4 }}>1★ → 5★</span>
      </span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {tabBar}
      {tab === "spiral" && brandFilter}
      {tab === "spiral" && canvasBlock}
      {legendBlock}
      {tab === "spiral" && detailCard}
      {tab === "spiral" && filteredLogs.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "rgba(255,255,255,0.3)",
            fontSize: 14,
          }}
        >
          No slimes match the selected filters
        </div>
      )}
      {/* [Change 3] Pass likeData and currentUserId down to TimelineView. */}
      {tab === "timeline" && (
        <TimelineView
          logs={logs}
          likeData={likeData}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}

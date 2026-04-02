"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { CollectionLog } from "@/lib/types";
import SlimeDetailCard from "@/components/collection/SlimeDetailCard";
import TimelineView from "@/components/collection/TimelineView";

interface Props {
  logs: CollectionLog[];
}

const TYPE_COLORS: Record<string, string> = {
  butter: "#FFB347",
  clear: "#00F0FF",
  cloud: "#F5F5F5",
  icee: "#4FC3F7",
  fluffy: "#FF6B9D",
  floam: "#8BC34A",
  snow_fizz: "#E0E0E0",
  thick_and_glossy: "#9B59B6",
  jelly: "#4ECDC4",
  beaded: "#FF00E5",
  clay: "#E74C3C",
  cloud_cream: "#FFE66D",
  magnetic: "#78909C",
  thermochromic: "#F39C12",
  avalanche: "#3498DB",
  slay: "#39FF14",
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

function getBlobColor(log: CollectionLog): string {
  if (log.colors && log.colors.length > 0) {
    const colorMap: Record<string, string> = {
      pink: "#FF6B9D",
      green: "#39FF14",
      blue: "#00F0FF",
      purple: "#9B59B6",
      white: "#F5F5F5",
      yellow: "#FFE66D",
      orange: "#FFB347",
      red: "#E74C3C",
      cyan: "#00F0FF",
      magenta: "#FF00E5",
      teal: "#4ECDC4",
      black: "#333",
    };
    const c = log.colors[0].toLowerCase();
    for (const [key, val] of Object.entries(colorMap)) {
      if (c.includes(key)) return val;
    }
  }
  if (log.slime_type && TYPE_COLORS[log.slime_type]) {
    return TYPE_COLORS[log.slime_type];
  }
  return "#39FF14";
}

interface Transform {
  x: number;
  y: number;
  scale: number;
}

export default function SpiralView({ logs }: Props) {
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

    filteredLogs.forEach((log, i) => {
      const angle = i * ((2 * Math.PI) / PHI);
      const dist = Math.sqrt(i + 1) * SPACING;
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;
      const rating = log.rating_overall ?? null;
      const r = rating !== null ? 6 + (rating / 5) * 14 : 10;
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

    ctx.restore();
    blobPositions.current = positions;
  }, [filteredLogs]);

  useEffect(() => {
    draw();
  }, [draw, transform]);

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

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (CANVAS_SIZE / rect.width);
      const my = (e.clientY - rect.top) * (CANVAS_SIZE / rect.height);
      const t = transformRef.current;
      const cx = (mx - t.x) / t.scale;
      const cy = (my - t.y) / t.scale;
      let hit: CollectionLog | null = null;
      for (let i = blobPositions.current.length - 1; i >= 0; i--) {
        const { x, y, r, log } = blobPositions.current[i];
        if ((cx - x) ** 2 + (cy - y) ** 2 <= (r + 4) ** 2) {
          hit = log;
          break;
        }
      }
      setSelectedLog(hit);
    },
    [],
  );

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
        onClick={() => setBrandDropdownOpen((v) => !v)}
        style={{
          width: "100%",
          padding: "10px 14px",
          background: "rgba(45,10,78,0.4)",
          border: "1px solid rgba(45,10,78,0.7)",
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
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
          {brandDropdownOpen ? "\u25b2" : "\u25bc"}
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

  const detailCard = selectedLog && (
    <div
      style={{
        background: "rgba(45,10,78,0.5)",
        border: "1px solid rgba(45,10,78,0.7)",
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <SlimeDetailCard log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {tabBar}
      {tab === "spiral" && brandFilter}
      {tab === "spiral" && canvasBlock}
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
      {tab === "timeline" && <TimelineView logs={logs} />}
    </div>
  );
}

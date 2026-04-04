"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { CollectionLog } from "@/lib/types";
import SlimeDetailCard from "@/components/collection/SlimeDetailCard";
import type { LikeDataMap } from "@/app/collection/page";

// [Change 1] Added likeData and currentUserId to Props.
interface Props {
  logs: CollectionLog[];
  likeData: LikeDataMap;
  currentUserId: string | null;
}

const DEFAULT_PALETTE = [
  "#39FF14",
  "#FF6B9D",
  "#00F0FF",
  "#FF00E5",
  "#FFB347",
  "#9B59B6",
  "#4ECDC4",
  "#FFE66D",
  "#E74C3C",
  "#3498DB",
  "#2ECC71",
  "#F39C12",
  "#E91E8C",
  "#00BCD4",
  "#8BC34A",
];

const STORAGE_KEY = "slimelog_brand_colors";
const CANVAS_SIZE = 600;

function loadBrandColors(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveBrandColors(colors: Record<string, string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  } catch {
    // ignore
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function lightenHex(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

interface Transform {
  x: number;
  y: number;
  scale: number;
}

interface NodeData {
  x: number;
  y: number;
  r: number;
  log: CollectionLog;
  brand: string;
  color: string;
  isHub: false;
}

interface HubData {
  x: number;
  y: number;
  r: number;
  brand: string;
  color: string;
  isHub: true;
}

type CanvasNode = NodeData | HubData;

export default function GalaxyView({ logs, likeData, currentUserId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [brandColors, setBrandColors] = useState<Record<string, string>>({});
  const [transform, setTransform] = useState<Transform>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [highlightedBrand, setHighlightedBrand] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<CollectionLog | null>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const nodesRef = useRef<CanvasNode[]>([]);
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 });

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useEffect(() => {
    const stored = loadBrandColors();
    const brands = Array.from(
      new Set(logs.map((l) => l.brand_name_raw).filter(Boolean)),
    ) as string[];
    const merged = { ...stored };
    let dirty = false;
    brands.forEach((brand, i) => {
      if (!merged[brand]) {
        merged[brand] = DEFAULT_PALETTE[i % DEFAULT_PALETTE.length];
        dirty = true;
      }
    });
    if (dirty) saveBrandColors(merged);
    setBrandColors(merged);
  }, [logs]);

  const brands = Array.from(
    new Set(logs.map((l) => l.brand_name_raw).filter(Boolean)),
  ) as string[];

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = CANVAS_SIZE;
    const H = CANVAS_SIZE;
    const cx = W / 2;
    const cy = H / 2;
    const t = transformRef.current;

    ctx.clearRect(0, 0, W, H);

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

    const nodes: CanvasNode[] = [];
    const brandLogs: Record<string, CollectionLog[]> = {};
    logs.forEach((log) => {
      const brand = log.brand_name_raw ?? "__unknown__";
      if (!brandLogs[brand]) brandLogs[brand] = [];
      brandLogs[brand].push(log);
    });

    const allBrands = Object.keys(brandLogs);
    const hubPositions: Record<string, { x: number; y: number }> = {};

    allBrands.forEach((brand, i) => {
      const angle = (i / allBrands.length) * Math.PI * 2;
      const dist = Math.min(W, H) * 0.28;
      const hx = cx + Math.cos(angle) * dist;
      const hy = cy + Math.sin(angle) * dist;
      hubPositions[brand] = { x: hx, y: hy };
    });

    // Draw connection lines
    allBrands.forEach((brand) => {
      const { x: hx, y: hy } = hubPositions[brand];
      const color = brandColors[brand] ?? "#39FF14";
      const dimmed = highlightedBrand !== null && highlightedBrand !== brand;
      const branchLogs = brandLogs[brand];

      branchLogs.forEach((log, j) => {
        const angle = (j / branchLogs.length) * Math.PI * 2;
        const count = branchLogs.length;
        const minDist = 60;
        const maxDist = Math.min(120, 60 + count * 4);
        const dist =
          minDist + (j / Math.max(count - 1, 1)) * (maxDist - minDist);
        const nx = hx + Math.cos(angle) * dist;
        const ny = hy + Math.sin(angle) * dist;

        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = hexToRgba(color, dimmed ? 0.05 : 0.15);
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });
    });

    // Draw nodes
    allBrands.forEach((brand) => {
      const { x: hx, y: hy } = hubPositions[brand];
      const color = brandColors[brand] ?? "#39FF14";
      const dimmed = highlightedBrand !== null && highlightedBrand !== brand;
      const alpha = dimmed ? 0.3 : 1;
      const branchLogs = brandLogs[brand];

      branchLogs.forEach((log, j) => {
        const angle = (j / branchLogs.length) * Math.PI * 2;
        const count = branchLogs.length;
        const minDist = 60;
        const maxDist = Math.min(120, 60 + count * 4);
        const dist =
          minDist + (j / Math.max(count - 1, 1)) * (maxDist - minDist);
        const nx = hx + Math.cos(angle) * dist;
        const ny = hy + Math.sin(angle) * dist;

        const rating = log.rating_overall ?? null;
        const r = rating !== null ? 4 + (rating / 5) * 12 : 8;
        const nodeColor = lightenHex(color, j * 3);
        const isFiveStar = rating === 5;

        if (isFiveStar) {
          ctx.beginPath();
          ctx.arc(nx, ny, r + 5, 0, Math.PI * 2);
          ctx.strokeStyle = hexToRgba(color, 0.3 * alpha);
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(nx, ny, r, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(nx - r * 0.25, ny - r * 0.25, r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba("#ffffff", 0.3);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (t.scale > 1.2) {
          ctx.font = `${Math.round((8 / t.scale) * 10) / 10}px system-ui`;
          ctx.fillStyle = hexToRgba("#fff", alpha * 0.7);
          ctx.textAlign = "center";
          ctx.fillText(log.slime_name ?? "", nx, ny + r + 10 / t.scale);
        }

        if (t.scale > 1.8 && rating !== null) {
          ctx.font = `bold ${Math.round((7 / t.scale) * 10) / 10}px system-ui`;
          ctx.fillStyle = "#0A0A0A";
          ctx.textAlign = "center";
          ctx.fillText(String(rating), nx, ny + 3 / t.scale);
        }

        nodes.push({
          x: nx,
          y: ny,
          r,
          log,
          brand,
          color: nodeColor,
          isHub: false,
        });
      });

      ctx.globalAlpha = alpha;

      const hubGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, 28);
      hubGrad.addColorStop(0, hexToRgba(color, 0.4));
      hubGrad.addColorStop(1, hexToRgba(color, 0));
      ctx.fillStyle = hubGrad;
      ctx.beginPath();
      ctx.arc(hx, hy, 28, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(hx, hy, 20, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = hexToRgba("#fff", 0.3);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (t.scale >= 0.6) {
        const fontSize = Math.max(9, Math.min(13, 11 / t.scale));
        ctx.font = `bold ${fontSize}px system-ui`;
        ctx.fillStyle = hexToRgba("#fff", alpha);
        ctx.textAlign = "center";
        const label = brand.length > 14 ? brand.slice(0, 13) + "\u2026" : brand;
        ctx.fillText(label, hx, hy + 20 + fontSize + 4);
      }

      ctx.globalAlpha = 1;
      nodes.push({ x: hx, y: hy, r: 20, brand, color, isHub: true });
    });

    ctx.restore();
    nodesRef.current = nodes;
  }, [logs, brandColors, highlightedBrand]);

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
      const mouseX = (e.clientX - rect.left) * (CANVAS_SIZE / rect.width);
      const mouseY = (e.clientY - rect.top) * (CANVAS_SIZE / rect.height);
      setTransform((prev) => {
        const newScale = Math.max(0.3, Math.min(4, prev.scale * delta));
        const scaleChange = newScale / prev.scale;
        const newX = mouseX - scaleChange * (mouseX - prev.x);
        const newY = mouseY - scaleChange * (mouseY - prev.y);
        return { x: newX, y: newY, scale: newScale };
      });
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

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
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    setTransform((prev) => ({
      ...prev,
      x: dragStart.current.tx + dx * scaleX,
      y: dragStart.current.ty + dy * scaleX,
    }));
  };

  const handleMouseUp = () => {
    dragging.current = false;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const t = transformRef.current;
    const cx = (mx - t.x) / t.scale;
    const cy = (my - t.y) / t.scale;

    let hit: CollectionLog | null = null;
    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const node = nodesRef.current[i];
      const dx = cx - node.x;
      const dy = cy - node.y;
      if (dx * dx + dy * dy <= (node.r + 6) * (node.r + 6)) {
        if (!node.isHub) hit = (node as NodeData).log;
        break;
      }
    }
    setSelectedLog(hit);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const t = transformRef.current;
    const cx = (mx - t.x) / t.scale;
    const cy = (my - t.y) / t.scale;

    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const node = nodesRef.current[i];
      if (!node.isHub) continue;
      const dx = cx - node.x;
      const dy = cy - node.y;
      if (dx * dx + dy * dy <= (node.r + 4) * (node.r + 4)) {
        const targetScale = 1.8;
        const newX = CANVAS_SIZE / 2 - node.x * targetScale;
        const newY = CANVAS_SIZE / 2 - node.y * targetScale;
        setTransform({ x: newX, y: newY, scale: targetScale });
        break;
      }
    }
  };

  const handleColorChange = (brand: string, color: string) => {
    const updated = { ...brandColors, [brand]: color };
    setBrandColors(updated);
    saveBrandColors(updated);
  };

  const zoomIn = () =>
    setTransform((prev) => ({ ...prev, scale: Math.min(4, prev.scale * 1.2) }));
  const zoomOut = () =>
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.3, prev.scale * 0.8),
    }));
  const resetView = () => setTransform({ x: 0, y: 0, scale: 1 });

  const brandScroller = brands.length > 0 && (
    <div
      style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        paddingBottom: 4,
        scrollbarWidth: "none",
      }}
    >
      <button
        onClick={() => setHighlightedBrand(null)}
        style={{
          flexShrink: 0,
          padding: "6px 14px",
          borderRadius: 20,
          border: `1px solid ${highlightedBrand === null ? "#39FF14" : "rgba(45,10,78,0.7)"}`,
          background:
            highlightedBrand === null
              ? "rgba(57,255,20,0.15)"
              : "rgba(45,10,78,0.25)",
          color:
            highlightedBrand === null ? "#39FF14" : "rgba(255,255,255,0.5)",
          fontSize: 13,
          cursor: "pointer",
          fontWeight: highlightedBrand === null ? 700 : 400,
        }}
      >
        All
      </button>
      {brands.map((brand) => {
        const color = brandColors[brand] ?? "#39FF14";
        const isActive = highlightedBrand === brand;
        return (
          <div
            key={brand}
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 20,
              border: `1px solid rgba(45,10,78,0.7)`,
              borderLeft: `3px solid ${color}`,
              background: isActive
                ? hexToRgba(color, 0.12)
                : "rgba(45,10,78,0.25)",
              cursor: "pointer",
            }}
            onClick={() => setHighlightedBrand(isActive ? null : brand)}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 13,
                color: isActive ? "#fff" : "rgba(255,255,255,0.6)",
                whiteSpace: "nowrap",
              }}
            >
              {brand}
            </span>
            <input
              type="color"
              value={color}
              onChange={(e) => handleColorChange(brand, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 18,
                height: 18,
                border: "none",
                borderRadius: 4,
                background: "none",
                cursor: "pointer",
                padding: 0,
                flexShrink: 0,
                opacity: 0.7,
              }}
              title="Change brand color"
            />
          </div>
        );
      })}
    </div>
  );

  const canvasBlock = (
    <div style={{ position: "relative" }}>
      <div
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
          onDoubleClick={handleDoubleClick}
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
        scroll to zoom · drag to pan · double-tap hub to focus
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
      {/* [Change 3] Added imageUrl, brandSlug, onImageOpen; removed brandColor (replaced by brandSlug). */}
      <SlimeDetailCard
        log={selectedLog}
        imageUrl={selectedLog.image_url ?? null}
        brandSlug={null}
        onClose={() => setSelectedLog(null)}
        onImageOpen={() => {}}
        likeCount={selectedLikeEntry.likeCount}
        commentCount={selectedLikeEntry.commentCount}
        isLikedByCurrentUser={selectedLikeEntry.isLiked}
        currentUserId={currentUserId}
      />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {brandScroller}
      {canvasBlock}
      {detailCard}
    </div>
  );
}

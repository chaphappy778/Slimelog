"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import SlimeDetailCard from "./SlimeDetailCard";
import type { CollectionLog } from "@/lib/types";
import type { LikeDataMap } from "@/app/collection/page";

// [Change 1] Added likeData and currentUserId to Props.
interface Props {
  logs: CollectionLog[];
  likeData: LikeDataMap;
  currentUserId: string | null;
}

const CANVAS_SIZE = 600;
const PAD_LEFT = 48;
const PAD_RIGHT = 24;
const PAD_TOP = 24;
const PAD_BOTTOM = 48;

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
  if (log.slime_type && TYPE_COLORS[log.slime_type])
    return TYPE_COLORS[log.slime_type];
  return "#39FF14";
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function TimelineView({ logs, likeData, currentUserId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [selectedLog, setSelectedLog] = useState<CollectionLog | null>(null);
  const dotPositions = useRef<
    Array<{ x: number; y: number; r: number; log: CollectionLog }>
  >([]);
  const animDone = useRef(false);

  const sortedLogs = [...logs]
    .filter((l) => l.created_at)
    .sort(
      (a, b) =>
        new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime(),
    );

  // Reset animation when logs change
  useEffect(() => {
    setVisibleCount(0);
    animDone.current = false;
    setSelectedLog(null);

    if (sortedLogs.length === 0) return;

    const delay = Math.max(30, 800 / sortedLogs.length);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= sortedLogs.length) {
        clearInterval(interval);
        animDone.current = true;
      }
    }, delay);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedLogs.length, logs]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = CANVAS_SIZE;
    const H = CANVAS_SIZE;

    // Background
    const grad = ctx.createRadialGradient(
      W / 2,
      H * 0.4,
      0,
      W / 2,
      H * 0.4,
      W * 0.7,
    );
    grad.addColorStop(0, "#2D0A4E");
    grad.addColorStop(0.5, "#100020");
    grad.addColorStop(1, "#0A0A0A");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    if (sortedLogs.length === 0) {
      ctx.font = "14px system-ui";
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.textAlign = "center";
      ctx.fillText("No logs with dates to display", W / 2, H / 2);
      return;
    }

    const plotW = W - PAD_LEFT - PAD_RIGHT;
    const plotH = H - PAD_TOP - PAD_BOTTOM;

    const minDate = new Date(sortedLogs[0].created_at!).getTime();
    const maxDate = new Date(
      sortedLogs[sortedLogs.length - 1].created_at!,
    ).getTime();
    const dateRange = maxDate - minDate || 1;
    const maxCount = sortedLogs.length;

    // Grid lines
    ctx.strokeStyle = "rgba(45,10,78,0.6)";
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let g = 0; g <= gridLines; g++) {
      const yRatio = g / gridLines;
      const y = PAD_TOP + plotH * (1 - yRatio * 0.8);
      ctx.beginPath();
      ctx.moveTo(PAD_LEFT, y);
      ctx.lineTo(PAD_LEFT + plotW, y);
      ctx.stroke();

      // Y axis labels
      ctx.font = "10px system-ui";
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.textAlign = "right";
      ctx.fillText(String(Math.round(yRatio * maxCount)), PAD_LEFT - 6, y + 4);
    }

    // Axes
    ctx.strokeStyle = "rgba(45,10,78,0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, PAD_TOP);
    ctx.lineTo(PAD_LEFT, PAD_TOP + plotH);
    ctx.lineTo(PAD_LEFT + plotW, PAD_TOP + plotH);
    ctx.stroke();

    // X axis date labels (auto-spaced)
    const numLabels = Math.min(5, sortedLogs.length);
    const step = Math.floor(sortedLogs.length / numLabels) || 1;
    ctx.font = "10px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.textAlign = "center";
    for (let i = 0; i < sortedLogs.length; i += step) {
      const log = sortedLogs[i];
      const t = new Date(log.created_at!).getTime();
      const xRatio = dateRange > 0 ? (t - minDate) / dateRange : 0.5;
      const x = PAD_LEFT + xRatio * plotW;
      const label = new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "2-digit",
      }).format(new Date(t));
      ctx.fillText(label, x, PAD_TOP + plotH + 14);

      // Tick
      ctx.strokeStyle = "rgba(45,10,78,0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, PAD_TOP + plotH);
      ctx.lineTo(x, PAD_TOP + plotH + 4);
      ctx.stroke();
    }

    // Calculate dot positions for all logs
    const allPositions: Array<{
      x: number;
      y: number;
      r: number;
      log: CollectionLog;
    }> = [];
    sortedLogs.forEach((log, i) => {
      const t = new Date(log.created_at!).getTime();
      const xRatio = dateRange > 0 ? (t - minDate) / dateRange : 0.5;
      const yRatio = (i + 1) / maxCount;
      const x = PAD_LEFT + xRatio * plotW;
      const y = PAD_TOP + plotH * (1 - yRatio * 0.8);
      const isFiveStar = log.rating_overall === 5;
      const r = isFiveStar ? 8 : 5;
      allPositions.push({ x, y, r, log });
    });

    dotPositions.current = allPositions;

    const visiblePositions = allPositions.slice(0, visibleCount);

    // Draw connecting line through all visible dots (only when all visible)
    if (animDone.current && visiblePositions.length > 1) {
      ctx.beginPath();
      ctx.moveTo(visiblePositions[0].x, visiblePositions[0].y);
      for (let i = 1; i < visiblePositions.length; i++) {
        const p = visiblePositions[i];
        ctx.lineTo(p.x, p.y);
      }
      const lineGrad = ctx.createLinearGradient(
        PAD_LEFT,
        0,
        PAD_LEFT + plotW,
        0,
      );
      lineGrad.addColorStop(0, "rgba(45,10,78,0.8)");
      lineGrad.addColorStop(1, "rgba(57,255,20,0.4)");
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (!animDone.current && visiblePositions.length > 1) {
      // Partial line during animation
      ctx.beginPath();
      ctx.moveTo(visiblePositions[0].x, visiblePositions[0].y);
      for (let i = 1; i < visiblePositions.length; i++) {
        ctx.lineTo(visiblePositions[i].x, visiblePositions[i].y);
      }
      ctx.strokeStyle = "rgba(57,255,20,0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw dots
    visiblePositions.forEach(({ x, y, r, log }, i) => {
      const color = getBlobColor(log);
      const isFiveStar = log.rating_overall === 5;

      if (isFiveStar) {
        ctx.beginPath();
        ctx.arc(x, y, r + 5, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(color, 0.2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Highlight
      ctx.beginPath();
      ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba("#ffffff", 0.3);
      ctx.fill();

      // Sequence number for last visible dot during animation
      if (!animDone.current && i === visiblePositions.length - 1) {
        ctx.font = "bold 9px system-ui";
        ctx.fillStyle = "rgba(57,255,20,0.8)";
        ctx.textAlign = "center";
        ctx.fillText(String(i + 1), x, y - r - 4);
      }
    });
  }, [sortedLogs, visibleCount]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_SIZE / rect.width;
      const scaleY = CANVAS_SIZE / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      let hit: CollectionLog | null = null;
      for (let i = dotPositions.current.length - 1; i >= 0; i--) {
        const { x, y, r, log } = dotPositions.current[i];
        if (i >= visibleCount) continue;
        const dx = mx - x;
        const dy = my - y;
        if (dx * dx + dy * dy <= (r + 6) * (r + 6)) {
          hit = log;
          break;
        }
      }
      setSelectedLog(hit);
    },
    [visibleCount],
  );

  // [Change 2] Look up likeData for the selected log; fall back to zeros if not found.
  const selectedLikeEntry = selectedLog
    ? (likeData[selectedLog.id] ?? {
        likeCount: 0,
        commentCount: 0,
        isLiked: false,
      })
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Canvas */}
      <div
        style={{
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(45,10,78,0.7)",
          cursor: "crosshair",
          position: "relative",
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={{ width: "100%", display: "block" }}
          onClick={handleCanvasClick}
        />
        {/* Progress indicator during animation */}
        {!animDone.current && sortedLogs.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              fontSize: 11,
              color: "#39FF14",
              background: "rgba(10,10,10,0.7)",
              padding: "3px 8px",
              borderRadius: 6,
            }}
          >
            {visibleCount} / {sortedLogs.length}
          </div>
        )}
      </div>

      {/* [Change 3] Detail card now passes like/comment props. */}
      {selectedLog && selectedLikeEntry && (
        <div
          style={{
            background: "rgba(45,10,78,0.5)",
            border: "1px solid rgba(45,10,78,0.7)",
            borderRadius: 12,
            padding: "14px 16px",
          }}
        >
          <SlimeDetailCard
            log={selectedLog}
            onClose={() => setSelectedLog(null)}
            likeCount={selectedLikeEntry.likeCount}
            commentCount={selectedLikeEntry.commentCount}
            isLikedByCurrentUser={selectedLikeEntry.isLiked}
            currentUserId={currentUserId}
          />
        </div>
      )}

      {sortedLogs.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "rgba(255,255,255,0.3)",
            fontSize: 14,
          }}
        >
          No logged dates to display on the timeline
        </div>
      )}
    </div>
  );
}

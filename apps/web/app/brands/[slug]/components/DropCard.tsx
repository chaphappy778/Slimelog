// apps/web/app/brands/[slug]/components/DropCard.tsx
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

interface DropSlimeRow {
  id: string;
  name: string | null;
  base_type: string | null;
  price: number | null;
  image_url?: string | null;
  slime_id: string | null;
}

interface DropCardProps {
  drop: {
    id: string;
    name: string;
    description: string | null;
    drop_at: string;
    status: string | null;
    cover_image_url: string | null;
    drop_type: "new_drop" | "restock" | null;
    discount_code: string | null;
    free_shipping_threshold: number | null;
    drop_slimes: DropSlimeRow[];
  };
}

function formatDropDate(isoString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoString));
}

function formatPrice(threshold: number): string {
  return Number.isInteger(threshold) ? String(threshold) : threshold.toFixed(2);
}

export default function DropCard({ drop }: DropCardProps) {
  const [countdown, setCountdown] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    function computeCountdown() {
      const diff = new Date(drop.drop_at).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown("Live Now");
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const parts: string[] = [];
      if (days > 0) parts.push(`${days}d`);
      if (days > 0 || hours > 0) parts.push(`${hours}h`);
      if (days > 0 || hours > 0 || minutes > 0) parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);
      setCountdown(parts.join(" "));
    }

    computeCountdown();
    const id = setInterval(computeCountdown, 1000);
    return () => clearInterval(id);
  }, [drop.drop_at]);

  function handleCopy() {
    if (!drop.discount_code) return;
    navigator.clipboard.writeText(drop.discount_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="rounded-2xl overflow-hidden w-full"
      style={{
        background: "rgba(45,10,78,0.25)",
        border: "1px solid rgba(45,10,78,0.7)",
      }}
    >
      {/* Cover image */}
      <div className="aspect-video relative overflow-hidden">
        {drop.cover_image_url ? (
          <Image
            src={drop.cover_image_url}
            alt={drop.name}
            fill
            className="object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(57,255,20,0.15), rgba(0,240,255,0.15))",
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              aria-hidden="true"
              style={{ opacity: 0.3 }}
            >
              <path d="M12 2 L14 9 L21 12 L14 15 L12 22 L10 15 L3 12 L10 9 Z" />
            </svg>
          </div>
        )}

        {/* Drop type badge */}
        {drop.drop_type === "new_drop" && (
          <span
            className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wide"
            style={{
              color: "#00F0FF",
              background: "rgba(0,240,255,0.15)",
              border: "1px solid rgba(0,240,255,0.3)",
            }}
          >
            New Drop
          </span>
        )}
        {drop.drop_type === "restock" && (
          <span
            className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wide"
            style={{
              color: "#FFB800",
              background: "rgba(255,184,0,0.15)",
              border: "1px solid rgba(255,184,0,0.3)",
            }}
          >
            Restock
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-4 pt-4 pb-5 space-y-3">
        {/* Name */}
        <p
          className="text-lg font-black text-white"
          style={{ fontFamily: "Montserrat, Inter, sans-serif" }}
        >
          {drop.name}
        </p>

        {/* Date */}
        <p className="text-xs text-slime-muted">
          {formatDropDate(drop.drop_at)}
        </p>

        {/* Countdown */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slime-muted mb-0.5">
            Drops in
          </p>
          <p
            className="text-sm font-black"
            style={{
              color: "#39FF14",
              fontFamily: "Montserrat, Inter, sans-serif",
            }}
          >
            {countdown}
          </p>
        </div>

        {/* Discount code */}
        {drop.discount_code && (
          <div className="flex items-center gap-2">
            <p className="text-[10px] uppercase tracking-widest text-slime-muted">
              Code
            </p>
            <span
              className="px-3 py-1 rounded-full text-sm font-black text-white"
              style={{
                background: "rgba(45,10,78,0.5)",
                border: "1px solid rgba(45,10,78,0.8)",
              }}
            >
              {drop.discount_code}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy discount code"
              className="flex items-center justify-center rounded-full transition-colors"
              style={{
                width: 28,
                height: 28,
                background: "rgba(45,10,78,0.5)",
              }}
            >
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M2 7l3.5 3.5L12 3"
                    stroke="#39FF14"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect
                    x="4"
                    y="4"
                    width="8"
                    height="8"
                    rx="1.5"
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M2 10V2h8"
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          </div>
        )}

        {/* Free shipping */}
        {drop.free_shipping_threshold != null && (
          <p className="text-xs text-slime-muted">
            Free shipping on orders over $
            {formatPrice(drop.free_shipping_threshold)}
          </p>
        )}

        {/* What's Dropping — swipeable image carousel */}
        {drop.drop_slimes.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slime-muted mb-2">
              What&apos;s Dropping
            </p>
            <div
              className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
              style={{
                msOverflowStyle: "none",
                scrollbarWidth: "none",
              }}
            >
              {drop.drop_slimes.map((slime) => (
                <div
                  key={slime.id}
                  style={{
                    background: "rgba(45,10,78,0.4)",
                    border: "1px solid rgba(45,10,78,0.6)",
                    flexShrink: 0,
                    width: 120,
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  {/* Image area */}
                  <div className="relative" style={{ width: 120, height: 90 }}>
                    {slime.image_url ? (
                      <Image
                        src={slime.image_url}
                        alt={slime.name ?? "Slime"}
                        fill
                        sizes="120px"
                        className="object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(57,255,20,0.08), rgba(45,10,78,0.4))",
                        }}
                      >
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth="1.5"
                          aria-hidden="true"
                        >
                          <path d="M12 2 C8 7 5 11 5 15 a7 7 0 0 0 14 0 C19 11 16 7 12 2 z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Card footer */}
                  <div className="px-2 py-1.5 flex flex-col gap-0.5">
                    <p className="text-xs font-semibold text-white truncate">
                      {slime.name ?? "Unnamed"}
                    </p>
                    {slime.price != null && (
                      <p
                        className="text-xs font-bold"
                        style={{ color: "#39FF14" }}
                      >
                        ${slime.price.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <Link href={`/drops/${drop.id}`} className="block mt-1">
          <div
            className="w-full py-3 rounded-xl text-sm text-center font-black"
            style={{
              background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              color: "#0A0A0A",
              fontFamily: "Montserrat, Inter, sans-serif",
            }}
          >
            Shop This Drop
          </div>
        </Link>
      </div>
    </div>
  );
}

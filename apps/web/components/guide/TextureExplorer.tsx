// apps/web/components/guide/TextureExplorer.tsx
// T32 (2026-07-13): Client wrapper for Part One — renders the 2-col
// gradient tile grid and manages the tap-through detail sheet. Also
// handles hash-on-load: /guide#texture-butter scrolls to the butter
// card AND opens its detail sheet on first paint.

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import type { GuideTexture } from "@/app/guide/content";

interface TextureExplorerProps {
  textures: GuideTexture[];
  /** Server-computed log counts keyed by slug. Renders inside CTA. */
  logCountsBySlug: Record<string, number>;
}

export default function TextureExplorer({
  textures,
  logCountsBySlug,
}: TextureExplorerProps) {
  const [selected, setSelected] = useState<GuideTexture | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  // 2026-07-13: full-screen image lightbox. When set, renders a
  // dedicated fullscreen viewer over everything else.
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState<string>("");

  const openSheet = useCallback((texture: GuideTexture) => {
    setSelected(texture);
    setSheetVisible(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    // Delay clearing selected so the exit animation gets the content.
    window.setTimeout(() => setSelected(null), 260);
  }, []);

  const openLightbox = useCallback((src: string, alt: string) => {
    setLightboxSrc(src);
    setLightboxAlt(alt);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxSrc(null);
  }, []);

  // Hash-on-load: /guide#texture-butter scrolls to the butter card AND
  // opens its detail sheet.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash?.replace(/^#/, "");
    if (!hash) return;
    if (hash.startsWith("texture-")) {
      const slug = hash.slice("texture-".length);
      const texture = textures.find((t) => t.slug === slug);
      if (texture) {
        // Wait a tick for the page to lay out, then scroll + open.
        window.setTimeout(() => {
          const el = document.getElementById(`texture-${texture.slug}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          openSheet(texture);
        }, 120);
      }
    }
  }, [textures, openSheet]);

  // ESC to close the sheet.
  useEffect(() => {
    if (!sheetVisible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetVisible, closeSheet]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {textures.map((texture, i) => (
          <TextureCard
            key={texture.slug}
            texture={texture}
            index={i}
            onTap={() => openSheet(texture)}
          />
        ))}
      </div>

      {selected ? (
        <TextureDetailSheet
          texture={selected}
          visible={sheetVisible}
          onClose={closeSheet}
          logCount={logCountsBySlug[selected.slug] ?? 0}
          onOpenImage={openLightbox}
        />
      ) : null}

      {/* 2026-07-13: full-screen image lightbox for the detail sheet's
          example photo. Tap outside or the ✕ to dismiss. Escape also
          closes. Sits above the sheet's z-index. */}
      {lightboxSrc ? (
        <ImageLightbox
          src={lightboxSrc}
          alt={lightboxAlt}
          onClose={closeLightbox}
        />
      ) : null}
    </>
  );
}

// ─── Image Lightbox ─────────────────────────────────────────────────────

function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // Lock scroll while open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Full size image"}
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center"
      style={{
        background: "rgba(0,0,0,0.94)",
        padding: 16,
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image"
        className="absolute top-4 right-4 flex items-center justify-center rounded-full"
        style={{
          width: 40,
          height: 40,
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "#FFFFFF",
          zIndex: 1,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="w-5 h-5"
          aria-hidden="true"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "min(96vw, 900px)",
          maxHeight: "min(88vh, 900px)",
        }}
      >
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={1200}
          style={{
            width: "100%",
            height: "auto",
            maxHeight: "88vh",
            objectFit: "contain",
            borderRadius: 12,
          }}
          priority
        />
      </div>
    </div>
  );
}

// ─── Card ───────────────────────────────────────────────────────────────

function TextureCard({
  texture,
  index,
  onTap,
}: {
  texture: GuideTexture;
  index: number;
  onTap: () => void;
}) {
  const num = (index + 1).toString().padStart(2, "0");
  const hasPhoto = !!texture.example.imagePath;
  return (
    <button
      type="button"
      id={`texture-${texture.slug}`}
      onClick={onTap}
      aria-label={`Learn about ${texture.name} slime`}
      className="relative rounded-2xl overflow-hidden text-left active:scale-[0.98] transition-transform"
      style={{
        aspectRatio: "1 / 1.12",
        background: `linear-gradient(150deg, ${texture.gradientFrom} 0%, ${texture.gradientTo} 100%)`,
        border: "1px solid rgba(45,10,78,0.7)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: 0,
      }}
    >
      {/* Photo layer (when present) */}
      {hasPhoto && texture.example.imagePath ? (
        <div
          className="absolute inset-0"
          style={{ zIndex: 0 }}
          aria-hidden="true"
        >
          <Image
            src={texture.example.imagePath}
            alt=""
            fill
            sizes="(max-width: 640px) 45vw, 300px"
            style={{
              objectFit: "cover",
              opacity: 0.78,
            }}
            priority={index < 4}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(155deg, ${texture.gradientFrom}88 0%, transparent 45%, ${texture.gradientTo}55 100%)`,
            }}
          />
        </div>
      ) : (
        // Wave decoration when we're gradient-only
        <svg
          viewBox="0 0 200 120"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute left-0 right-0 bottom-0"
          style={{ height: "52%", zIndex: 1, opacity: 0.32 }}
        >
          <path
            d="M0 40 Q 50 10 100 34 T 200 30 V120 H0 Z"
            fill="#0a0012"
          />
        </svg>
      )}

      {/* Bottom fade for text legibility */}
      <div
        className="absolute inset-x-0 bottom-0"
        aria-hidden="true"
        style={{
          height: "58%",
          background:
            "linear-gradient(to top, rgba(8,0,18,0.92) 0%, rgba(8,0,18,0.35) 55%, transparent 100%)",
          zIndex: 2,
        }}
      />

      {/* Top-left number chip */}
      <span
        className="absolute top-2.5 left-2.5 rounded-md px-2 py-0.5 font-black text-[11px]"
        style={{
          background: "rgba(8,0,18,0.55)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          color: "rgba(255,255,255,0.92)",
          fontFamily: "Montserrat, sans-serif",
          letterSpacing: "0.04em",
          zIndex: 3,
        }}
      >
        {num}
      </span>

      {/* Top-right: gradient-fallback tag when no photo */}
      {!hasPhoto ? (
        <span
          className="absolute rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
          style={{
            top: 10,
            right: 10,
            color: "#FFD24A",
            background: "rgba(74,37,3,0.55)",
            border: "1px solid rgba(255,210,74,0.35)",
            letterSpacing: "0.04em",
            fontFamily: "Montserrat, sans-serif",
            zIndex: 3,
          }}
        >
          gradient
        </span>
      ) : null}

      {/* Meta */}
      <div className="relative px-3.5 py-3.5" style={{ zIndex: 4 }}>
        <div
          className="font-black text-white"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontSize: 19,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            textShadow: "0 2px 10px rgba(0,0,0,0.55)",
          }}
        >
          {texture.name}
        </div>
        <div
          className="mt-1 text-[11.5px]"
          style={{
            color: "rgba(255,255,255,0.78)",
            lineHeight: 1.35,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {texture.tagline}
        </div>
      </div>
    </button>
  );
}

// ─── Detail Sheet ───────────────────────────────────────────────────────

function TextureDetailSheet({
  texture,
  visible,
  onClose,
  logCount,
  onOpenImage,
}: {
  texture: GuideTexture;
  visible: boolean;
  onClose: () => void;
  logCount: number;
  onOpenImage: (src: string, alt: string) => void;
}) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/65"
        onClick={onClose}
        aria-hidden="true"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 200ms ease",
          pointerEvents: visible ? "auto" : "none",
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${texture.name} texture details`}
        className="fixed left-0 right-0 bottom-0 z-50"
        style={{
          maxHeight: "82vh",
          borderRadius: "22px 22px 0 0",
          background: "#1A0A2E",
          borderTop: "1px solid rgba(0,240,255,0.22)",
          overflowY: "auto",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: visible
            ? "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)"
            : "transform 240ms ease-in",
        }}
      >
        {/* Grab handle */}
        <div
          className="mx-auto mt-3"
          style={{
            width: 42,
            height: 5,
            borderRadius: 999,
            background: "rgba(255,255,255,0.22)",
          }}
          aria-hidden="true"
        />

        <div
          className="px-5 pt-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 96px)" }}
        >
          {/* 2026-07-13: hero image removed per user feedback — the
              lightbox trigger is the small example thumbnail below.
              Full-screen viewer opens on tap. */}

          {/* Name — big magenta→accent gradient text */}
          <h2
            className="m-0"
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 900,
              fontSize: 32,
              letterSpacing: "-0.02em",
              lineHeight: 1.02,
              background: `linear-gradient(120deg, ${texture.accentColor}, #FF00E5)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {texture.name}
          </h2>
          <p
            className="mt-2 text-[13px]"
            style={{ color: "rgba(245,245,245,0.7)" }}
          >
            {texture.tagline}
          </p>

          {/* Divider */}
          <div
            className="my-4"
            style={{ borderTop: "1px solid rgba(45,10,78,0.75)" }}
          />

          {/* Definition */}
          <SectionLabel color="#00F0FF">Definition</SectionLabel>
          <p
            className="text-[14px] mt-1.5"
            style={{
              color: "rgba(245,245,245,0.88)",
              lineHeight: 1.6,
              margin: "6px 0 0",
            }}
          >
            {texture.definition}
          </p>

          {/* Note */}
          {texture.note ? (
            <>
              <div className="mt-5">
                <SectionLabel color="#00F0FF">Note</SectionLabel>
              </div>
              <div
                className="rounded-2xl px-4 py-3 mt-1.5"
                style={{
                  background: "rgba(0,240,255,0.07)",
                  border: "1px solid rgba(0,240,255,0.28)",
                }}
              >
                <p
                  className="text-[13.5px]"
                  style={{
                    color: "rgba(245,245,245,0.82)",
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {texture.note}
                </p>
              </div>
            </>
          ) : null}

          {/* Variants */}
          {texture.variantsAndRelated.length > 0 ? (
            <>
              <div className="mt-5">
                <SectionLabel color="#00F0FF">Variants &amp; Related</SectionLabel>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {texture.variantsAndRelated.map((v) => (
                  <span
                    key={v}
                    className="text-[12px] font-medium rounded-full px-3 py-1.5"
                    style={{
                      color: "#00F0FF",
                      background: "rgba(0,240,255,0.10)",
                      border: "1px solid rgba(0,240,255,0.30)",
                    }}
                  >
                    {v}
                  </span>
                ))}
              </div>
            </>
          ) : null}

          {/* Example */}
          {texture.example.brandName ? (
            <div
              className="mt-5 flex items-center gap-3 rounded-2xl px-3 py-3"
              style={{
                background: "rgba(45,10,78,0.4)",
                border: "1px solid rgba(45,10,78,0.75)",
              }}
            >
              {texture.example.imagePath ? (
                <button
                  type="button"
                  onClick={() =>
                    onOpenImage(
                      texture.example.imagePath as string,
                      `${texture.example.slimeName} by ${texture.example.brandName}`,
                    )
                  }
                  aria-label={`View full size photo of ${texture.example.slimeName}`}
                  className="relative rounded-xl overflow-hidden flex-shrink-0 active:scale-[0.96] transition-transform"
                  style={{
                    width: 54,
                    height: 54,
                    background: `linear-gradient(135deg, ${texture.gradientFrom}, ${texture.gradientTo})`,
                    padding: 0,
                    border: 0,
                    cursor: "pointer",
                  }}
                >
                  <Image
                    src={texture.example.imagePath}
                    alt=""
                    fill
                    sizes="54px"
                    style={{ objectFit: "cover" }}
                  />
                </button>
              ) : (
                <div
                  className="rounded-xl flex-shrink-0"
                  style={{
                    width: 54,
                    height: 54,
                    background: `linear-gradient(135deg, ${texture.gradientFrom}, ${texture.gradientTo})`,
                  }}
                />
              )}
              <div className="flex-1 min-w-0">
                <div
                  className="text-[10.5px] font-bold uppercase"
                  style={{
                    color: "rgba(245,245,245,0.55)",
                    letterSpacing: "0.10em",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  Example
                </div>
                <div
                  className="text-white text-[13.5px] mt-0.5"
                  style={{ lineHeight: 1.3 }}
                >
                  <span
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontWeight: 800,
                    }}
                  >
                    {texture.example.slimeName}
                  </span>{" "}
                  by{" "}
                  {texture.example.brandSlug ? (
                    <Link
                      href={`/brands/${texture.example.brandSlug}`}
                      className="underline underline-offset-2"
                      style={{ color: "#00F0FF" }}
                    >
                      {texture.example.brandName}
                    </Link>
                  ) : (
                    <span style={{ color: "rgba(245,245,245,0.85)" }}>
                      {texture.example.brandName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* CTA */}
          <div className="mt-6">
            <Link
              href={`/discover/type/${texture.slug}`}
              className="block text-center rounded-xl px-4 py-3.5 font-bold"
              style={{
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                color: "#0A0A0A",
                fontSize: 14,
                textDecoration: "none",
                fontFamily: "Montserrat, sans-serif",
                // 2026-07-13: the community-logs CTA reads flat without
                // a proper glow; adding a green-primary halo + cyan
                // secondary so it lifts off the sheet.
                boxShadow:
                  "0 0 28px rgba(57,255,20,0.55), 0 8px 26px rgba(0,240,255,0.28), 0 0 6px rgba(57,255,20,0.5)",
              }}
            >
              {logCount > 0
                ? `See ${logCount.toLocaleString()} community logs of ${texture.name}`
                : `See community logs of ${texture.name}`}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function SectionLabel({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="text-[10.5px] font-bold uppercase"
      style={{
        color,
        letterSpacing: "0.14em",
        fontFamily: "Montserrat, sans-serif",
      }}
    >
      {children}
    </span>
  );
}

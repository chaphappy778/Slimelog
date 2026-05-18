// apps/web/app/brands/[slug]/components/BannerLightbox.tsx
"use client";

import React from "react";
import Image from "next/image";

interface BannerLightboxProps {
  bannerUrl: string;
  brandName: string;
}

export default function BannerLightbox({
  bannerUrl,
  brandName,
}: BannerLightboxProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        className="absolute inset-0 w-full h-full"
        onClick={() => setOpen(true)}
        aria-label={`View ${brandName} banner`}
      />
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center z-10"
            style={{ background: "rgba(255,255,255,0.15)" }}
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 2l12 12M14 2L2 14"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bannerUrl}
            alt={`${brandName} banner`}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "100%",
              maxHeight: "90vh",
              width: "auto",
              height: "auto",
              objectFit: "contain",
              borderRadius: 8,
            }}
          />
        </div>
      )}
    </>
  );
}

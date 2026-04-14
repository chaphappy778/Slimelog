// apps/web/components/CookieBanner.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const COOKIE_KEY = "slimelog_cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) setVisible(true);
  }, []);

  function handleAccept() {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
  }

  function handleDismiss() {
    localStorage.setItem(COOKIE_KEY, "dismissed");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 72,
        left: 0,
        right: 0,
        zIndex: 9000,
        padding: "0 16px 8px",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "rgba(10,0,20,0.96)",
          border: "1px solid rgba(45,10,78,0.8)",
          borderRadius: 16,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          pointerEvents: "auto",
        }}
      >
        {/* Cookie icon */}
        <div style={{ flexShrink: 0 }}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
            <path d="M8.5 8.5v.01" />
            <path d="M16 15.5v.01" />
            <path d="M12 12v.01" />
          </svg>
        </div>

        {/* Text */}
        <p
          style={{
            flex: 1,
            margin: 0,
            fontSize: 12,
            color: "rgba(255,255,255,0.6)",
            lineHeight: 1.5,
            fontFamily: "Inter, sans-serif",
          }}
        >
          We use cookies to improve your experience.{" "}
          <Link
            href="/privacy"
            style={{
              color: "#00F0FF",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Privacy Policy
          </Link>
        </p>

        {/* Accept button */}
        <button
          type="button"
          onClick={handleAccept}
          style={{
            flexShrink: 0,
            padding: "7px 14px",
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, #39FF14, #00F0FF)",
            color: "#0A0A0A",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "Montserrat, Inter, sans-serif",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Accept
        </button>

        {/* Dismiss X */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss cookie banner"
          style={{
            flexShrink: 0,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            color: "rgba(255,255,255,0.3)",
            lineHeight: 0,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// apps/web/components/UpgradeButton.tsx
"use client";

import { useState } from "react";

interface Props {
  priceId: string;
  label: string;
  mode: "user" | "brand";
  brandId?: string;
  currentPath: string;
}

export default function UpgradeButton({
  priceId,
  label,
  mode,
  brandId,
  currentPath,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_id: priceId,
          mode,
          brand_id: brandId,
          success_url: `${window.location.origin}/settings/profile?upgraded=true`,
          cancel_url: `${window.location.origin}${currentPath}`,
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned:", data);
        setLoading(false);
      }
    } catch (err) {
      console.error("Upgrade error:", err);
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      style={{
        background: loading
          ? "rgba(57,255,20,0.4)"
          : "linear-gradient(135deg, #39FF14, #00F0FF)",
        color: "#0A0A0A",
        opacity: loading ? 0.7 : 1,
        cursor: loading ? "not-allowed" : "pointer",
        padding: "10px 20px",
        borderRadius: "9999px",
        fontSize: "14px",
        fontWeight: 700,
        fontFamily: "Montserrat, sans-serif",
        border: "none",
        transition: "opacity 0.15s ease",
        display: "inline-block",
        whiteSpace: "nowrap" as const,
      }}
    >
      {loading ? "Redirecting..." : label}
    </button>
  );
}

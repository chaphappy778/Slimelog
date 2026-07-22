// apps/web/components/admin/BrandOwnershipTable.tsx
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import BrandOwnershipActions from "./BrandOwnershipActions";

export interface BrandOwnershipRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  owner_id: string | null;
  owner_username: string | null;
  verification_tier: string | null;
}

interface Props {
  brands: BrandOwnershipRow[];
  currentAdminId: string;
}

// Tier pill colors: green for verified/partner, cyan for claimed, muted for
// community (and anything unrecognized).
function tierColor(tier: string | null): string {
  switch (tier) {
    case "verified":
    case "partner":
      return "#39FF14";
    case "claimed":
      return "#00F0FF";
    case "community":
    default:
      return "#888888";
  }
}

function TierPill({ tier }: { tier: string | null }) {
  const color = tierColor(tier);
  const label = tier ?? "community";
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{
        background: `${color}1F`,
        border: `1px solid ${color}66`,
        color,
        fontFamily: "Montserrat, sans-serif",
      }}
    >
      {label}
    </span>
  );
}

function BrandLogo({
  logoUrl,
  name,
}: {
  logoUrl: string | null;
  name: string;
}) {
  if (logoUrl) {
    return (
      <div
        className="relative rounded-full overflow-hidden shrink-0"
        style={{ width: 16, height: 16, background: "rgba(45,10,78,0.6)" }}
      >
        <Image src={logoUrl} alt="" fill sizes="16px" className="object-cover" />
      </div>
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0"
      style={{
        width: 16,
        height: 16,
        background: "linear-gradient(135deg, #39FF14, #00F0FF)",
        color: "#0A0A0A",
        fontSize: 9,
        fontWeight: 900,
        fontFamily: "Montserrat, sans-serif",
        lineHeight: 1,
        userSelect: "none",
      }}
      aria-hidden="true"
    >
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}

export default function BrandOwnershipTable({ brands, currentAdminId }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q),
    );
  }, [brands, query]);

  return (
    <>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or slug"
          className="w-full rounded-xl px-4 py-3 text-sm text-slime-text"
          style={{
            background: "rgba(10,0,20,0.55)",
            border: "1px solid rgba(255,255,255,0.12)",
            outline: "none",
          }}
        />
        <p className="text-[11px] text-slime-muted mt-2">
          Showing {filtered.length} of {brands.length} brands.
        </p>
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-2xl text-center text-sm text-slime-muted"
          style={{
            padding: 48,
            background: "rgba(45,10,78,0.3)",
            border: "1px solid rgba(45,10,78,0.7)",
          }}
        >
          No brands match &quot;{query}&quot;.
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(45,10,78,0.9)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#1a0a2e" }}>
                  {["Brand", "Slug", "Owner", "Tier", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap"
                      style={{ color: "#00F0FF" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => {
                  const isEven = i % 2 === 0;
                  return (
                    <tr
                      key={b.id}
                      style={{
                        background: isEven ? "#0f0f0f" : "rgba(26,10,46,0.30)",
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <BrandLogo logoUrl={b.logo_url} name={b.name} />
                          <span className="text-slime-text font-medium truncate">
                            {b.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] text-slime-muted">
                          /{b.slug}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {b.owner_id === null ? (
                          <span className="text-xs" style={{ color: "#888888" }}>
                            Unclaimed
                          </span>
                        ) : (
                          <span
                            className="text-xs font-semibold"
                            style={{ color: "#FF00E5" }}
                          >
                            @{b.owner_username ?? "unknown"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <TierPill tier={b.verification_tier} />
                      </td>
                      <td className="px-4 py-3">
                        <BrandOwnershipActions
                          brandId={b.id}
                          ownerId={b.owner_id}
                          currentAdminId={currentAdminId}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

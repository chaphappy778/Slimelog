// apps/web/components/BrandCard.tsx

import Link from "next/link";

interface BrandCardProps {
  name: string;
  slug: string;
  location: string | null;
  verificationTier: string | null;
  restockSchedule: string | null;
  totalLogs: number;
  avgShipping: number | null;
  logoUrl?: string | null;
  ownerName?: string | null;
}

function StarRating({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= full) stars.push("full");
    else if (i === full + 1 && half) stars.push("half");
    else stars.push("empty");
  }
  return (
    <span
      className="flex items-center gap-0.5"
      aria-label={`${value.toFixed(1)} out of 5 stars`}
    >
      {stars.map((type, i) => (
        <svg key={i} viewBox="0 0 12 12" className="w-3 h-3 shrink-0">
          {type === "full" && (
            <polygon
              points="6,1 7.5,4.5 11,4.5 8.5,7 9.5,11 6,9 2.5,11 3.5,7 1,4.5 4.5,4.5"
              className="fill-amber-400 stroke-amber-400"
              strokeWidth="0.5"
            />
          )}
          {type === "half" && (
            <>
              <defs>
                <linearGradient id={`half-${i}`} x1="0" x2="1" y1="0" y2="0">
                  <stop offset="50%" stopColor="#fbbf24" />
                  <stop offset="50%" stopColor="#e5e7eb" />
                </linearGradient>
              </defs>
              <polygon
                points="6,1 7.5,4.5 11,4.5 8.5,7 9.5,11 6,9 2.5,11 3.5,7 1,4.5 4.5,4.5"
                fill={`url(#half-${i})`}
                stroke="#fbbf24"
                strokeWidth="0.5"
              />
            </>
          )}
          {type === "empty" && (
            <polygon
              points="6,1 7.5,4.5 11,4.5 8.5,7 9.5,11 6,9 2.5,11 3.5,7 1,4.5 4.5,4.5"
              className="fill-gray-200 stroke-gray-300"
              strokeWidth="0.5"
            />
          )}
        </svg>
      ))}
      <span className="ml-1 text-xs font-semibold text-amber-600">
        {value.toFixed(1)}
      </span>
    </span>
  );
}

function VerificationBadge({ tier }: { tier: string }) {
  const isVerified = tier === "verified";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide uppercase ${
        isVerified
          ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-sm"
          : "bg-gray-100 text-gray-500"
      }`}
    >
      {isVerified && (
        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 fill-white">
          <path d="M6 1L7.3 4H11L8.3 6.2l.9 3.3L6 7.8 2.8 9.5l.9-3.3L1 4h3.7z" />
        </svg>
      )}
      {isVerified ? "Verified" : tier}
    </span>
  );
}

export function BrandCard({
  name,
  slug,
  location,
  verificationTier,
  restockSchedule,
  totalLogs,
  avgShipping,
  logoUrl,
  ownerName,
}: BrandCardProps) {
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <Link href={`/brands/${slug}`} className="block group">
      <div className="relative bg-white rounded-2xl border border-pink-100 shadow-sm hover:shadow-md hover:border-pink-200 transition-all duration-200 overflow-hidden p-4 active:scale-[0.98]">
        {/* Subtle gradient top accent */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-pink-400 via-fuchsia-400 to-violet-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        <div className="flex items-start gap-3">
          {/* Logo / Avatar */}
          <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-pink-100 to-violet-100 flex items-center justify-center border border-pink-100">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-base font-black bg-gradient-to-br from-pink-500 to-violet-500 bg-clip-text text-transparent select-none">
                {initials}
              </span>
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-gray-900 group-hover:text-fuchsia-700 transition-colors truncate">
                {name}
              </h3>
              {verificationTier && (
                <VerificationBadge tier={verificationTier} />
              )}
            </div>

            {ownerName && (
              <p className="text-[11px] text-gray-400 mt-0.5">by {ownerName}</p>
            )}

            {location && (
              <p className="flex items-center gap-1 text-[11px] text-gray-500 mt-1">
                <svg
                  viewBox="0 0 12 12"
                  className="w-3 h-3 fill-pink-400 shrink-0"
                >
                  <path d="M6 1a3.5 3.5 0 0 0-3.5 3.5C2.5 7.5 6 11 6 11s3.5-3.5 3.5-6.5A3.5 3.5 0 0 0 6 1zm0 4.75A1.25 1.25 0 1 1 6 3.25a1.25 1.25 0 0 1 0 2.5z" />
                </svg>
                {location}
              </p>
            )}
          </div>

          {/* Arrow */}
          <svg
            viewBox="0 0 16 16"
            className="w-4 h-4 fill-gray-300 group-hover:fill-fuchsia-400 transition-colors mt-1 shrink-0"
          >
            <path
              d="M6 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-gray-300 group-hover:stroke-fuchsia-400 transition-colors"
            />
          </svg>
        </div>

        {/* Stats row */}
        <div className="mt-3 pt-3 border-t border-pink-50 flex items-center justify-between flex-wrap gap-2">
          {/* Restock */}
          {restockSchedule ? (
            <span className="inline-flex items-center gap-1 text-[11px] bg-fuchsia-50 text-fuchsia-700 font-medium px-2 py-1 rounded-lg border border-fuchsia-100">
              <svg viewBox="0 0 12 12" className="w-3 h-3 fill-fuchsia-500">
                <path d="M6 1v2.5L8 2l.7.7-2.7 2.7-2.7-2.7L4 2l2 1.5V1h0zm0 10V8.5L4 10l-.7-.7 2.7-2.7 2.7 2.7L8 10l-2-1.5V11h0zm5-5h-2.5L10 8l-.7.7L6.6 6 9.3 3.3 10 4 8.5 5.5H11v1zm-10 0h2.5L2 4l.7-.7L5.4 6 2.7 8.7 2 8 3.5 6.5H1v-1z" />
              </svg>
              {restockSchedule}
            </span>
          ) : (
            <span className="text-[11px] text-gray-400 italic">
              No restock schedule
            </span>
          )}

          <div className="flex items-center gap-3">
            {/* Total logs */}
            <span className="flex items-center gap-1 text-[11px] text-gray-500">
              <svg viewBox="0 0 12 12" className="w-3 h-3 fill-pink-400">
                <path d="M2 2h8a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm1 2v1h6V4H3zm0 2v1h4V6H3z" />
              </svg>
              <span className="font-semibold text-gray-700">{totalLogs}</span>{" "}
              logs
            </span>

            {/* Avg shipping */}
            {avgShipping != null ? (
              <StarRating value={avgShipping} />
            ) : (
              <span className="text-[11px] text-gray-400">No ratings yet</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

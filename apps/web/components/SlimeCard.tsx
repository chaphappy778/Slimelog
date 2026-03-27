"use client";

import {
  Slime,
  CollectionLog,
  SLIME_TYPE_LABELS,
  SLIME_TYPE_COLORS,
} from "@/lib/types";
import { TypeBadge } from "./TypeBadge";
import { RatingDisplay } from "./RatingInput";

// ─── Card backed by a Slime row (discovery / leaderboard) ─────────────────────

interface SlimeCardProps {
  slime: Slime;
  rank?: number;
  onPress?: () => void;
  className?: string;
}

export function SlimeCard({
  slime,
  rank,
  onPress,
  className = "",
}: SlimeCardProps) {
  const primaryColor = slime.colors[0] ?? "#F9A8D4";

  return (
    <button
      type="button"
      onClick={onPress}
      className={`w-full text-left bg-white rounded-2xl overflow-hidden shadow-sm border border-pink-50 active:scale-[0.98] transition-transform ${className}`}
    >
      <div
        className="w-full h-44 flex items-center justify-center relative"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}55, ${slime.colors[1] ?? primaryColor}33)`,
        }}
      >
        {rank && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full w-7 h-7 flex items-center justify-center">
            <span className="text-xs font-black text-gray-700">#{rank}</span>
          </div>
        )}
        {slime.is_limited && (
          <div className="absolute top-3 right-3 bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            LIMITED
          </div>
        )}
        <div className="text-5xl select-none">🫧</div>
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-sm leading-tight truncate">
              {slime.name}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {slime.brand?.name}
            </p>
          </div>
          <TypeBadge type={slime.slime_type} size="sm" />
        </div>

        {slime.scent && (
          <p className="text-xs text-gray-500 mb-2">🌸 {slime.scent}</p>
        )}

        <div className="flex items-center justify-between">
          <RatingDisplay value={slime.avg_overall} size="sm" />
          <span className="text-xs text-gray-400">
            {slime.total_ratings.toLocaleString()} logs
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Card backed by a CollectionLog (feed / collection view) ─────────────────

interface LogCardProps {
  log: CollectionLog;
  showUser?: boolean;
  likeCount?: number;
  commentCount?: number;
  onLike?: () => void;
  onComment?: () => void;
  className?: string;
}

export function LogCard({
  log,
  showUser = true,
  likeCount = 0,
  commentCount = 0,
  onLike,
  onComment,
  className = "",
}: LogCardProps) {
  const slime = log.slime;
  const slimeName = slime?.name ?? log.slime_name ?? "Unknown Slime";
  const brandName =
    slime?.brand?.name ??
    log.brand?.name ??
    log.brand_name_raw ??
    "Unknown Brand";
  const primaryColor = slime?.colors?.[0] ?? "#F9A8D4";

  return (
    <article
      className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-pink-50 ${className}`}
    >
      {showUser && log.user && (
        <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-purple-700">
              {log.user.username.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 leading-none">
              @{log.user.username}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(log.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="ml-auto">
            {log.slime_type && <TypeBadge type={log.slime_type} size="sm" />}
          </div>
        </div>
      )}

      <div
        className="w-full h-48 flex items-center justify-center"
        style={{
          background: `linear-gradient(160deg, ${primaryColor}44, ${slime?.colors?.[1] ?? primaryColor}22)`,
        }}
      >
        <div className="text-center">
          <div className="text-6xl mb-1">🫧</div>
        </div>
      </div>

      <div className="px-4 pt-3 pb-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 leading-tight">
              {slimeName}
            </h3>
            <p className="text-xs text-gray-400">{brandName}</p>
          </div>
          {log.rating_overall && (
            <div className="flex items-center gap-1 bg-pink-50 rounded-xl px-2.5 py-1 shrink-0">
              <span className="text-pink-400 text-sm">⭐</span>
              <span className="text-sm font-black text-pink-600">
                {log.rating_overall}/5
              </span>
            </div>
          )}
        </div>

        {log.rating_overall && (
          <div className="flex gap-1 my-2">
            {[
              { label: "Texture", val: log.rating_texture },
              { label: "Scent", val: log.rating_scent },
              { label: "Sound", val: log.rating_sound },
              { label: "Drizzle", val: log.rating_drizzle },
            ].map(({ label, val }) =>
              val ? (
                <div key={label} className="flex-1 text-center">
                  <div className="text-[9px] text-gray-400 mb-0.5">{label}</div>
                  <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-400 to-purple-400 rounded-full"
                      style={{ width: `${(val / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ) : null,
            )}
          </div>
        )}

        {log.notes && (
          <p className="text-sm text-gray-600 mt-2 leading-relaxed line-clamp-3">
            {log.notes}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 px-3 py-2 border-t border-pink-50 mt-2">
        <button
          type="button"
          onClick={onLike}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-gray-500 hover:bg-pink-50 active:scale-95 transition-all min-h-[44px]"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
          <span className="text-xs font-semibold">
            {likeCount > 0 ? likeCount : ""}
          </span>
        </button>

        <button
          type="button"
          onClick={onComment}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-gray-500 hover:bg-purple-50 active:scale-95 transition-all min-h-[44px]"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
            />
          </svg>
          <span className="text-xs font-semibold">
            {commentCount > 0 ? commentCount : ""}
          </span>
        </button>

        <div className="ml-auto">
          <button
            type="button"
            className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
              />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}

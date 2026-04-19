// apps/web/components/profile/Avatar.tsx
"use client";

import { useState } from "react";

type Props = {
  avatarUrl: string | null;
  username: string;
  size?: number; // px, square
};

/**
 * Avatar — small client component for user avatars on public profile pages.
 *
 * Renders an <img> when avatarUrl is truthy and falls back to the gradient
 * initial block when either (a) avatarUrl is null, or (b) the image fails
 * to load (onError). This fixes the issue where a broken avatar URL left
 * only alt text visible on production.
 *
 * Extracted into a tiny client component because onError handlers require
 * client-side execution. The parent profile page stays a server component.
 */
export default function Avatar({ avatarUrl, username, size = 64 }: Props) {
  const [errored, setErrored] = useState(false);
  const initial = (username ?? "?").charAt(0).toUpperCase();

  const showImage = avatarUrl && !errored;

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`${username}'s avatar`}
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setErrored(true)}
        className="rounded-full object-cover shrink-0 ring-2 ring-slime-accent/30"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center text-slime-bg font-black shrink-0 ring-2 ring-slime-accent/30"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${Math.round(size * 0.4)}px`,
        background: "linear-gradient(135deg, #39FF14, #00F0FF)",
      }}
      aria-label={`${username}'s avatar`}
    >
      {initial}
    </div>
  );
}

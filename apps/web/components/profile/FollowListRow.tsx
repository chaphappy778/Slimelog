// apps/web/components/profile/FollowListRow.tsx
// [T37 2026-07-13] Row used on `/users/[username]/followers` and
// `/users/[username]/following`. Avatar + username + bio snippet +
// Follow / Unfollow button. Whole row is a Link to the profile
// except the button, which owns its own click.

"use client";

import Image from "next/image";
import Link from "next/link";
import FollowUserButton from "@/components/FollowUserButton";

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
}

interface FollowListRowProps {
  profile: Profile;
  viewerId: string | null;
  initialIsFollowing: boolean;
}

export default function FollowListRow({
  profile,
  viewerId,
  initialIsFollowing,
}: FollowListRowProps) {
  const initial = (profile.username[0] ?? "?").toUpperCase();
  const isSelf = viewerId === profile.id;

  return (
    <div
      className="rounded-2xl flex items-center gap-3"
      style={{
        padding: "12px 14px",
        background: "rgba(45,10,78,0.28)",
        border: "1px solid rgba(120,60,180,0.42)",
      }}
    >
      <Link
        href={`/users/${profile.username}`}
        className="flex items-center gap-3 flex-1 min-w-0"
        style={{ textDecoration: "none" }}
      >
        <div
          className="rounded-full overflow-hidden relative shrink-0"
          style={{
            width: 44,
            height: 44,
            border: profile.is_verified
              ? "2px solid #39FF14"
              : "1px solid rgba(0,240,255,0.28)",
          }}
        >
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt=""
              fill
              className="object-cover"
              sizes="44px"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center font-black"
              style={{
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                color: "#04140A",
                fontFamily: "Montserrat, sans-serif",
                fontSize: 16,
              }}
            >
              {initial}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="truncate"
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 800,
              fontSize: 15,
              color: "#FFFFFF",
              letterSpacing: "-0.01em",
              lineHeight: 1.15,
            }}
          >
            @{profile.username}
          </div>
          {profile.bio && (
            <div
              className="truncate mt-0.5"
              style={{
                fontSize: 12.5,
                color: "rgba(245,245,245,0.55)",
              }}
            >
              {profile.bio}
            </div>
          )}
        </div>
      </Link>

      {!isSelf && (
        <div className="shrink-0">
          <FollowUserButton
            targetUserId={profile.id}
            currentUserId={viewerId}
            initialIsFollowing={initialIsFollowing}
          />
        </div>
      )}
    </div>
  );
}

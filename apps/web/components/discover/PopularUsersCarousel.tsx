// apps/web/components/discover/PopularUsersCarousel.tsx
import Image from "next/image";
import Link from "next/link";

interface PopularUser {
  id: string;
  username: string;
  avatar_url: string | null;
  display_name: string | null;
  is_premium: boolean;
  follower_count: number;
}

interface PopularUsersCarouselProps {
  users: PopularUser[];
}

export default function PopularUsersCarousel({
  users,
}: PopularUsersCarouselProps) {
  return (
    <div
      className="flex gap-4 overflow-x-auto scrollbar-none px-4"
      style={
        {
          WebkitOverflowScrolling: "touch",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        } as React.CSSProperties
      }
    >
      {users.map((user) => {
        const initial = (user.username[0] ?? "?").toUpperCase();
        const displayLabel =
          user.username.length > 9 ? user.username.slice(0, 9) : user.username;

        return (
          <Link
            key={user.id}
            href={`/users/${user.username}`}
            className="flex flex-col items-center gap-2 shrink-0"
            style={{ width: 88 }}
            aria-label={`View profile: ${user.username}`}
          >
            <div
              className="rounded-full overflow-hidden relative"
              style={{
                width: 72,
                height: 72,
                boxShadow: user.is_premium
                  ? "0 0 0 2px #39FF14"
                  : "0 0 0 1px rgba(45,10,78,0.6)",
                flexShrink: 0,
              }}
            >
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={user.username}
                  fill
                  className="object-cover"
                  sizes="72px"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-xl font-black"
                  style={{
                    background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                    color: "#0A0A0A",
                  }}
                >
                  {initial}
                </div>
              )}
            </div>
            <span
              className="text-[11px] font-semibold truncate text-center w-full"
              style={{ color: "rgba(245,245,245,0.5)" }}
            >
              {displayLabel}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

// apps/web/app/users/[username]/following/page.tsx
// [T37 2026-07-13] List of profiles the given user follows. Mirror of
// the followers page — same data shape, opposite join direction.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/PageHeader";
import FollowListRow from "@/components/profile/FollowListRow";

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function FollowingPage({ params }: PageProps) {
  const { username } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } },
  );

  const { data: target } = await supabase
    .from("profiles_public")
    .select("id, username")
    .ilike("username", username)
    .maybeSingle();
  if (!target) notFound();

  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("follows")
    .select(
      "created_at, profile:profiles_public!follows_following_id_fkey(id, username, avatar_url, bio, is_verified)",
    )
    .eq("follower_id", target.id)
    .order("created_at", { ascending: false })
    .limit(200);

  // Supabase types embedded joins as arrays even when the FK is
  // 1:1, so normalize before mapping.
  interface FollowingProfile {
    id: string;
    username: string;
    avatar_url: string | null;
    bio: string | null;
    is_verified: boolean;
  }
  // KEEP: latent (T199 A3, needs next/typescript in flat config)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const following: FollowingProfile[] = ((rows ?? []) as any[])
    // KEEP: latent (T199 A3, needs next/typescript in flat config)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any): FollowingProfile | null => {
      const p = Array.isArray(r.profile) ? r.profile[0] : r.profile;
      return p ?? null;
    })
    .filter((p): p is FollowingProfile => p !== null);

  let followingSet = new Set<string>();
  if (viewer && following.length > 0) {
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", viewer.id)
      .in(
        "following_id",
        following.map((f) => f.id),
      );
    followingSet = new Set((follows ?? []).map((r) => r.following_id));
  }

  return (
    <PageWrapper dots glow="cyan" orbs>
      <PageHeader />
      <main className="pt-14 pb-24 max-w-[440px] mx-auto px-4">
        <div className="pt-3 mb-4">
          {/* [T37 fix 2026-07-13] Route back to /profile when the
              viewer is looking at their own following list. */}
          <Link
            href={
              viewer && viewer.id === target.id
                ? "/profile"
                : `/users/${target.username}`
            }
            className="inline-flex items-center gap-2 text-[15px]"
            style={{ color: "rgba(245,245,245,0.55)" }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            {viewer && viewer.id === target.id
              ? "Back to profile"
              : `Back to @${target.username}`}
          </Link>
        </div>

        <h1
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: 30,
            letterSpacing: "-0.02em",
            color: "#FFFFFF",
            margin: 0,
          }}
        >
          Following
        </h1>
        <p
          className="mt-1"
          style={{ fontSize: 14, color: "rgba(245,245,245,0.55)" }}
        >
          <span style={{ color: "#FF00E5", fontWeight: 600 }}>
            @{target.username}
          </span>{" "}
          follows {following.length}{" "}
          {following.length === 1 ? "collector" : "collectors"}
        </p>

        <div className="mt-5 flex flex-col gap-2">
          {following.length === 0 ? (
            <div
              className="rounded-2xl text-center py-8"
              style={{
                background: "rgba(45,10,78,0.2)",
                border: "1px dashed rgba(120,60,180,0.5)",
                color: "rgba(245,245,245,0.6)",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              Not following anyone yet.
            </div>
          ) : (
            following.map((p) => (
              <FollowListRow
                key={p.id}
                profile={p}
                viewerId={viewer?.id ?? null}
                initialIsFollowing={followingSet.has(p.id)}
              />
            ))
          )}
        </div>
      </main>
    </PageWrapper>
  );
}

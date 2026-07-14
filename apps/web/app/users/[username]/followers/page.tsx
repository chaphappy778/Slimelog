// apps/web/app/users/[username]/followers/page.tsx
// [T37 2026-07-13] List of profiles who follow the given user. Reads
// from `public.follows` (publicly readable via RLS) joined to
// `profiles_public` (also publicly readable). Renders each row with
// an avatar + username + display name + a Follow button when the
// viewer is logged in and looking at someone other than themselves.

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

export default async function FollowersPage({ params }: PageProps) {
  const { username } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } },
  );

  // Resolve target profile
  const { data: target } = await supabase
    .from("profiles_public")
    .select("id, username")
    .ilike("username", username)
    .maybeSingle();
  if (!target) notFound();

  // Viewer (may be null when logged out)
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  // Follower rows joined to profiles_public. Newest first.
  const { data: rows } = await supabase
    .from("follows")
    .select(
      "created_at, profile:profiles_public!follows_follower_id_fkey(id, username, avatar_url, bio, is_verified)",
    )
    .eq("following_id", target.id)
    .order("created_at", { ascending: false })
    .limit(200);

  // Supabase types embedded joins as arrays even when the FK is
  // 1:1, so normalize before mapping.
  interface FollowerProfile {
    id: string;
    username: string;
    avatar_url: string | null;
    bio: string | null;
    is_verified: boolean;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const followers: FollowerProfile[] = ((rows ?? []) as any[])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any): FollowerProfile | null => {
      const p = Array.isArray(r.profile) ? r.profile[0] : r.profile;
      return p ?? null;
    })
    .filter((p): p is FollowerProfile => p !== null);

  // For each follower, check whether the viewer follows them (so the
  // Follow button starts in the correct state). One batch query.
  let followingSet = new Set<string>();
  if (viewer && followers.length > 0) {
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", viewer.id)
      .in(
        "following_id",
        followers.map((f) => f.id),
      );
    followingSet = new Set((follows ?? []).map((r) => r.following_id));
  }

  return (
    <PageWrapper dots glow="cyan" orbs>
      <PageHeader />
      <main className="pt-14 pb-24 max-w-[440px] mx-auto px-4">
        <div className="pt-3 mb-4">
          {/* [T37 fix 2026-07-13] When the viewer IS the target (looking
              at their own followers), route back to `/profile` (the
              user's own dashboard, where the Social tile lives). Only
              when looking at someone ELSE's followers do we route to
              the public `/users/<username>` page. */}
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
          Followers
        </h1>
        <p
          className="mt-1"
          style={{ fontSize: 14, color: "rgba(245,245,245,0.55)" }}
        >
          {followers.length} follower{followers.length === 1 ? "" : "s"} of{" "}
          <span style={{ color: "#FF00E5", fontWeight: 600 }}>
            @{target.username}
          </span>
        </p>

        <div className="mt-5 flex flex-col gap-2">
          {followers.length === 0 ? (
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
              No followers yet.
            </div>
          ) : (
            followers.map((p) => (
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

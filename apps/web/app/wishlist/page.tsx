import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
import BottomNavWrapper from "@/components/BottomNavWrapper";
import RemoveFromWishlistButton from "@/components/RemoveFromWishlistButton";
import { SLIME_TYPE_LABELS } from "@/lib/types";
import type { SlimeType } from "@/lib/types";

type WishlistLog = {
  id: string;
  created_at: string;
  slime_name: string | null;
  brand_name_raw: string | null;
  slime_type: string | null;
  colors: string[] | null;
  scent: string | null;
  cost_paid: number | null;
  image_url: string | null;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function WishlistCard({ log }: { log: WishlistLog }) {
  const typeLabel =
    log.slime_type && SLIME_TYPE_LABELS[log.slime_type as SlimeType]
      ? SLIME_TYPE_LABELS[log.slime_type as SlimeType]
      : null;
  const primaryColor = log.colors?.[0] ?? null;
  const secondaryColor = log.colors?.[1] ?? null;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(45,10,78,0.25)",
        border: "1px solid rgba(204,68,255,0.20)",
        boxShadow: "inset 0 0 20px rgba(45,10,78,0.1)",
      }}
    >
      {log.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={log.image_url}
          alt={log.slime_name ?? "Slime photo"}
          className="w-full h-40 object-cover"
        />
      ) : (
        <div
          className="w-full h-32 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #2D0A4E, #1A1A1A)" }}
          aria-hidden="true"
        >
          {/* Slime blob placeholder icon */}
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#CC44FF" strokeWidth="1.5" />
            <circle cx="9" cy="9" r="2" stroke="#CC44FF" strokeWidth="1" />
            <circle cx="14" cy="8" r="1" stroke="#CC44FF" strokeWidth="1" />
          </svg>
        </div>
      )}

      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <h3 className="font-bold text-slime-text text-sm leading-snug truncate">
              {log.slime_name ?? "Unnamed slime"}
            </h3>
            {log.brand_name_raw && (
              <span className="text-xs text-slime-muted truncate">
                {log.brand_name_raw}
              </span>
            )}
          </div>
          {/* Wishlist badge */}
          <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">
            Wishlist
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {typeLabel && (
            <span className="bg-slime-purple text-slime-cyan text-xs font-bold px-2 py-0.5 rounded-full">
              {typeLabel}
            </span>
          )}
          {primaryColor && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slime-surface border border-slime-border text-slime-muted">
              {primaryColor}
            </span>
          )}
          {secondaryColor && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slime-surface border border-slime-border text-slime-muted">
              {secondaryColor}
            </span>
          )}
          {log.scent && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slime-surface border border-slime-border text-slime-muted">
              {log.scent}
            </span>
          )}
          {log.cost_paid != null && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slime-surface border border-slime-border text-slime-muted">
              ${Number(log.cost_paid).toFixed(2)}
            </span>
          )}
        </div>

        <p className="text-xs text-slime-muted/60">
          Added {formatDate(log.created_at)}
        </p>

        <RemoveFromWishlistButton logId={log.id} />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 gap-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #CC44FF, #7B2FBE)",
        }}
        aria-hidden="true"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#0A0A0A" strokeWidth="1.5" />
          <circle cx="9" cy="9" r="2" stroke="#0A0A0A" strokeWidth="1" />
          <circle cx="14" cy="8" r="1" stroke="#0A0A0A" strokeWidth="1" />
        </svg>
      </div>
      <div>
        <p className="font-bold text-slime-text">Your wishlist is empty</p>
        <p className="text-sm text-slime-muted mt-1">
          Add slimes from the feed or discovery page
        </p>
      </div>
      <Link
        href="/"
        className="mt-2 px-6 py-2.5 rounded-xl text-slime-bg text-sm font-bold transition active:scale-95"
        style={{ background: "linear-gradient(135deg, #CC44FF, #7B2FBE)" }}
      >
        Explore slimes
      </Link>
    </div>
  );
}

export default async function WishlistPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: logs, error } = await supabase
    .from("collection_logs")
    .select(
      "id, created_at, slime_name, brand_name_raw, slime_type, colors, scent, cost_paid, image_url",
    )
    .eq("user_id", user.id)
    .eq("in_wishlist", true)
    .order("created_at", { ascending: false });

  const wishlistLogs: WishlistLog[] = logs ?? [];

  return (
    <PageWrapper dots glow="cyan">
      <PageHeader />

      <div className="pt-14 px-4 py-8 pb-24">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1
                className="text-2xl font-extrabold tracking-tight"
                style={{
                  background: "linear-gradient(90deg, #CC44FF, #00F0FF)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                My Wishlist
              </h1>
              <p className="text-sm text-slime-muted mt-0.5">
                Slimes you want to try
              </p>
            </div>
            {wishlistLogs.length > 0 && (
              <span
                className="text-xs font-bold px-3 py-1.5 rounded-lg"
                style={{
                  background: "rgba(204,68,255,0.10)",
                  border: "1px solid rgba(204,68,255,0.25)",
                  color: "#CC44FF",
                }}
              >
                {wishlistLogs.length} slime
                {wishlistLogs.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Error state */}
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400 mb-6">
              Could not load your wishlist — try refreshing.
            </div>
          )}

          {/* Empty state */}
          {!error && wishlistLogs.length === 0 && <EmptyState />}

          {/* Card grid */}
          {wishlistLogs.length > 0 && (
            <div className="flex flex-col gap-4">
              {wishlistLogs.map((log) => (
                <WishlistCard key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNavWrapper />
    </PageWrapper>
  );
}

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type DropDetail = {
  id: string;
  name: string | null;
  description: string | null;
  drop_at: string | null;
  status: string | null;
  shop_url: string | null;
  cover_image_url: string | null;
  brand_id: string | null;
  brand_name: string | null;
  brand_slug: string | null;
  logo_url: string | null;
  follower_count: number | null;
};

type DropSlime = {
  drop_id: string;
  slime_id: string | null;
  slimes: {
    id: string;
    name: string | null;
    slime_type: string | null;
    description: string | null;
    scent: string | null;
    retail_price: number | null;
    colors: string[] | null;
    image_url: string | null;
  } | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DROP_STATUS = {
  announced: {
    label: "Announced",
    bg: "bg-violet-900/40",
    text: "text-violet-300",
    dot: "bg-violet-400",
  },
  live: {
    label: "Live Now",
    bg: "bg-emerald-900/40",
    text: "text-emerald-300",
    dot: "bg-emerald-400",
  },
  sold_out: {
    label: "Sold Out",
    bg: "bg-slime-surface",
    text: "text-slime-muted",
    dot: "bg-slime-muted",
  },
  restocked: {
    label: "Restocked",
    bg: "bg-sky-900/40",
    text: "text-sky-300",
    dot: "bg-sky-400",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-red-900/40",
    text: "text-red-400",
    dot: "bg-red-400",
  },
} as const;

const SLIME_TYPE_LABELS: Record<string, string> = {
  butter: "Butter",
  clear: "Clear",
  cloud: "Cloud",
  icee: "Icee",
  fluffy: "Fluffy",
  floam: "Floam",
  snow_fizz: "Snow Fizz",
  thick_and_glossy: "Thick & Glossy",
  jelly: "Jelly",
  beaded: "Beaded",
  clay: "Clay",
  cloud_cream: "Cloud Cream",
  magnetic: "Magnetic",
  thermochromic: "Thermochromic",
  avalanche: "Avalanche",
  slay: "Slay",
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  butter: { bg: "bg-yellow-900/40", text: "text-yellow-300" },
  clear: { bg: "bg-sky-900/40", text: "text-sky-300" },
  cloud: { bg: "bg-blue-900/40", text: "text-blue-300" },
  cloud_cream: { bg: "bg-purple-900/40", text: "text-purple-300" },
  fluffy: { bg: "bg-pink-900/40", text: "text-pink-300" },
  floam: { bg: "bg-lime-900/40", text: "text-lime-300" },
  jelly: { bg: "bg-violet-900/40", text: "text-violet-300" },
  thick_and_glossy: { bg: "bg-slime-surface", text: "text-slime-muted" },
  icee: { bg: "bg-cyan-900/40", text: "text-cyan-300" },
  beaded: { bg: "bg-orange-900/40", text: "text-orange-300" },
  clay: { bg: "bg-amber-900/40", text: "text-amber-300" },
  magnetic: { bg: "bg-zinc-800", text: "text-zinc-300" },
  thermochromic: { bg: "bg-rose-900/40", text: "text-rose-300" },
  snow_fizz: { bg: "bg-indigo-900/40", text: "text-indigo-300" },
  avalanche: { bg: "bg-teal-900/40", text: "text-teal-300" },
  slay: { bg: "bg-fuchsia-900/40", text: "text-fuchsia-300" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type StatusConfig = { label: string; bg: string; text: string; dot: string };

function getStatusConfig(status: string | null): StatusConfig {
  if (status && status in DROP_STATUS)
    return DROP_STATUS[status as keyof typeof DROP_STATUS];
  return {
    label: status ?? "Unknown",
    bg: "bg-slime-surface",
    text: "text-slime-muted",
    dot: "bg-slime-muted",
  };
}

function formatDropDate(dateStr: string | null): string {
  if (!dateStr) return "Date TBA";
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil(
    (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  const formatted = d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  if (diffDays === 0) return `Today · ${formatted}`;
  if (diffDays === 1) return `Tomorrow · ${formatted}`;
  if (diffDays > 1 && diffDays <= 7)
    return `In ${diffDays} days · ${formatted}`;
  return formatted;
}

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

function buildLogUrl(
  slime: DropSlime,
  dropName: string | null,
  brandName: string | null,
): string {
  const s = slime.slimes;
  const params = new URLSearchParams();
  if (s?.name) params.set("slime_name", s.name);
  if (brandName) params.set("brand", brandName);
  if (dropName) params.set("collection", dropName);
  if (s?.slime_type) params.set("type", s.slime_type);
  return `/log?${params.toString()}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null }) {
  const cfg = getStatusConfig(status);
  const isLive = status === "live";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${cfg.bg} ${cfg.text}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${isLive ? "animate-pulse" : ""}`}
      />
      {cfg.label}
    </span>
  );
}

function SlimeTypeBadge({ slimeType }: { slimeType: string | null }) {
  if (!slimeType) return null;
  const label = SLIME_TYPE_LABELS[slimeType] ?? slimeType;
  const colors = TYPE_COLORS[slimeType] ?? {
    bg: "bg-slime-surface",
    text: "text-slime-muted",
  };
  return (
    <span
      className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}
    >
      {label}
    </span>
  );
}

function SlimeCard({
  slime,
  dropName,
  brandName,
}: {
  slime: DropSlime;
  dropName: string | null;
  brandName: string | null;
}) {
  const s = slime.slimes;
  const logUrl = buildLogUrl(slime, dropName, brandName);

  return (
    <article className="bg-slime-card rounded-2xl border border-slime-border overflow-hidden hover:border-slime-accent/30 transition-colors">
      {s?.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={s.image_url}
          alt={s?.name ?? "Slime"}
          className="w-full h-40 object-cover"
        />
      ) : (
        <div
          className="w-full h-32 flex items-center justify-center text-4xl bg-slime-surface"
          aria-hidden="true"
        >
          🫧
        </div>
      )}

      <div className="p-4">
        <div className="mb-2">
          <SlimeTypeBadge slimeType={s?.slime_type ?? null} />
        </div>

        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="text-sm font-bold text-slime-text leading-snug">
            {s?.name ?? "Unnamed Slime"}
          </h3>
          {s?.retail_price != null && (
            <span className="text-sm font-bold text-slime-accent shrink-0">
              {formatPrice(s.retail_price)}
            </span>
          )}
        </div>

        {s?.description && (
          <p className="text-xs text-slime-muted leading-relaxed mb-3 line-clamp-2">
            {s.description}
          </p>
        )}

        <Link
          href={logUrl}
          className="flex items-center justify-center gap-1.5 w-full text-xs font-bold py-2 rounded-xl transition-opacity active:opacity-70 text-slime-bg"
          style={{ background: "linear-gradient(90deg, #39FF14, #00F0FF)" }}
        >
          <span aria-hidden="true">＋</span>
          Log this slime
        </Link>
      </div>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DropDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } },
  );

  const [dropResult, slimesResult] = await Promise.all([
    supabase
      .from("upcoming_drops")
      .select(
        "id, name, description, drop_at, status, shop_url, cover_image_url, brand_id, brand_name, brand_slug, logo_url, follower_count",
      )
      .eq("id", id)
      .single(),

    supabase
      .from("drop_slimes")
      .select(
        "drop_id, slime_id, slimes!drop_slimes_slime_id_fkey (id, name, slime_type, description, scent, retail_price, colors, image_url)",
      )
      .eq("drop_id", id),
  ]);

  if (dropResult.error || !dropResult.data) {
    const { data: rawDrop, error: rawError } = await supabase
      .from("drops")
      .select(
        "id, name, description, drop_at, status, shop_url, cover_image_url, brand_id",
      )
      .eq("id", id)
      .single();

    if (rawError || !rawDrop) notFound();

    const { data: brand } = await supabase
      .from("brands")
      .select("id, slug, name:owner_name, brand_name:slug")
      .eq("id", rawDrop.brand_id)
      .single();

    const fallbackDrop: DropDetail = {
      ...rawDrop,
      brand_name: brand
        ? ((brand as unknown as { name: string }).name ?? rawDrop.brand_id)
        : rawDrop.brand_id,
      brand_slug: brand ? (brand as unknown as { slug: string }).slug : null,
      logo_url: null,
      follower_count: null,
    };

    return (
      <DropView
        drop={fallbackDrop}
        slimes={(slimesResult.data ?? []) as unknown as DropSlime[]}
      />
    );
  }

  return (
    <DropView
      drop={dropResult.data}
      slimes={(slimesResult.data ?? []) as unknown as DropSlime[]}
    />
  );
}

// ─── View ─────────────────────────────────────────────────────────────────────

function DropView({ drop, slimes }: { drop: DropDetail; slimes: DropSlime[] }) {
  const isLive = drop.status === "live";

  return (
    <main className="min-h-screen pb-28 bg-slime-bg">
      {drop.cover_image_url ? (
        <div className="relative w-full h-52 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={drop.cover_image_url}
            alt={drop.name ?? "Drop cover"}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slime-bg/80 to-transparent" />
        </div>
      ) : (
        <div
          className="w-full h-44 flex items-center justify-center text-6xl relative overflow-hidden bg-slime-surface"
          aria-hidden="true"
        >
          <span className="drop-shadow-lg">{isLive ? "🔴" : "🫧"}</span>
          <div
            className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, #39FF14, transparent)",
            }}
          />
          <div
            className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full opacity-15"
            style={{
              background: "radial-gradient(circle, #00F0FF, transparent)",
            }}
          />
        </div>
      )}

      <div className="px-4 pt-4 pb-1">
        <Link
          href="/discover"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slime-muted hover:text-slime-accent transition-colors"
        >
          <span aria-hidden="true">←</span>
          Discover
        </Link>
      </div>

      <header className="px-4 pt-2 pb-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <StatusBadge status={drop.status} />
          {drop.brand_slug ? (
            <Link
              href={`/brands/${drop.brand_slug}`}
              className="text-xs font-semibold text-slime-accent hover:text-slime-cyan transition-colors"
            >
              {drop.brand_name ?? "Unknown Brand"}
            </Link>
          ) : (
            <span className="text-xs text-slime-muted">
              {drop.brand_name ?? "Unknown Brand"}
            </span>
          )}
        </div>

        <h1 className="text-3xl font-black tracking-tight mb-2 leading-tight text-holo">
          {drop.name ?? "Unnamed Drop"}
        </h1>

        {drop.description && (
          <p className="text-sm text-slime-muted leading-relaxed mb-3">
            {drop.description}
          </p>
        )}

        <p className="text-xs text-slime-muted font-medium mb-4">
          <span aria-hidden="true">🗓 </span>
          {formatDropDate(drop.drop_at)}
        </p>

        {drop.shop_url && drop.status !== "cancelled" && (
          <a
            href={drop.shop_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-bold text-slime-bg shadow-glow-green transition-opacity active:opacity-80"
            style={{ background: "linear-gradient(90deg, #39FF14, #00F0FF)" }}
          >
            {isLive ? "🛒 Shop Now" : "🔔 Visit Shop"}
            <span aria-hidden="true" className="opacity-70 text-xs">
              ↗
            </span>
          </a>
        )}

        {drop.status === "sold_out" && (
          <div className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold text-slime-muted bg-slime-surface border border-slime-border">
            Sold Out
          </div>
        )}
      </header>

      <div className="mx-4 mb-5 h-px bg-gradient-to-r from-transparent via-slime-border to-transparent" />

      <section className="px-4">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center text-lg shrink-0 bg-slime-surface border border-slime-border"
            aria-hidden="true"
          >
            🫧
          </div>
          <div>
            <h2 className="text-base font-bold text-slime-text leading-tight">
              Slimes in This Drop
            </h2>
            <p className="text-xs text-slime-muted">
              {slimes.length} {slimes.length === 1 ? "slime" : "slimes"}{" "}
              included
            </p>
          </div>
        </div>

        {slimes.length === 0 ? (
          <div className="text-center py-10 text-slime-muted text-sm">
            Slime details coming soon — check back closer to the drop!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {slimes.map((slime) => (
              <div key={`${slime.drop_id}-${slime.slime_id}`}>
                <SlimeCard
                  slime={slime}
                  dropName={drop.name}
                  brandName={drop.brand_name}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {slimes.length > 0 && (
        <div className="px-4 mt-8">
          <div className="rounded-2xl p-4 text-center bg-slime-surface border border-slime-border">
            <p className="text-sm font-semibold text-slime-text mb-1">
              Already tried {slimes.length > 1 ? "these slimes" : "this slime"}?
            </p>
            <p className="text-xs text-slime-muted">
              Tap "Log this slime" on any slime above to add it to your
              collection.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

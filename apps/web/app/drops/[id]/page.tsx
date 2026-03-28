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
  slimes:
    | {
        id: string;
        name: string | null;
        slime_type: string | null;
        description: string | null;
        scent: string | null;
        retail_price: number | null;
        colors: string[] | null;
        image_url: string | null;
      }[]
    | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DROP_STATUS = {
  announced: {
    label: "Announced",
    bg: "bg-violet-100",
    text: "text-violet-700",
    dot: "bg-violet-400",
  },
  live: {
    label: "Live Now",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    dot: "bg-emerald-400",
  },
  sold_out: {
    label: "Sold Out",
    bg: "bg-gray-100",
    text: "text-gray-500",
    dot: "bg-gray-400",
  },
  restocked: {
    label: "Restocked",
    bg: "bg-sky-100",
    text: "text-sky-700",
    dot: "bg-sky-400",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-red-50",
    text: "text-red-400",
    dot: "bg-red-300",
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
  butter: { bg: "bg-yellow-100", text: "text-yellow-700" },
  clear: { bg: "bg-sky-100", text: "text-sky-700" },
  cloud: { bg: "bg-blue-50", text: "text-blue-500" },
  cloud_cream: { bg: "bg-purple-50", text: "text-purple-500" },
  fluffy: { bg: "bg-pink-100", text: "text-pink-600" },
  floam: { bg: "bg-lime-100", text: "text-lime-700" },
  jelly: { bg: "bg-violet-100", text: "text-violet-600" },
  thick_and_glossy: { bg: "bg-gray-100", text: "text-gray-600" },
  icee: { bg: "bg-cyan-100", text: "text-cyan-700" },
  beaded: { bg: "bg-orange-100", text: "text-orange-600" },
  clay: { bg: "bg-amber-100", text: "text-amber-700" },
  magnetic: { bg: "bg-slate-100", text: "text-slate-600" },
  thermochromic: { bg: "bg-rose-100", text: "text-rose-600" },
  snow_fizz: { bg: "bg-indigo-50", text: "text-indigo-500" },
  avalanche: { bg: "bg-teal-100", text: "text-teal-700" },
  slay: { bg: "bg-fuchsia-100", text: "text-fuchsia-600" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type StatusConfig = {
  label: string;
  bg: string;
  text: string;
  dot: string;
};

function getStatusConfig(status: string | null): StatusConfig {
  if (status && status in DROP_STATUS) {
    return DROP_STATUS[status as keyof typeof DROP_STATUS];
  }
  return {
    label: status ?? "Unknown",
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
  };
}

function formatDropDate(dateStr: string | null): string {
  if (!dateStr) return "Date TBA";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

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
  const s = slime.slimes?.[0];
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
    bg: "bg-gray-100",
    text: "text-gray-600",
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
  const s = slime.slimes?.[0];
  const logUrl = buildLogUrl(slime, dropName, brandName);

  return (
    <article className="bg-white rounded-2xl border border-pink-50 shadow-sm overflow-hidden">
      {s?.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={s.image_url}
          alt={s?.name ?? "Slime"}
          className="w-full h-40 object-cover"
        />
      ) : (
        <div
          className="w-full h-32 flex items-center justify-center text-4xl"
          style={{
            background:
              "linear-gradient(135deg, #fce7f3 0%, #f3e8ff 50%, #e0f2fe 100%)",
          }}
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
          <h3 className="text-sm font-bold text-gray-900 leading-snug">
            {s?.name ?? "Unnamed Slime"}
          </h3>
          {s?.retail_price != null && (
            <span className="text-sm font-bold text-pink-600 shrink-0">
              {formatPrice(s.retail_price)}
            </span>
          )}
        </div>

        {s?.description && (
          <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">
            {s.description}
          </p>
        )}

        <Link
          href={logUrl}
          className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold py-2 rounded-xl transition-opacity active:opacity-70"
          style={{
            background: "linear-gradient(90deg, #f9a8d4, #c084fc)",
            color: "white",
          }}
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
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    },
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
        "drop_id, slime_id, slimes!drop_slimes_slime_id_fkey (id,name, slime_type, description, scent, retail_price, colors,image_url)",
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

    const slimes: DropSlime[] = slimesResult.data ?? [];
    return <DropView drop={fallbackDrop} slimes={slimes} />;
  }

  const drop: DropDetail = dropResult.data;
  const slimes: DropSlime[] = slimesResult.data ?? [];

  return <DropView drop={drop} slimes={slimes} />;
}

// ─── View ─────────────────────────────────────────────────────────────────────

function DropView({ drop, slimes }: { drop: DropDetail; slimes: DropSlime[] }) {
  const isLive = drop.status === "live";

  return (
    <main
      className="min-h-screen pb-28"
      style={{
        background: "linear-gradient(160deg, #fdf2f8 0%, #faf5ff 100%)",
      }}
    >
      {drop.cover_image_url ? (
        <div className="relative w-full h-52 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={drop.cover_image_url}
            alt={drop.name ?? "Drop cover"}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      ) : (
        <div
          className="w-full h-44 flex items-center justify-center text-6xl relative overflow-hidden"
          style={{
            background: isLive
              ? "linear-gradient(135deg, #6ee7b7 0%, #3b82f6 50%, #8b5cf6 100%)"
              : "linear-gradient(135deg, #fce7f3 0%, #f3e8ff 50%, #dbeafe 100%)",
          }}
          aria-hidden="true"
        >
          <span className="drop-shadow-lg">{isLive ? "🔴" : "🫧"}</span>
          <div
            className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-30"
            style={{
              background: "radial-gradient(circle, #f472b6, transparent)",
            }}
          />
          <div
            className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, #a855f7, transparent)",
            }}
          />
        </div>
      )}

      <div className="px-4 pt-4 pb-1">
        <a
          href="/discover"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-pink-500 transition-colors"
        >
          <span aria-hidden="true">←</span>
          Discover
        </a>
      </div>

      <header className="px-4 pt-2 pb-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <StatusBadge status={drop.status} />
          {drop.brand_slug ? (
            <Link
              href={`/brands/${drop.brand_slug}`}
              className="text-xs font-semibold text-pink-500 hover:text-pink-700 transition-colors underline-offset-2 hover:underline"
            >
              {drop.brand_name ?? "Unknown Brand"}
            </Link>
          ) : (
            <span className="text-xs text-gray-400">
              {drop.brand_name ?? "Unknown Brand"}
            </span>
          )}
        </div>

        <h1
          className="text-3xl font-black tracking-tight mb-2 leading-tight"
          style={{
            background: isLive
              ? "linear-gradient(90deg, #10b981, #3b82f6)"
              : "linear-gradient(90deg, #ec4899, #a855f7)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {drop.name ?? "Unnamed Drop"}
        </h1>

        {drop.description && (
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            {drop.description}
          </p>
        )}

        <p className="text-xs text-gray-500 font-medium mb-4">
          <span aria-hidden="true">🗓 </span>
          {formatDropDate(drop.drop_at)}
        </p>

        {drop.shop_url && drop.status !== "cancelled" && (
          <a
            href={drop.shop_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-bold text-white shadow-sm transition-opacity active:opacity-80"
            style={{
              background: isLive
                ? "linear-gradient(90deg, #10b981, #3b82f6)"
                : "linear-gradient(90deg, #ec4899, #a855f7)",
            }}
          >
            {isLive ? "🛒 Shop Now" : "🔔 Visit Shop"}
            <span aria-hidden="true" className="text-white/70 text-xs">
              ↗
            </span>
          </a>
        )}

        {drop.status === "sold_out" && (
          <div className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold text-gray-400 bg-gray-100">
            Sold Out
          </div>
        )}
      </header>

      <div className="mx-4 mb-5 h-px bg-gradient-to-r from-transparent via-pink-200 to-transparent" />

      <section className="px-4">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center text-lg shrink-0"
            style={{ background: "linear-gradient(135deg, #fce7f3, #f3e8ff)" }}
            aria-hidden="true"
          >
            🫧
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 leading-tight">
              Slimes in This Drop
            </h2>
            <p className="text-xs text-gray-400">
              {slimes.length} {slimes.length === 1 ? "slime" : "slimes"}{" "}
              included
            </p>
          </div>
        </div>

        {slimes.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
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
          <div
            className="rounded-2xl p-4 text-center"
            style={{ background: "linear-gradient(135deg, #fce7f3, #f3e8ff)" }}
          >
            <p className="text-sm font-semibold text-gray-700 mb-1">
              Already tried {slimes.length > 1 ? "these slimes" : "this slime"}?
            </p>
            <p className="text-xs text-gray-500">
              Tap "Log this slime" on any slime above to add it to your
              collection.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

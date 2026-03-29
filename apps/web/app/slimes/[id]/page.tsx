// apps/web/app/slimes/[id]/page.tsx
// Next.js 16 — params is a Promise; cookies() must be awaited.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TypeBadge } from "@/components/TypeBadge";
import { DeleteLogButton } from "@/components/DeleteLogButton";

// ─── Types ────────────────────────────────────────────────────────────────────

type SlimeDetail = {
  id: string;
  created_at: string;
  slime_name: string | null;
  brand_id: string | null;
  brand_name_raw: string | null;
  collection_name: string | null;
  slime_type: string | null;
  colors: string[] | null;
  scent: string | null;
  image_url: string | null;
  // Purchase
  purchase_price: number | null;
  purchase_currency: string | null;
  cost_paid: number | null;
  purchased_from: string | null;
  purchased_at: string | null;
  // Notes
  likes: string | null;
  dislikes: string | null;
  notes: string | null;
  // Flags
  in_collection: boolean;
  in_wishlist: boolean;
  is_public: boolean;
  // Ratings
  rating_overall: number | null;
  rating_texture: number | null;
  rating_scent: number | null;
  rating_sound: number | null;
  rating_drizzle: number | null;
  rating_creativity: number | null;
  rating_sensory_fit: number | null;
  // Shipping
  order_date: string | null;
  ship_date: string | null;
  received_date: string | null;
  days_to_ship: number | null;
  days_to_receive: number | null;
  // Joined
  brands: { name: string; slug: string } | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  pink: "#f9a8d4",
  purple: "#c4b5fd",
  blue: "#93c5fd",
  green: "#86efac",
  yellow: "#fde68a",
  orange: "#fdba74",
  red: "#fca5a5",
  white: "#f3f4f6",
  black: "#1f2937",
  clear: "#e0f2fe",
  teal: "#5eead4",
  lavender: "#ddd6fe",
  mint: "#a7f3d0",
  peach: "#fecaca",
  gold: "#fcd34d",
  silver: "#d1d5db",
};

function colorDot(color: string) {
  const bg = COLOR_MAP[color.toLowerCase()] ?? "#e5e7eb";
  const isDark = color.toLowerCase() === "black";
  return (
    <span
      key={color}
      title={color}
      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-black/10"
      style={{ backgroundColor: bg, color: isDark ? "#f9fafb" : "#374151" }}
    >
      <span
        className="w-2 h-2 rounded-full inline-block border border-black/10"
        style={{ backgroundColor: bg }}
      />
      {color}
    </span>
  );
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function StarRating({
  rating,
  size = "lg",
}: {
  rating: number | null;
  size?: "sm" | "lg";
}) {
  if (!rating)
    return <span className="text-xs text-slime-muted">No rating</span>;
  const starSize = size === "lg" ? "text-2xl" : "text-base";
  return (
    <span
      className="flex items-center gap-0.5"
      aria-label={`${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`${starSize} leading-none ${n <= rating ? "text-pink-500" : "text-gray-200"}`}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function DotRating({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-slime-muted">—</span>;
  return (
    <span className="flex gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${i <= value ? "bg-pink-400" : "bg-gray-200"}`}
        />
      ))}
    </span>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-3xl border border-pink-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-pink-50 bg-gradient-to-r from-pink-50/60 to-purple-50/40">
        <h2 className="text-xs font-bold uppercase tracking-widest text-pink-400">
          {title}
        </h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-pink-50 last:border-0">
      <span className="text-xs text-slime-muted font-medium shrink-0">
        {label}
      </span>
      <span className="text-xs text-slime-text text-right">{value}</span>
    </div>
  );
}

function ShippingStat({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 p-3 gap-0.5">
      <span className="text-2xl font-black text-purple-500 leading-none">
        {value ?? "—"}
      </span>
      <span className="text-[10px] text-slime-muted font-medium text-center">
        {label}
      </span>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-pink-300">
        {label}
      </span>
      <p className="text-sm text-slime-text leading-relaxed">{value}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SlimeDetailPage({
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
      cookies: { get: (name) => cookieStore.get(name)?.value },
    },
  );

  const { data, error } = await supabase
    .from("collection_logs")
    .select(
      `
      id, created_at, slime_name, brand_id, brand_name_raw,
      collection_name, slime_type, colors, scent, image_url,
      purchase_price, purchase_currency, cost_paid,
      purchased_from, purchased_at,
      likes, dislikes, notes,
      in_collection, in_wishlist, is_public,
      rating_overall, rating_texture, rating_scent, rating_sound,
      rating_drizzle, rating_creativity, rating_sensory_fit,
      order_date, ship_date, received_date,
      days_to_ship, days_to_receive,
      brands ( name, slug )
    `,
    )
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  const log = data as unknown as SlimeDetail;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = !!user;

  const brandName = log.brands?.name ?? log.brand_name_raw ?? "Unknown brand";
  const brandHref = log.brands?.slug ? `/brands/${log.brands.slug}` : null;

  const displayPrice = log.purchase_price ?? log.cost_paid;
  const currency = log.purchase_currency ?? "USD";

  const SUB_RATINGS: { key: keyof SlimeDetail; label: string }[] = [
    { key: "rating_texture", label: "Texture" },
    { key: "rating_scent", label: "Scent" },
    { key: "rating_sound", label: "Sound" },
    { key: "rating_drizzle", label: "Drizzle" },
    { key: "rating_creativity", label: "Creativity" },
    { key: "rating_sensory_fit", label: "Sensory Fit" },
  ];

  const hasSubRatings = SUB_RATINGS.some((r) => log[r.key] != null);
  const hasShipping = !!log.order_date;
  const hasDetails =
    log.collection_name ||
    displayPrice != null ||
    log.purchased_from ||
    log.purchased_at;
  const hasNotes = log.likes || log.dislikes || log.notes;

  return (
    <div
      className="min-h-screen pb-24"
      style={{
        background: "linear-gradient(160deg, #fdf2f8 0%, #faf5ff 100%)",
      }}
    >
      {/* ── Sticky top bar ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-pink-100 px-4 py-3 flex items-center justify-between gap-2">
        <Link
          href="/collection"
          className="flex items-center gap-1.5 text-sm font-semibold text-pink-500 hover:text-pink-600 transition"
        >
          <span className="text-base leading-none">←</span>
          <span>Back</span>
        </Link>

        <span
          className={`text-xs font-bold px-3 py-1 rounded-full ${
            log.in_wishlist
              ? "bg-violet-100 text-violet-600 border border-violet-200"
              : "bg-pink-100 text-pink-600 border border-pink-200"
          }`}
        >
          {log.in_wishlist ? "✦ Wishlist" : "✦ In Collection"}
        </span>
      </div>

      <div className="px-4 pt-6 flex flex-col gap-5 max-w-lg mx-auto">
        {/* ── Hero header ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-pink-100 shadow-sm overflow-hidden flex flex-col gap-3 relative">
          {/* Decorative blob */}
          <div
            className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-[0.08] blur-3xl pointer-events-none z-0"
            style={{ background: "radial-gradient(circle, #f472b6, #a855f7)" }}
            aria-hidden="true"
          />

          {/* ── Photo ── */}
          {log.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={log.image_url}
              alt={log.slime_name ?? "Slime photo"}
              className="w-full h-56 object-cover"
            />
          ) : (
            <div
              className="w-full h-40 flex items-center justify-center text-4xl"
              style={{
                background:
                  "linear-gradient(135deg, #fce7f3 0%, #f3e8ff 50%, #e0f2fe 100%)",
              }}
              aria-hidden="true"
            >
              🫧
            </div>
          )}

          <div className="px-5 pb-5 flex flex-col gap-3 relative z-10">
            {/* Slime name */}
            <h1 className="text-2xl font-black text-gray-900 leading-tight tracking-tight pr-4">
              {log.slime_name ?? "Untitled Slime"}
            </h1>

            {/* Brand */}
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <span>by</span>
              {brandHref ? (
                <Link
                  href={brandHref}
                  className="font-semibold text-pink-500 hover:text-pink-600 underline underline-offset-2 transition"
                >
                  {brandName}
                </Link>
              ) : (
                <span className="font-semibold text-gray-700">{brandName}</span>
              )}
            </div>

            {/* Type badge + colors */}
            <div className="flex flex-wrap items-center gap-2">
              {log.slime_type && <TypeBadge type={log.slime_type as any} />}
              {log.colors?.map((c) => colorDot(c))}
            </div>

            {/* Scent */}
            {log.scent && (
              <p className="text-sm text-gray-500">
                <span className="mr-1">🌸</span>
                <span className="font-medium">{log.scent}</span>
              </p>
            )}
          </div>
        </div>

        {/* ── Ratings ─────────────────────────────────────────────────────── */}
        <Section title="Ratings">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-pink-50">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-pink-300 mb-1">
                Overall
              </p>
              <StarRating rating={log.rating_overall} size="lg" />
            </div>
            {log.rating_overall != null && (
              <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-pink-500 to-purple-500">
                {log.rating_overall}
                <span className="text-xl text-gray-300">/5</span>
              </span>
            )}
          </div>

          {hasSubRatings ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {SUB_RATINGS.map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {label}
                  </span>
                  <DotRating value={log[key] as number | null} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slime-muted text-center py-2">
              No detailed ratings yet.
            </p>
          )}
        </Section>

        {/* ── Details ─────────────────────────────────────────────────────── */}
        {hasDetails && (
          <Section title="Details">
            {log.collection_name && (
              <DetailRow label="Collection" value={log.collection_name} />
            )}
            {displayPrice != null && (
              <DetailRow
                label="Price paid"
                value={`${currency === "USD" ? "$" : ""}${Number(displayPrice).toFixed(2)}${currency !== "USD" ? ` ${currency}` : ""}`}
              />
            )}
            {log.purchased_from && (
              <DetailRow label="Purchased from" value={log.purchased_from} />
            )}
            {log.purchased_at && (
              <DetailRow label="Purchase date" value={fmt(log.purchased_at)} />
            )}
            <DetailRow label="Logged on" value={fmt(log.created_at)} />
          </Section>
        )}

        {/* ── Notes ───────────────────────────────────────────────────────── */}
        {hasNotes && (
          <Section title="Notes">
            <div className="flex flex-col gap-4">
              <TextBlock label="What I loved" value={log.likes} />
              <TextBlock label="What I didn't love" value={log.dislikes} />
              <TextBlock label="Notes" value={log.notes} />
            </div>
          </Section>
        )}

        {/* ── Shipping ────────────────────────────────────────────────────── */}
        {hasShipping && (
          <Section title="Shipping">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <ShippingStat
                label="Days to ship"
                value={log.days_to_ship ?? "—"}
              />
              <ShippingStat
                label="Days to receive"
                value={log.days_to_receive ?? "—"}
              />
            </div>
            <div className="flex flex-col gap-0">
              <DetailRow label="Order date" value={fmt(log.order_date)} />
              <DetailRow label="Ship date" value={fmt(log.ship_date)} />
              <DetailRow label="Received" value={fmt(log.received_date)} />
            </div>
            <p className="text-[11px] text-slime-muted mt-3 text-center italic">
              This shipping data helps rate {brandName}
            </p>
          </Section>
        )}

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        {isOwner && (
          <div className="flex gap-3 pt-1">
            <Link
              href={`/log/edit/${id}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-pink-200 text-pink-500 font-bold text-sm hover:bg-pink-50 transition"
            >
              ✎ Edit
            </Link>
            <DeleteLogButton logId={id} />
          </div>
        )}
      </div>
    </div>
  );
}

// apps/web/app/slimes/[id]/page.tsx
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TypeBadge } from "@/components/TypeBadge";
import { DeleteLogButton } from "@/components/DeleteLogButton";
import { BackButton } from "@/components/BackButton";
import ReportButton from "@/components/ReportButton"; // [Change 1] Import ReportButton

// ─── Types ────────────────────────────────────────────────────────────────────

type SlimeDetail = {
  id: string;
  user_id: string | null;
  created_at: string;
  slime_name: string | null;
  brand_id: string | null;
  brand_name_raw: string | null;
  collection_name: string | null;
  slime_type: string | null;
  colors: string[] | null;
  scent: string | null;
  image_url: string | null;
  purchase_price: number | null;
  purchase_currency: string | null;
  cost_paid: number | null;
  purchased_from: string | null;
  purchased_at: string | null;
  likes: string | null;
  dislikes: string | null;
  notes: string | null;
  in_collection: boolean;
  in_wishlist: boolean;
  is_public: boolean;
  rating_overall: number | null;
  rating_texture: number | null;
  rating_scent: number | null;
  rating_sound: number | null;
  rating_drizzle: number | null;
  rating_creativity: number | null;
  rating_sensory_fit: number | null;
  order_date: string | null;
  ship_date: string | null;
  received_date: string | null;
  days_to_ship: number | null;
  days_to_receive: number | null;
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
  const bg = COLOR_MAP[color.toLowerCase()] ?? "#2a2a2a";
  const isDark = ["black", "purple", "blue"].includes(color.toLowerCase());
  return (
    <span
      key={color}
      title={color}
      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-white/10"
      style={{ backgroundColor: bg, color: isDark ? "#f9fafb" : "#111111" }}
    >
      <span
        className="w-2 h-2 rounded-full inline-block border border-white/10"
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
  const dim = size === "lg" ? 24 : 16;
  return (
    <span
      className="flex items-center gap-0.5"
      aria-label={`${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width={dim}
          height={dim}
          viewBox="0 0 24 24"
          fill={n <= rating ? "#39FF14" : "rgba(57,255,20,0.15)"}
          aria-hidden="true"
        >
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
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
          className={`w-2 h-2 rounded-full ${i <= value ? "bg-slime-accent" : "bg-slime-border"}`}
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
    <section className="bg-slime-card rounded-2xl border border-slime-border overflow-hidden">
      <div className="px-5 py-3 border-b border-slime-border bg-slime-surface">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slime-accent">
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
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slime-border last:border-0">
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
    <div className="flex flex-col items-center justify-center rounded-2xl bg-slime-surface border border-slime-border p-3 gap-0.5">
      <span className="text-2xl font-black text-slime-cyan leading-none">
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
      <span className="text-[10px] font-bold uppercase tracking-widest text-slime-accent/70">
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
    { cookies: { get: (name) => cookieStore.get(name)?.value } },
  );

  const { data, error } = await supabase
    .from("collection_logs")
    .select(
      `
      id, user_id, created_at, slime_name, brand_id, brand_name_raw,
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

  const isOwner = !!user && user.id === log.user_id;
  const currentUserId = user?.id ?? null;

  const brandName = log.brands?.name ?? log.brand_name_raw ?? "Unknown brand";
  const brandHref = log.brands?.slug ? `/brands/${log.brands.slug}` : null;
  const displayPrice = log.purchase_price ?? log.cost_paid;
  const currency = log.purchase_currency ?? "USD";

  const SUB_RATINGS: { key: keyof SlimeDetail; label: string }[] = [
    { key: "rating_texture", label: "Texture" },
    { key: "rating_scent", label: "Scent" },
    { key: "rating_sound", label: "Sound / ASMR" },
    { key: "rating_drizzle", label: "Aesthetic" },
    { key: "rating_creativity", label: "Creativity" },
    { key: "rating_sensory_fit", label: "Quality" },
  ];

  const hasSubRatings = SUB_RATINGS.some((r) => log[r.key] != null);
  const hasShipping = !!log.order_date;
  const hasDetails =
    log.collection_name ||
    displayPrice != null ||
    log.purchased_from ||
    log.purchased_at;
  const hasNotes = log.likes || log.dislikes || log.notes;

  // [Change 1] Show report for logged-in non-owners
  const showReport = currentUserId !== null && !isOwner;

  return (
    <div
      className="min-h-screen pb-24"
      style={{
        background:
          "radial-gradient(ellipse 100% 60% at 50% 0%, #2D0A4E 0%, #100020 35%, #0A0A0A 65%)",
      }}
    >
      {/* Sticky top bar */}
      <div
        className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between gap-2"
        style={{
          background: "rgba(10,10,10,0.92)",
          borderBottom: "1px solid rgba(57,255,20,0.12)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <BackButton />

        {isOwner && (
          <span
            className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border ${
              log.in_wishlist
                ? "bg-violet-900/40 text-violet-300 border-violet-500/30"
                : "bg-slime-accent/10 text-slime-accent border-slime-accent/30"
            }`}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
            </svg>
            {log.in_wishlist ? "Wishlist" : "In Collection"}
          </span>
        )}
      </div>

      <div className="px-4 pt-6 flex flex-col gap-5 max-w-lg mx-auto">
        {/* Hero */}
        <div className="bg-slime-card rounded-2xl border border-slime-border overflow-hidden flex flex-col relative">
          <div
            className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 blur-3xl pointer-events-none z-0"
            style={{ background: "radial-gradient(circle, #39FF14, #00F0FF)" }}
            aria-hidden="true"
          />

          {log.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={log.image_url}
              alt={log.slime_name ?? "Slime photo"}
              className="w-full h-56 object-cover"
            />
          ) : (
            <div
              className="w-full h-40 flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #2D0A4E, #1A1A1A)",
              }}
              aria-hidden="true"
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(57,255,20,0.3)"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="10" />
                <circle
                  cx="8"
                  cy="9"
                  r="1.5"
                  fill="rgba(57,255,20,0.3)"
                  stroke="none"
                />
                <circle
                  cx="15"
                  cy="7"
                  r="1"
                  fill="rgba(57,255,20,0.2)"
                  stroke="none"
                />
              </svg>
            </div>
          )}

          <div className="px-5 pb-5 pt-4 flex flex-col gap-3 relative z-10">
            <h1 className="text-2xl font-black text-slime-cyan leading-tight tracking-tight pr-4">
              {log.slime_name ?? "Untitled Slime"}
            </h1>
            <div className="flex items-center gap-1.5 text-sm text-slime-muted">
              <span>by</span>
              {brandHref ? (
                <Link
                  href={brandHref}
                  className="font-semibold text-slime-magenta hover:text-slime-accent underline underline-offset-2 transition"
                >
                  {brandName}
                </Link>
              ) : (
                <span className="font-semibold text-slime-magenta">
                  {brandName}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {log.slime_type && <TypeBadge type={log.slime_type as any} />}
              {log.colors?.map((c) => colorDot(c))}
            </div>
            {log.scent && (
              <p className="text-sm text-slime-muted flex items-center gap-1.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FF00E5"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="M12 2C12 2 10 6 12 8C14 6 12 2 12 2Z" />
                  <path d="M12 22C12 22 10 18 12 16C14 18 12 22 12 22Z" />
                  <path d="M2 12C2 12 6 10 8 12C6 14 2 12 2 12Z" />
                  <path d="M22 12C22 12 18 10 16 12C18 14 22 12 22 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span className="font-medium text-slime-text">{log.scent}</span>
              </p>
            )}
          </div>
        </div>

        {/* Ratings */}
        <Section title="Ratings">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slime-border">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slime-muted mb-1">
                Overall
              </p>
              <StarRating rating={log.rating_overall} size="lg" />
            </div>
            {log.rating_overall != null && (
              <span className="text-4xl font-black text-slime-cyan">
                {log.rating_overall}
                <span className="text-xl text-slime-border">/5</span>
              </span>
            )}
          </div>
          {hasSubRatings ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {SUB_RATINGS.map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slime-muted">
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

        {hasNotes && (
          <Section title="Notes">
            <div className="flex flex-col gap-4">
              <TextBlock label="What I loved" value={log.likes} />
              <TextBlock label="What I didn't love" value={log.dislikes} />
              <TextBlock label="Notes" value={log.notes} />
            </div>
          </Section>
        )}

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

        {isOwner && (
          <div className="flex gap-3 pt-1">
            <Link
              href={`/log/edit/${id}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-slime-accent/40 text-slime-accent font-bold text-sm hover:bg-slime-accent/10 transition"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </Link>
            <DeleteLogButton logId={id} />
          </div>
        )}

        {/* [Change 1] Report button for non-owners */}
        {showReport && (
          <div className="flex justify-end pb-2">
            <ReportButton
              contentType="log"
              contentId={id}
              currentUserId={currentUserId}
            />
          </div>
        )}
      </div>
    </div>
  );
}

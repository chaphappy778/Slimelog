// apps/web/app/drops/[id]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/PageHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Drop {
  id: string;
  brand_id: string;
  name: string;
  description: string | null;
  drop_at: string | null;
  status: string | null;
  cover_image_url: string | null;
  shop_url: string | null;
  created_at: string;
}

interface DropBrand {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  is_verified: boolean | null;
}

interface DropSlime {
  id: string;
  slime_name: string;
  description: string | null;
  image_url: string | null;
  price: number | null;
  display_order: number;
}

// ─── Server Supabase ──────────────────────────────────────────────────────────

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } },
  );
}

async function fetchDropAndBrand(
  id: string,
): Promise<{ drop: Drop; brand: DropBrand } | null> {
  const supabase = await getSupabase();
  const { data: dropRow } = await supabase
    .from("drops")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!dropRow) return null;
  const drop = dropRow as Drop;

  const { data: brandRow } = await supabase
    .from("brands")
    .select("id, slug, name, logo_url, is_verified")
    .eq("id", drop.brand_id)
    .maybeSingle();

  if (!brandRow) return null;
  return { drop, brand: brandRow as DropBrand };
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await fetchDropAndBrand(id);

  if (!result) {
    return {
      title: "Drop not found — SlimeLog",
      description: "This drop doesn't exist on SlimeLog.",
    };
  }

  const { drop, brand } = result;
  const title = `${drop.name} drop from ${brand.name} — SlimeLog`;
  const description =
    drop.description?.trim() ||
    `${drop.name} — an upcoming slime drop from ${brand.name}. See details on SlimeLog.`;

  const url = `https://slimelog.com/drops/${drop.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: "SlimeLog",
      images: [{ url: drop.cover_image_url ?? "/og-default.png" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [drop.cover_image_url ?? "/og-default.png"],
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDropDate(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "Date TBD", time: "" };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: "Date TBD", time: "" };

  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(d);
  return { date, time };
}

function getCountdown(iso: string | null): {
  label: string;
  isLive: boolean;
  isPast: boolean;
  hasDate: boolean;
} {
  if (!iso) {
    return { label: "", isLive: false, isPast: false, hasDate: false };
  }

  const target = new Date(iso).getTime();
  if (isNaN(target)) {
    return { label: "", isLive: false, isPast: false, hasDate: false };
  }

  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) {
    const sincePast = Math.abs(diff);
    if (sincePast < 1000 * 60 * 60 * 6) {
      return { label: "LIVE NOW", isLive: true, isPast: false, hasDate: true };
    }
    return { label: "Past drop", isLive: false, isPast: true, hasDate: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return {
      label: `${days}d ${hours}h`,
      isLive: false,
      isPast: false,
      hasDate: true,
    };
  }
  if (hours > 0) {
    return {
      label: `${hours}h ${mins}m`,
      isLive: false,
      isPast: false,
      hasDate: true,
    };
  }
  return {
    label: `${mins}m`,
    isLive: false,
    isPast: false,
    hasDate: true,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DropPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchDropAndBrand(id);

  if (!result) {
    notFound();
  }

  const { drop, brand } = result;
  const supabase = await getSupabase();

  const { data: slimeRows } = await supabase
    .from("drop_slimes")
    .select(
      "id, slime_name, description, image_url, price, display_order",
    )
    .eq("drop_id", drop.id)
    .order("display_order", { ascending: true });

  const slimes = (slimeRows ?? []) as DropSlime[];

  const { date, time } = formatDropDate(drop.drop_at);
  const countdown = getCountdown(drop.drop_at);
  const isCancelled = drop.status === "cancelled";

  return (
    <PageWrapper dots>
      <PageHeader />

      <main className="pt-14 pb-24 max-w-2xl mx-auto">
        <div
          className="relative w-full h-56 sm:h-72"
          style={{
            background: drop.cover_image_url
              ? undefined
              : "linear-gradient(135deg, rgba(57,255,20,0.15), rgba(45,10,78,0.5))",
          }}
        >
          {drop.cover_image_url && (
            <Image
              src={drop.cover_image_url}
              alt={drop.name}
              fill
              sizes="100vw"
              priority
              className="object-cover"
            />
          )}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(10,10,10,0.85) 100%)",
            }}
          />

          <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
            {countdown.isLive && (
              <span
                className="text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5"
                style={{
                  background: "rgba(255,0,229,0.95)",
                  color: "#0A0A0A",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: "#0A0A0A",
                    animation: "pulse 1.2s ease-in-out infinite",
                  }}
                  aria-hidden="true"
                />
                LIVE
              </span>
            )}
            {isCancelled && (
              <span
                className="text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full"
                style={{
                  background: "rgba(231,76,60,0.95)",
                  color: "#fff",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                Cancelled
              </span>
            )}
          </div>
        </div>

        <section className="px-4 -mt-12 relative z-10">
          <Link
            href={`/brands/${brand.slug}`}
            className="inline-flex items-center gap-2 text-sm text-slime-cyan hover:text-slime-accent transition-colors mb-3"
          >
            <div className="relative w-7 h-7 rounded-full overflow-hidden border border-slime-border">
              {brand.logo_url ? (
                <Image
                  src={brand.logo_url}
                  alt={brand.name}
                  fill
                  sizes="28px"
                  className="object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                    color: "#0A0A0A",
                  }}
                  aria-hidden="true"
                >
                  {brand.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="font-semibold">{brand.name}</span>
            {brand.is_verified && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="#00F0FF"
                aria-label="Verified"
              >
                <path d="M12 0l3.09 5.26L21 6l-4.5 4.39L17.18 17 12 14.27 6.82 17l.68-6.61L3 6l5.91-.74L12 0z" />
              </svg>
            )}
          </Link>

          <h1
            className="text-3xl font-black leading-tight"
            style={{
              color: "#fff",
              fontFamily: "Montserrat, Inter, sans-serif",
            }}
          >
            {drop.name}
          </h1>

          {drop.description && (
            <p className="mt-3 text-sm text-slime-text/80 leading-relaxed">
              {drop.description}
            </p>
          )}

          {countdown.hasDate && (
            <div
              className="mt-4 p-4 rounded-xl border flex items-center gap-4"
              style={{
                background: "rgba(45,10,78,0.3)",
                borderColor: "rgba(45,10,78,0.6)",
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(57,255,20,0.15)",
                  border: "1px solid rgba(57,255,20,0.3)",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#39FF14"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slime-text">{date}</p>
                {time && <p className="text-xs text-slime-muted">{time}</p>}
              </div>
              {!isCancelled && !countdown.isPast && !countdown.isLive && (
                <div
                  className="text-right shrink-0 px-3 py-1.5 rounded-lg"
                  style={{
                    background: "rgba(0,240,255,0.1)",
                    border: "1px solid rgba(0,240,255,0.3)",
                  }}
                >
                  <p className="text-[10px] uppercase tracking-wider text-slime-muted font-semibold">
                    Drops in
                  </p>
                  <p
                    className="text-base font-black"
                    style={{
                      color: "#00F0FF",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    {countdown.label}
                  </p>
                </div>
              )}
            </div>
          )}

          {drop.shop_url && !isCancelled && (
            <a
              href={drop.shop_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 w-full text-center py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                color: "#0A0A0A",
                fontFamily: "Montserrat, Inter, sans-serif",
              }}
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
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              Shop the drop
            </a>
          )}
        </section>

        {slimes.length > 0 && (
          <section className="px-4 mt-8">
            <h2
              className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: "#39FF14", fontFamily: "Montserrat, sans-serif" }}
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
                <path d="M12 2 C8 7 5 11 5 15 a7 7 0 0 0 14 0 C19 11 16 7 12 2 z" />
              </svg>
              Drop Lineup ({slimes.length})
            </h2>
            <div className="flex flex-col gap-3">
              {slimes.map((slime) => {
                return (
                  <article
                    key={slime.id}
                    className="rounded-xl overflow-hidden border bg-slime-card flex flex-row gap-3 p-3"
                    style={{ borderColor: "rgba(45,10,78,0.5)" }}
                  >
                    <div
                      className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0"
                      style={{ background: "rgba(45,10,78,0.4)" }}
                    >
                      {slime.image_url ? (
                        <Image
                          src={slime.image_url}
                          alt={slime.slime_name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="rgba(255,255,255,0.3)"
                            strokeWidth="1.5"
                            aria-hidden="true"
                          >
                            <path d="M12 2 L14 9 L21 12 L14 15 L12 22 L10 15 L3 12 L10 9 Z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                      <p className="text-sm font-bold text-slime-text">
                        {slime.slime_name}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {typeof slime.price === "number" && (
                          <span
                            className="text-xs font-bold"
                            style={{ color: "#39FF14" }}
                          >
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format(slime.price)}
                          </span>
                        )}
                      </div>
                      {slime.description && (
                        <p className="text-xs text-slime-muted line-clamp-2">
                          {slime.description}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </PageWrapper>
  );
}

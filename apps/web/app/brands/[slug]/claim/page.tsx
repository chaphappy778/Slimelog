// apps/web/app/brands/[slug]/claim/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/PageHeader";
import ClaimBrandForm from "@/components/brand/ClaimBrandForm";
import { createClient } from "@/lib/supabase/server";
import type { BrandClaim } from "@/lib/types";

export const metadata: Metadata = {
  title: "Claim Brand — SlimeLog",
  description: "Verify ownership of your brand on SlimeLog.",
  robots: { index: false, follow: false },
};

interface BrandRow {
  id: string;
  slug: string;
  name: string;
  website_url: string | null;
  owner_id: string | null;
}

export default async function ClaimBrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // 1. Auth gate.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/brands/${slug}/claim`);
  }

  // 2. Fetch brand.
  const { data: brandData } = await supabase
    .from("brands")
    .select("id, slug, name, website_url, owner_id")
    .eq("slug", slug)
    .maybeSingle();

  const brand = brandData as BrandRow | null;
  if (!brand) {
    notFound();
  }

  // 3. Already-owned brand — bounce to the brand page.
  if (brand.owner_id) {
    redirect(`/brands/${slug}`);
  }

  // 4. Most-recent claim by this user for this brand.
  const { data: claimData } = await supabase
    .from("brand_claims")
    .select("*")
    .eq("user_id", user.id)
    .eq("brand_id", brand.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const claim = claimData as BrandClaim | null;

  // 5a. Approved — already won (defensive; brand.owner_id should be set).
  if (claim?.status === "approved") {
    redirect(`/brands/${slug}`);
  }

  // 5b. Already submitted — show the under-review message instead of the form.
  const alreadySubmitted = claim?.status === "pending_review";

  return (
    <PageWrapper dots>
      <PageHeader />

      {/* [Change 3 — Bundle A] Inline back button block removed. PageHeader
          now matches /brands/[slug]/claim via BACK_BUTTON_ROUTES and renders
          its own back button with proper navigation-history-stack behavior.
          The <header> below was previously mt-6 to sit beneath the inline
          back button; now mt-0 since <main>'s pt-14 already provides
          clearance from the fixed PageHeader. The `Link` import stays —
          it's still used for "Learn more about verification" and the
          "Back to {brand.name}" CTA on the already-submitted state. */}
      <main className="pt-14 pb-24 max-w-2xl mx-auto px-4">
        <header className="mt-4">
          <p
            className="text-[10px] uppercase tracking-widest font-bold mb-2"
            style={{ color: "#00F0FF", fontFamily: "Montserrat, sans-serif" }}
          >
            Brand Verification
          </p>
          <h1
            className="text-2xl font-black"
            style={{
              color: "#fff",
              fontFamily: "Montserrat, Inter, sans-serif",
            }}
          >
            Claim {brand.name}
          </h1>
          <p className="mt-3 text-sm text-slime-text/80 leading-relaxed">
            We require email verification and business documentation to confirm
            ownership.{" "}
            <Link
              href="/brand-verification"
              className="text-slime-accent font-semibold hover:underline"
            >
              Learn more about verification →
            </Link>
          </p>
        </header>

        <section className="mt-8">
          {alreadySubmitted ? (
            <div
              className="rounded-xl"
              style={{
                background: "rgba(45,10,78,0.25)",
                border: "1px solid rgba(45,10,78,0.7)",
                padding: 24,
                backdropFilter: "blur(8px)",
              }}
            >
              <p
                className="text-[10px] uppercase tracking-widest font-bold mb-2"
                style={{
                  color: "#00F0FF",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                Claim submitted
              </p>
              <h2
                className="text-lg font-bold mb-3"
                style={{
                  color: "#fff",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                Your claim is being reviewed.
              </h2>
              <p className="text-sm text-white/80 leading-relaxed mb-6">
                We&apos;ll email you within 3-5 business days when there&apos;s
                an update.
              </p>
              <Link
                href={`/brands/${brand.slug}`}
                className="inline-flex items-center"
                style={{
                  background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                  color: "#0A0A0A",
                  fontWeight: 600,
                  fontFamily: "Montserrat, Inter, sans-serif",
                  padding: "12px 20px",
                  borderRadius: 10,
                  fontSize: 13,
                }}
              >
                Back to {brand.name}
              </Link>
            </div>
          ) : (
            <ClaimBrandForm
              brand={{
                id: brand.id,
                slug: brand.slug,
                name: brand.name,
                website_url: brand.website_url,
              }}
              initialClaim={claim}
              currentUserEmail={user.email ?? ""}
            />
          )}
        </section>
      </main>
    </PageWrapper>
  );
}

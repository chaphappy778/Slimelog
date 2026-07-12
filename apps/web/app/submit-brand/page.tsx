// apps/web/app/submit-brand/page.tsx
//
// T110 (2026-07-11): user-facing "suggest a brand" landing page.
//
// Auth-gated: signed-out users are bounced to /login with a next-back
// to /submit-brand so they land here after logging in.
//
// Accepts a `?name=` query so log-wizard fallback links can prefill the
// name field when the user clicks "Not seeing your brand? Submit it →"
// from BrandSearchInput.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/PageHeader";
import SubmitBrandForm from "@/components/brand/SubmitBrandForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Suggest a brand — SlimeLog",
  description: "Suggest a slime shop we should track.",
  robots: { index: false, follow: false },
};

interface SearchParams {
  name?: string;
}

export default async function SubmitBrandPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/submit-brand");
  }

  const params = await searchParams;
  const rawName = params.name ?? "";
  // Trim + clamp to the same length the DB CHECK enforces. Bad input
  // (60+ chars in the URL) just gets sliced rather than 500ing.
  const prefilledName = rawName.trim().slice(0, 60);

  return (
    <PageWrapper dots glow="magenta">
      <PageHeader />

      <main className="pt-20 pb-24 px-4 max-w-lg mx-auto">
        <div className="mb-6">
          <h1
            className="text-3xl font-black tracking-tight"
            style={{
              fontFamily: "Montserrat, sans-serif",
              background:
                "linear-gradient(90deg, #00F0FF 0%, #39FF14 50%, #FF00E5 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Suggest a brand
          </h1>
          <p className="text-sm text-slime-muted mt-2">
            Know a slime shop we should track? Drop the details and we'll
            review it. If they check out, they join the catalog and you get a
            notification.
          </p>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{
            background: "rgba(45,10,78,0.3)",
            border: "1px solid rgba(45,10,78,0.8)",
            boxShadow:
              "inset 0 0 30px rgba(45,10,78,0.2), 0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <SubmitBrandForm initialName={prefilledName} />
        </div>
      </main>
    </PageWrapper>
  );
}

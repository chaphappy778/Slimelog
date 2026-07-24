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
//
// T168 (2026-07-17): also accepts a `?returnTo=/log` query param used
// by the log-wizard entry point. On successful submit the form routes
// the user back to `returnTo` (validated with safeRedirect) instead of
// the default success-card + Back-to-home path. Signed-out users have
// their `returnTo` preserved through the /login bounce so it survives
// the round trip. See T168 in docs/SlimeLog_Tracker.md.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/PageHeader";
import SubmitBrandForm from "@/components/brand/SubmitBrandForm";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  // T205 (2026-07-24): pipe separator, not an em-dash, per the voice rules.
  title: "Suggest a brand | SlimeLog",
  description: "Suggest a slime shop we should track.",
  robots: { index: false, follow: false },
};

interface SearchParams {
  name?: string;
  returnTo?: string;
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

  const params = await searchParams;
  const rawName = params.name ?? "";
  // Trim + clamp to the same length the DB CHECK enforces. Bad input
  // (60+ chars in the URL) just gets sliced rather than 500ing.
  const prefilledName = rawName.trim().slice(0, 60);
  // [T168 2026-07-17] Validate the returnTo path against open-redirect
  // attacks. Falls back to null (no return handling) if unsafe.
  const returnToRaw = params.returnTo ?? null;
  const returnToSafe = returnToRaw
    ? safeRedirect(returnToRaw, "") || null
    : null;

  if (!user) {
    // Preserve name + returnTo through the auth bounce so the log-wizard
    // draft persistence chain still works for signed-out users.
    const nextParams = new URLSearchParams();
    if (rawName.trim()) nextParams.set("name", rawName.trim());
    if (returnToSafe) nextParams.set("returnTo", returnToSafe);
    const nextQuery = nextParams.toString();
    const nextPath = nextQuery
      ? `/submit-brand?${nextQuery}`
      : "/submit-brand";
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return (
    <PageWrapper dots glow="magenta">
      <PageHeader />

      {/* T205 (2026-07-24): the hero, card, and success/error states all
          live inside SubmitBrandForm now so each form state controls its
          own layout (boxed form vs. centered success screen). This page
          stays a thin auth gate + prefill/returnTo pass-through. */}
      <main className="pt-20 pb-24 px-4 max-w-lg mx-auto">
        <SubmitBrandForm initialName={prefilledName} returnTo={returnToSafe} />
      </main>
    </PageWrapper>
  );
}

// apps/web/app/admin/brands/page.tsx
//
// Admin brand-ownership testing surface.
//
// Lets an admin claim / unclaim / take over brand ownership directly, without
// going through the public brand-claim flow. Jennifer's admin account uses a
// personal email, so the domain-match auto-approve path never applies to her;
// this page gives a permanent way to toggle ownership on the admin account for
// feature testing. NOT a public-facing tool.
//
// Owner usernames are resolved via a second query (distinct owner_ids ->
// profiles) rather than a PostgREST embed, to sidestep the nullable-FK embed
// pitfall documented on the brand-claims detail page.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/is-admin-check";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/PageHeader";
import BrandOwnershipTable, {
  type BrandOwnershipRow,
} from "@/components/admin/BrandOwnershipTable";

// Cap the initial load. If the catalog ever exceeds this, the client-side
// search would silently miss brands past the cap — defer to a follow-up
// ticket for server-side search at that point (see brief).
const BRAND_FETCH_CAP = 500;

export default async function AdminBrandsPage() {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  // Audit hp-9 (2026-07-06): role-based admin check.
  if (!(await isAdminUser(authClient, user)) || !user) {
    redirect("/");
  }

  const admin = createAdminClient();

  const { data: rawBrands, error: brandsErr } = await admin
    .from("brands")
    .select("id, name, slug, logo_url, owner_id, verification_tier")
    .order("name", { ascending: true })
    .limit(BRAND_FETCH_CAP);

  if (brandsErr) {
    console.error("[admin/brands] brand load failed:", brandsErr);
  }

  const brandList = rawBrands ?? [];

  // Resolve owner usernames in one batched query over the distinct owner_ids.
  const ownerIds = Array.from(
    new Set(
      brandList
        .map((b) => b.owner_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  );

  const usernameById = new Map<string, string | null>();
  if (ownerIds.length > 0) {
    const { data: owners, error: ownersErr } = await admin
      .from("profiles")
      .select("id, username")
      .in("id", ownerIds);
    if (ownersErr) {
      console.error("[admin/brands] owner profile load failed:", ownersErr);
    }
    for (const o of owners ?? []) {
      usernameById.set(o.id as string, (o.username as string | null) ?? null);
    }
  }

  const brands: BrandOwnershipRow[] = brandList.map((b) => ({
    id: b.id as string,
    name: (b.name as string) ?? "",
    slug: (b.slug as string) ?? "",
    logo_url: (b.logo_url as string | null) ?? null,
    owner_id: (b.owner_id as string | null) ?? null,
    owner_username:
      b.owner_id !== null ? (usernameById.get(b.owner_id as string) ?? null) : null,
    verification_tier: (b.verification_tier as string | null) ?? null,
  }));

  return (
    <PageWrapper dots>
      <PageHeader />
      <main className="pt-20 pb-24 px-4 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1
            className="text-2xl font-black tracking-tight"
            style={{ fontFamily: "Montserrat, sans-serif", color: "#fff" }}
          >
            Brand Ownership Admin
          </h1>
          <p className="text-xs text-slime-muted mt-1">
            Claim, unclaim, or transfer brand ownership on your admin account.
            For admin testing only, not a public-facing tool.
          </p>
        </div>

        <BrandOwnershipTable brands={brands} currentAdminId={user.id} />
      </main>
    </PageWrapper>
  );
}

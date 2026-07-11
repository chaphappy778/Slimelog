// apps/web/app/admin/subscriptions/page.tsx
//
// T102 + T103 admin UI (2026-07-11): search for a user by email/username
// OR a brand by slug/name, see the current subscription state, then use
// two escape-hatch buttons:
//
//   * "Sync from Stripe" (T103) — pulls authoritative state from Stripe
//     and overwrites the DB row. Use when a webhook silently no-op'd
//     and the row has drifted.
//
//   * "Set tier manually" (T102) — flip the tier + status directly
//     without Stripe. Use for QA / fresh account cycles pre-launch.
//     Warning banner reminds the admin this bypasses Stripe entirely
//     and will drift back if the customer has a real live sub.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/is-admin-check";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/PageHeader";
import SubscriptionsAdminForm from "./SubscriptionsAdminForm";

export default async function AdminSubscriptionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!(await isAdminUser(supabase, user))) redirect("/");

  return (
    <PageWrapper dots>
      <PageHeader />
      <main className="pt-20 pb-24 px-4 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1
            className="text-3xl font-black tracking-tight"
            style={{ fontFamily: "Montserrat, sans-serif", color: "#fff" }}
          >
            Subscription Tools
          </h1>
          <p className="text-xs text-slime-muted mt-1">
            QA escape hatches for the Stripe subscription state
          </p>
        </div>
        <SubscriptionsAdminForm />
      </main>
    </PageWrapper>
  );
}

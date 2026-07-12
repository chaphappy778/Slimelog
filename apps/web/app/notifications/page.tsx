// apps/web/app/notifications/page.tsx
//
// T29 (2026-07-12): the in-app notifications feed page.
//
// Server component — does the auth guard, then hands off to the
// client <NotificationsFeed /> which owns fetch + render.
//
// PageHeader on this route hides the notification bell (it would be
// pointing at the same place the user already is). BottomNavWrapper
// still renders through the shared root layout.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/PageHeader";
import NotificationsFeed from "@/components/notifications/NotificationsFeed";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Notifications — SlimeLog",
  description: "Your in-app notifications.",
  robots: { index: false, follow: false },
};

export default async function NotificationsPage(): Promise<React.ReactElement> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/notifications");
  }

  return (
    <PageWrapper dots glow="cyan">
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
            Notifications
          </h1>
          <p className="text-sm text-slime-muted mt-2">
            Updates from your scouts, your logs, and brands you follow.
          </p>
        </div>

        <NotificationsFeed />
      </main>
    </PageWrapper>
  );
}

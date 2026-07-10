// apps/web/components/onboarding/OnboardingGate.tsx
//
// Client-side gate for the OnboardingModal. Checks
// profiles.onboarding_completed_at on mount and only renders the modal
// when it's null (i.e., user hasn't completed or skipped yet).
//
// Renders nothing while loading, so there's no flash before we know
// whether to show it.

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import OnboardingModal from "./OnboardingModal";

const supabase = createClient();

export default function OnboardingGate() {
  const [status, setStatus] = useState<"loading" | "show" | "hide">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        if (!cancelled) setStatus("hide");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed_at")
        .eq("id", data.user.id)
        .maybeSingle();

      if (cancelled) return;
      setStatus(profile?.onboarding_completed_at ? "hide" : "show");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status !== "show") return null;

  return <OnboardingModal onComplete={() => setStatus("hide")} />;
}

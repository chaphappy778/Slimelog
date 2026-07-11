// apps/web/components/onboarding/OnboardingGate.tsx
//
// Client-side gate for the OnboardingModal. Checks
// profiles.onboarding_completed_at on mount and only renders the modal
// when it's null (i.e., user hasn't completed or skipped yet).
//
// Renders nothing while loading, so there's no flash before we know
// whether to show it.

"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import OnboardingModal from "./OnboardingModal";

export default function OnboardingGate() {
  // T104: consume shared AuthProvider state. `dismissed` is local so
  // Skip / Complete tears down the modal without waiting for the DB
  // write + shared-state re-fetch to round-trip.
  const { profile, loading } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (loading) return null;
  if (dismissed) return null;
  if (!profile) return null;
  if (profile.onboarding_completed_at) return null;

  return <OnboardingModal onComplete={() => setDismissed(true)} />;
}

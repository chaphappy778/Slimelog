// apps/web/lib/use-isomorphic-layout-effect.ts
//
// SSR-safe alias for useLayoutEffect.
//
// useLayoutEffect logs a warning during SSR because it has no effect
// on the server. The standard React pattern is to alias it to useEffect
// on the server (where both are no-ops during render anyway) and use
// the real useLayoutEffect on the client.

"use client";

import { useEffect, useLayoutEffect } from "react";

// [Initial implementation — scroll restore]
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

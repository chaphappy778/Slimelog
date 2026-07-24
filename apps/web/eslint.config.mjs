// apps/web/eslint.config.mjs
//
// T197 (2026-07-23): Next 16 removed `next lint`, so `npm run lint` now
// calls the ESLint binary directly. eslint-config-next@16 ships flat
// config only (its `core-web-vitals` export is an array of flat config
// objects, not an eslintrc-shaped object), so the old `.eslintrc.json`
// could not be kept — ESLint 9 in eslintrc mode cannot consume it.
// Rule set is unchanged: next/core-web-vitals, same as before.

import coreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "ios/**",
      "public/**",
      "next-env.d.ts",
    ],
  },
  ...coreWebVitals,
  {
    // T199 A3 (2026-07-23): severity downgrades. This object is spread AFTER
    // coreWebVitals so its rule levels win. See docs/lint-triage-2026-07-23.md
    // clusters 1 and 2 for the per-finding audit behind each downgrade.
    rules: {
      // T199 A3 (2026-07-23): downgraded to warn. Most of the 27 findings in
      // this cluster are deliberate mount-gate fixes for hydration bugs (see
      // Sentry SLIMELOG-1 / 81b58fcb, T191). Enforcing as error would either
      // reopen those closed issues or generate stale suppressions. Warn keeps
      // the signal without blocking builds; real bugs in this class should
      // still be triaged when they appear.
      "react-hooks/set-state-in-effect": "warn",
      // T199 A3 (2026-07-23): downgraded to warn. Of the 36 findings in this
      // cluster, ~32 are false positives (refs passed as props, refs accessed
      // in onClick handlers that the rule cannot see through). The ~4 real ones
      // live in the Timeline / Galaxy / Spiral shelf views, which Jenn is
      // holding for redesign (see triage doc + tracker T199 exclusion), so
      // fixing them now would churn code slated to be replaced. Warn keeps the
      // signal without blocking builds.
      "react-hooks/refs": "warn",
    },
  },
];

export default config;

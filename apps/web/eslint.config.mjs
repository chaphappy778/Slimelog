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
];

export default config;

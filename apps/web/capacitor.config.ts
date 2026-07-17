// apps/web/capacitor.config.ts
//
// 2026-07-16 (#23 Capacitor packaging for iOS): thin native shell that
// loads https://slimelog.com in a hardened WebView. Pattern B per
// CLAUDE.md — server components + API routes run exactly as they do on
// web; the native shell just adds native capabilities (IAP via
// RevenueCat, push notifications, SIWA, camera, deep links) and lets
// Vercel push web updates without an App Store cycle.
//
// The bundled `webDir` (public/) is a fallback only; the WebView
// navigates straight to server.url on launch. If the user is offline
// or slimelog.com is unreachable, they see whatever's in public/
// (currently just the favicon + robots.txt, so effectively a blank
// dark screen — we can add a proper offline splash later).
//
// Native plugins land in subsequent commits (Capacitor scaffold-first
// so we can prove the shell loads before adding surface area).

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chaphaus.slimelog',
  appName: 'SlimeLog',
  webDir: 'public',
  server: {
    // Live production URL. The WebView navigates here on every cold
    // launch, so any Vercel deploy is picked up instantly without an
    // App Store re-review.
    url: 'https://slimelog.com',
    // Explicit HTTPS-only. WKWebView is HTTPS-only by default; this
    // makes the intent obvious to reviewers + prevents accidental
    // cleartext escape hatches if the config ever gets bulk-edited.
    cleartext: false,
    // 2026-07-16 debug: first-run showed WKErrorFrameLoadInterrupted
    // (code 102) + Safari handoff. Root cause was Capacitor's default
    // navigation policy treating any request to a domain not in its
    // "known good" list as an external link and opening it in Safari.
    // Whitelisting slimelog.com + its subdomains + our Supabase auth
    // callback host tells Capacitor to keep those loads INSIDE the
    // WebView. Add any additional domains here as we integrate them
    // (Stripe checkout, Instagram embed, etc.). Other links (mailto:,
    // Instagram profile links, external brand sites) continue to open
    // in Safari as expected.
    allowNavigation: [
      'slimelog.com',
      '*.slimelog.com',
      'zxxjpxpchvsjkvslwtvx.supabase.co',
    ],
    // 2026-07-16: intentionally NOT setting iosScheme / androidScheme
    // here. Capacitor's defaults ('capacitor' for iOS, 'https' for
    // android) handle server.url remote-load correctly. Overriding
    // iosScheme to 'https' when server.url is also 'https' caused the
    // WebView to reject the initial navigation on first run.
  },
  ios: {
    // Dark background matches the app's signature palette so the
    // pre-WebView paint on cold launch doesn't blast white at the
    // user. Value from the CLAUDE.md palette (#0A0A0A = slime-bg).
    backgroundColor: '#0A0A0A',
    // Respect iPhone notch + Dynamic Island by insetting content
    // automatically. Alternative 'never' would give a full-bleed
    // WebView but users would need to build safe-area handling into
    // every page.
    contentInset: 'automatic',
  },
  // Cross-platform background — same reason as ios.backgroundColor.
  backgroundColor: '#0A0A0A',
};

export default config;

// apps/web/app/robots.ts
import type { MetadataRoute } from "next";

// [Change 1 — #35] Robots policy.
// Allow indexing of public, shareable surfaces:
//   • / (landing redirect target for logged-out users)
//   • /users/* (public profiles via profiles_public view)
//   • /slimes/* (public collection logs)
//   • /brands and /brands/* (brand directory + brand pages)
//   • /drops/* (drop pages — already public-readable pre-#35)
//
// Disallow:
//   • /api/* — internal API surfaces, not for crawlers
//   • /admin/* — moderator surfaces
//   • /log/* — authenticated logging wizard
//   • /collection — owner's private collection view
//   • /wishlist — owner's wishlist
//   • /profile — owner's self-profile view (use /users/[username] for sharing)
//   • /settings/* — account / privacy / brand settings
//   • /auth/* — auth callback, password reset, etc.
//   • /age-verify — age gate flow
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/users/", "/slimes/", "/brands", "/brands/", "/drops/"],
        disallow: [
          "/api/",
          "/admin/",
          "/log/",
          "/collection",
          "/wishlist",
          "/profile",
          "/settings/",
          "/auth/",
          "/age-verify",
        ],
      },
    ],
    sitemap: "https://slimelog.com/sitemap.xml",
    host: "https://slimelog.com",
  };
}

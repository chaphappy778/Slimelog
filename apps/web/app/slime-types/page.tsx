// apps/web/app/slime-types/page.tsx
// T32 (2026-07-13): /slime-types was the original 20-texture carousel.
// It has been superseded by the full 12-part SlimeLog Guide at /guide.
// This route now redirects so bookmarks, inbound links, and existing
// share URLs land on the new guide transparently.

import { redirect } from "next/navigation";

export default function SlimeTypesRedirect(): never {
  redirect("/guide");
}

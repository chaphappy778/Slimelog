// apps/web/app/i/[code]/route.ts
// Short-link redirector for referral codes.
//
// Landing at `/i/XTZ743` sets a cookie with the code (so it survives if
// the user browses around before signing up), then 302s to /signup?ref=CODE.
// Purpose: nicer-looking shareable URL than the raw /signup?ref= form,
// and works as a graceful landing pad when the target signup page moves.
//
// This does NOT validate the code against the DB — bad codes will just
// end up on /signup?ref=BADCODE which silently drops the ref (see /signup
// page). Validating here would require a DB round trip on every click of
// a bad or expired link, and we'd rather serve fast than tell users their
// invite is broken.

import { NextResponse, type NextRequest } from "next/server";

const REFERRAL_CODE_RE = /^[A-Z0-9]{6}$/;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await context.params;
  const code = (rawCode ?? "").trim().toUpperCase();
  const origin = new URL(request.url).origin;

  // Shape check: if the URL segment doesn't look like a code, just send
  // them to /signup without a ref. Better than redirecting to a broken URL.
  const target = REFERRAL_CODE_RE.test(code)
    ? `${origin}/signup?ref=${code}`
    : `${origin}/signup`;

  const response = NextResponse.redirect(target);

  if (REFERRAL_CODE_RE.test(code)) {
    // Mirror the cookie the /signup page would set so the code persists
    // even if the user closes the tab and comes back within 7 days.
    response.cookies.set("slimelog_ref", code, {
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
    });
  }

  return response;
}

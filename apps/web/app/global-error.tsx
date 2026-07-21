// apps/web/app/global-error.tsx
//
// Observability push (2026-07-20): App Router global error boundary.
// Next.js only invokes this when an error escapes the root layout, so
// it is the last line of capture for otherwise-unhandled render errors.
// Required by Sentry's Next.js App Router setup — without it, top-level
// client render crashes never reach Sentry.

"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        {/* NextError needs a statusCode; 0 renders a generic client-side
            error page. This only shows on a total root-layout failure. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}

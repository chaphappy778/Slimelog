// apps/web/app/api/age-verify/reject/route.ts
import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// [Fix A - Change 1] Age calculation helper — inline, no date-fns
// Matches the pattern used in /api/age-verify/route.ts
function calculateAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export async function POST(request: NextRequest) {
  try {
    // [Fix A - Change 2] Parse and validate request body
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "date_of_birth is required" },
        { status: 400 },
      );
    }

    const { date_of_birth } = body as { date_of_birth?: unknown };

    if (!date_of_birth || typeof date_of_birth !== "string") {
      return NextResponse.json(
        { error: "date_of_birth is required" },
        { status: 400 },
      );
    }

    // [Fix A - Change 3] Validate date is parseable
    const parsedDate = new Date(date_of_birth);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date_of_birth" },
        { status: 400 },
      );
    }

    // [Fix A - Change 4] Authenticate the requesting user via cookies
    // Uses the same anon-client cookie pattern as /api/age-verify/route.ts
    const cookieStore = await cookies();
    const anonClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // [Fix A - Change 5] Server-side age validation — trust no client.
    // This route should ONLY be called for under-13 users. If the calculated
    // age is >= 13, the client is misusing this route — reject with 403
    // rather than deleting an account that shouldn't be deleted.
    const age = calculateAge(date_of_birth);
    if (age >= 13) {
      console.error("[api/age-verify/reject] rejected deletion — age >= 13", {
        userId: user.id,
        age,
      });
      return NextResponse.json(
        { error: "Age does not require deletion" },
        { status: 403 },
      );
    }

    // [Fix A - Change 6] Delete the auth user via service role admin client.
    // profiles.id → auth.users.id has ON DELETE CASCADE, so the profile row
    // is removed automatically. COPPA best practice: retain no data for
    // under-13 users.
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      user.id,
    );

    if (deleteError) {
      console.error(
        "[api/age-verify/reject] delete error:",
        deleteError.message,
      );
      return NextResponse.json(
        { error: "Failed to delete user" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/age-verify/reject] unexpected error:", err);
    // Observability: surface the swallowed error to Sentry.
    Sentry.captureException(err, { tags: { route: "age-verify/reject" } });
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 },
    );
  }
}

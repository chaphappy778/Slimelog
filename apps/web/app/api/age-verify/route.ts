// apps/web/app/api/age-verify/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// [Change 1] Age calculation helper — inline, no date-fns
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
    const body = await request.json();
    const { date_of_birth, age_verified } = body as {
      date_of_birth: string;
      age_verified: boolean;
    };

    // [Change 2] Validate inputs
    if (!date_of_birth || typeof date_of_birth !== "string") {
      return NextResponse.json(
        { error: "date_of_birth is required." },
        { status: 400 },
      );
    }
    if (age_verified !== true) {
      return NextResponse.json(
        { error: "age_verified must be true." },
        { status: 400 },
      );
    }

    // [Change 3] Validate date is parseable
    const parsedDate = new Date(date_of_birth);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date_of_birth." },
        { status: 400 },
      );
    }

    // [Change 4] Enforce minimum age of 13
    const age = calculateAge(date_of_birth);
    if (age < 13) {
      return NextResponse.json(
        { error: "Users must be at least 13 years old." },
        { status: 403 },
      );
    }

    // [Change 5] Authenticate the requesting user via cookies
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
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 },
      );
    }

    // [Change 6] Update profiles via service role — bypasses RLS
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        date_of_birth,
        age_verified: true,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[api/age-verify] update error:", updateError.message);
      return NextResponse.json(
        { error: "Failed to save age verification." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/age-verify] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

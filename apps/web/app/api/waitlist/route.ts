import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { email, marketing_consent } = await request.json();

  // Validate email
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // Service role client — bypasses RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error } = await supabase
    .from("waitlist")
    .insert({ email, marketing_consent: marketing_consent ?? false });

  if (error) {
    // Postgres unique violation = duplicate email
    if (error.code === "23505") {
      return NextResponse.json({ already: true }, { status: 200 });
    }
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

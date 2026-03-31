import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { email, marketing_consent } = await request.json();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error } = await supabase
    .from("waitlist")
    .insert({ email, marketing_consent: marketing_consent ?? false });

  if (error) {
    // Log the full error so we can see it in Vercel logs
    console.error("Supabase error:", JSON.stringify(error));
    if (error.code === "23505") {
      return NextResponse.json({ already: true }, { status: 200 });
    }
    return NextResponse.json(
      { error: "Something went wrong", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

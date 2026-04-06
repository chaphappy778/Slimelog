import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const { error } = await supabase.from("collection_logs").insert({
    user_id: user.id,
    slime_name: body.slime_name,
    brand_name_raw: body.brand_name_raw,
    slime_type: body.slime_type ?? null,
    in_wishlist: true,
    in_collection: false,
    is_public: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

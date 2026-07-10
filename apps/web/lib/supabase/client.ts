// apps/web/lib/supabase/client.ts
//
// Browser-side Supabase client — singleton pattern so we never create
// more than one GoTrue client per page load (avoids memory leaks).
//
// 2026-07-09: annotate the singleton with the canonical `SupabaseClient`
// type. Previously used `ReturnType<typeof createBrowserClient>`, which
// in newer supabase-js versions collapses to `SupabaseClient<never>` and
// makes downstream methods (`.auth.getUser()`, `.from(...)`) return
// never-typed data, breaking every consumer's build. `SupabaseClient`
// without an explicit Database generic defaults to `any`, which matches
// pre-refactor behavior. Swap in a real Database type here once we
// generate them via `supabase gen types typescript`.

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  return client;
}

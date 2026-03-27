// apps/web/lib/supabase/client.ts
// Browser-side Supabase client — singleton pattern so we never create
// more than one GoTrue client per page load (avoids memory leaks).
// import type { Database } from '@/types/supabase' // uncomment when types are generated

import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  return client;
}

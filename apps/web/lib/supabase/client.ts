// apps/web/lib/supabase/client.ts
// Browser-side Supabase client — singleton pattern so we never create
// more than one GoTrue client per page load (avoids memory leaks).

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase' // generated types — adjust path if needed

let client: ReturnType<typeof createBrowserClient<Database>> | undefined

export function createClient() {
  if (client) return client

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  return client
}

// apps/web/lib/supabase/server.ts
// Server-side Supabase client — uses cookies for session persistence.
// Safe to call from Server Components, Route Handlers, and middleware.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase' // generated types — adjust path if needed

export function createClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll is called from Server Components where cookies are
            // read-only.  The middleware handles session refresh, so it's
            // safe to swallow this error here.
          }
        },
      },
    },
  )
}

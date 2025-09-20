// src/utils/supabase/client.ts (After)

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // By removing the options object, it will use the default (debug: false)
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

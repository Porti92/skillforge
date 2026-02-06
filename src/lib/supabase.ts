import { createBrowserClient } from '@supabase/ssr'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Singleton instance for browser client
let browserClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    // Server-side: create a new client each time (no singleton needed)
    return createClient(supabaseUrl, supabaseAnonKey)
  }

  // Browser-side: use singleton with cookie-based storage (matches server)
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }

  return browserClient
}

// For backwards compatibility - uses the singleton
export const supabase = typeof window !== 'undefined'
  ? getSupabaseClient()
  : createClient(supabaseUrl, supabaseAnonKey)

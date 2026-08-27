import { createClient } from '@supabase/supabase-js'

export function createSupabaseBrowserClient(supabaseUrl: string, supabaseAnonKey: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

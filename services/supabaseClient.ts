import { createClient } from '@supabase/supabase-js'

// @ts-ignore
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env.local file.')
}

// Create client with proper auth configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true
  }
})

// Export to global window object for debugging
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.supabase = supabase;
}

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

export const isSupabaseAdminService = Boolean(supabaseServiceKey)

if (!isSupabaseAdminService) {
  // Fallback: this will behave como anon y puede fallar por RLS; lo reportamos explícitamente.
  console.warn("SUPABASE_SERVICE_ROLE_KEY no definido; usando anon key (puede fallar por RLS).")
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-side only — uses service role key (never expose to client)
export const db = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
})

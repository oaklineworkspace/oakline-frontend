
import { createClient } from '@supabase/supabase-js'

// This key should only be used on the server
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://nrjdmgltshosdqccaymr.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yamRtZ2x0c2hvc2RxY2NheW1yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjAzNjIyMCwiZXhwIjoyMDcxNjEyMjIwfQ.cXKwVlQNqtAE13jrgmr2RBuIwtEbxqGsVF9SiRwqV_E'

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server-side operations.')
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

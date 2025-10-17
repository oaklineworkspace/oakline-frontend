
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('Missing SUPABASE_URL. Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')))
  throw new Error('SUPABASE_URL is required. Please set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL environment variable.')
}

if (!supabaseServiceKey) {
  console.error('Missing SUPABASE_SERVICE_KEY. Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')))
  throw new Error('SUPABASE_SERVICE_KEY is required for server-side operations. Please set it in your environment secrets.')
}

// Validate URL format
const urlPattern = /^https:\/\/[a-z0-9-]+\.supabase\.co$/
if (!urlPattern.test(supabaseUrl)) {
  console.error('Invalid Supabase URL format:', supabaseUrl)
  throw new Error(`Invalid SUPABASE_URL format: ${supabaseUrl}. Expected format: https://xxxxx.supabase.co`)
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

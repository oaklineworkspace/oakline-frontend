-- ================================================
-- USER SECURITY SETTINGS TABLE FOR OAKLINE BANK
-- ================================================
-- Run this script in your Supabase SQL Editor to create the user_security_settings table
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste and Run

-- 1. Create user_security_settings table
CREATE TABLE IF NOT EXISTS public.user_security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  twoFactorEnabled BOOLEAN DEFAULT false,
  emailAlerts BOOLEAN DEFAULT true,
  smsAlerts BOOLEAN DEFAULT false,
  loginAlerts BOOLEAN DEFAULT true,
  transactionAlerts BOOLEAN DEFAULT true,
  fraudAlerts BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_user_security_settings_user_id 
  ON public.user_security_settings(user_id);

-- 3. Create function to auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_security_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to automatically update updated_at on record changes
DROP TRIGGER IF EXISTS trigger_update_user_security_settings_updated_at ON public.user_security_settings;
CREATE TRIGGER trigger_update_user_security_settings_updated_at
  BEFORE UPDATE ON public.user_security_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_security_settings_updated_at();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.user_security_settings ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
-- Policy: Users can view their own security settings
CREATE POLICY "Users can view their own security settings"
  ON public.user_security_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own security settings
CREATE POLICY "Users can insert their own security settings"
  ON public.user_security_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own security settings
CREATE POLICY "Users can update their own security settings"
  ON public.user_security_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own security settings
CREATE POLICY "Users can delete their own security settings"
  ON public.user_security_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Optional: Create default security settings for all existing users
-- Uncomment the line below if you want to create default settings for existing users
-- INSERT INTO public.user_security_settings (user_id)
-- SELECT id FROM auth.users
-- ON CONFLICT (user_id) DO NOTHING;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
-- The user_security_settings table is now ready to use!
-- Users can now toggle their security alert preferences from the Security page.

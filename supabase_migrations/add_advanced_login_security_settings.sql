-- ================================================
-- ADVANCED LOGIN SECURITY SETTINGS - OAKLINE BANK
-- ================================================
-- This migration adds advanced login notification options and device tracking
-- Run in Supabase SQL Editor after backing up your database

-- 1. Add new columns to user_security_settings table
ALTER TABLE public.user_security_settings 
ADD COLUMN IF NOT EXISTS loginNotificationMode TEXT DEFAULT 'all' 
  CHECK (loginNotificationMode IN ('all', 'new_devices_only', 'off')),
ADD COLUMN IF NOT EXISTS requireLoginCode BOOLEAN DEFAULT false;

-- 2. Create user_devices table to track known devices
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  device_model TEXT,
  browser TEXT,
  os TEXT,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_ip_address TEXT,
  last_location TEXT,
  is_trusted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_device UNIQUE (user_id, device_fingerprint)
);

-- 3. Create login_verification_codes table for login 2FA
CREATE TABLE IF NOT EXISTS public.login_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  device_fingerprint TEXT,
  ip_address TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint ON public.user_devices(user_id, device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_login_codes_user_id ON public.login_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_login_codes_expires ON public.login_verification_codes(expires_at);

-- 5. Create function to auto-update user_devices updated_at
CREATE OR REPLACE FUNCTION update_user_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for user_devices
DROP TRIGGER IF EXISTS trigger_update_user_devices_updated_at ON public.user_devices;
CREATE TRIGGER trigger_update_user_devices_updated_at
  BEFORE UPDATE ON public.user_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_user_devices_updated_at();

-- 7. Enable Row Level Security
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_verification_codes ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for user_devices
CREATE POLICY "Users can view their own devices"
  ON public.user_devices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own devices"
  ON public.user_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own devices"
  ON public.user_devices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own devices"
  ON public.user_devices FOR DELETE
  USING (auth.uid() = user_id);

-- 9. Create RLS policies for login_verification_codes
CREATE POLICY "Users can view their own codes"
  ON public.login_verification_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert codes"
  ON public.login_verification_codes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update codes"
  ON public.login_verification_codes FOR UPDATE
  USING (true);

-- 10. Update existing user_security_settings to use new format
UPDATE public.user_security_settings
SET loginNotificationMode = CASE 
  WHEN loginAlerts = true THEN 'all'
  ELSE 'off'
END
WHERE loginNotificationMode IS NULL;

-- 11. Create function to clean up expired verification codes
CREATE OR REPLACE FUNCTION cleanup_expired_login_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM public.login_verification_codes
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
-- New features available:
-- 1. loginNotificationMode: 'all', 'new_devices_only', or 'off'
-- 2. requireLoginCode: Enable login verification codes
-- 3. user_devices: Track and manage trusted devices
-- 4. login_verification_codes: Store temporary login codes
-- ================================================

-- ================================================
-- ADD SETTINGS COLUMNS TO PROFILES TABLE
-- ================================================
-- Run this script in your Supabase SQL Editor to add settings columns
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste and Run

-- 1. Add settings columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "email_notifications": true,
  "sms_notifications": false,
  "push_notifications": true,
  "transaction_alerts": true,
  "low_balance_alerts": true,
  "security_alerts": true,
  "marketing_emails": false,
  "monthly_statements": true,
  "email_frequency": "instant",
  "login_notifications": true
}'::jsonb,
ADD COLUMN IF NOT EXISTS security_settings JSONB DEFAULT '{
  "two_factor_enabled": false,
  "biometric_login": false,
  "session_timeout": 30
}'::jsonb,
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{
  "data_sharing": false,
  "analytics_tracking": true,
  "third_party_sharing": false
}'::jsonb,
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{
  "low_balance_threshold": 100,
  "transaction_alert_amount": 500,
  "preferred_language": "en",
  "currency": "USD",
  "theme": "light",
  "statement_delivery": "email",
  "auto_save_enabled": true
}'::jsonb;

-- 2. Add indexes for better JSON query performance
CREATE INDEX IF NOT EXISTS idx_profiles_notification_settings 
  ON public.profiles USING gin (notification_settings);

CREATE INDEX IF NOT EXISTS idx_profiles_security_settings 
  ON public.profiles USING gin (security_settings);

CREATE INDEX IF NOT EXISTS idx_profiles_privacy_settings 
  ON public.profiles USING gin (privacy_settings);

CREATE INDEX IF NOT EXISTS idx_profiles_preferences 
  ON public.profiles USING gin (preferences);

-- 3. Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to automatically update updated_at on record changes (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_profiles_updated_at'
  ) THEN
    CREATE TRIGGER trigger_update_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_profiles_updated_at();
  END IF;
END $$;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
-- Settings columns have been added to the profiles table!
-- Users can now save their notification, security, privacy, and general preferences.

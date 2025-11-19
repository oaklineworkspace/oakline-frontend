
-- ================================================
-- ADD TRANSACTION PIN TO PROFILES TABLE
-- ================================================
-- Run this script in your Supabase SQL Editor to add transaction_pin column
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste and Run

-- 1. Add transaction_pin column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS transaction_pin text;

-- 2. Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_transaction_pin 
  ON public.profiles(transaction_pin) 
  WHERE transaction_pin IS NOT NULL;

-- 3. Add comment for documentation
COMMENT ON COLUMN public.profiles.transaction_pin IS 'Hashed transaction PIN for secure transaction verification';

-- ================================================
-- MIGRATION COMPLETE
-- ================================================

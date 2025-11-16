-- Add profile_picture column to profiles table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_picture text;

-- Add comment to the column
COMMENT ON COLUMN public.profiles.profile_picture IS 'URL to user profile picture stored in Supabase storage';

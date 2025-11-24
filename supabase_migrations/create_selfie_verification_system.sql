-- Create selfie verification table
CREATE TABLE IF NOT EXISTS public.selfie_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  verification_type text NOT NULL DEFAULT 'selfie' CHECK (verification_type IN ('selfie', 'video', 'liveness')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'under_review', 'approved', 'rejected', 'expired')),
  video_path text,
  image_path text,
  reason text NOT NULL,
  triggered_by text,
  triggered_at timestamp with time zone DEFAULT now(),
  submitted_at timestamp with time zone,
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
  rejection_reason text,
  admin_notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT selfie_verifications_pkey PRIMARY KEY (id),
  CONSTRAINT selfie_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT selfie_verifications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)
);

-- Add verification requirement to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS requires_verification boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_reason text,
ADD COLUMN IF NOT EXISTS verification_required_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_verified_at timestamp with time zone;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_selfie_verifications_user_id ON public.selfie_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_selfie_verifications_status ON public.selfie_verifications(status);
CREATE INDEX IF NOT EXISTS idx_profiles_requires_verification ON public.profiles(requires_verification) WHERE requires_verification = true;

-- Enable RLS
ALTER TABLE public.selfie_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own verification requests"
  ON public.selfie_verifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verification submissions"
  ON public.selfie_verifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "Users can update their own pending verifications" ON public.selfie_verifications;

-- Users should NOT be able to update verifications at all
-- All updates go through the API which uses service role
-- This prevents any client-side tampering with verification status

-- Admin policies (assuming admin_profiles table exists)
CREATE POLICY "Admins can view all verifications"
  ON public.selfie_verifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can update all verifications"
  ON public.selfie_verifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid()
    )
  );

-- Function to trigger verification requirement
CREATE OR REPLACE FUNCTION public.require_user_verification(
  p_user_id uuid,
  p_reason text,
  p_verification_type text DEFAULT 'selfie'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_verification_id uuid;
BEGIN
  -- Update profile to require verification
  UPDATE public.profiles
  SET 
    requires_verification = true,
    verification_reason = p_reason,
    verification_required_at = now(),
    updated_at = now()
  WHERE id = p_user_id;

  -- Create verification request
  INSERT INTO public.selfie_verifications (
    user_id,
    verification_type,
    reason,
    triggered_by,
    status
  ) VALUES (
    p_user_id,
    p_verification_type,
    p_reason,
    auth.uid(),
    'pending'
  ) RETURNING id INTO v_verification_id;

  RETURN v_verification_id;
END;
$$;

-- Function to approve verification
CREATE OR REPLACE FUNCTION public.approve_verification(
  p_verification_id uuid,
  p_admin_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user_id from verification
  SELECT user_id INTO v_user_id
  FROM public.selfie_verifications
  WHERE id = p_verification_id;

  -- Update verification status
  UPDATE public.selfie_verifications
  SET 
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    admin_notes = p_admin_notes,
    updated_at = now()
  WHERE id = p_verification_id;

  -- Update profile
  UPDATE public.profiles
  SET 
    requires_verification = false,
    is_verified = true,
    last_verified_at = now(),
    verification_reason = NULL,
    updated_at = now()
  WHERE id = v_user_id;

  RETURN true;
END;
$$;

-- Function to reject verification
CREATE OR REPLACE FUNCTION public.reject_verification(
  p_verification_id uuid,
  p_rejection_reason text,
  p_admin_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update verification status
  UPDATE public.selfie_verifications
  SET 
    status = 'rejected',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    rejection_reason = p_rejection_reason,
    admin_notes = p_admin_notes,
    updated_at = now()
  WHERE id = p_verification_id;

  -- Note: User still requires verification (requires_verification stays true)
  -- Admin must create a new verification request or manually update the profile

  RETURN true;
END;
$$;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_selfie_verifications_updated_at
  BEFORE UPDATE ON public.selfie_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

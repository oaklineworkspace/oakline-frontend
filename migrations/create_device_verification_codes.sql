
-- Create device_verification_codes table
CREATE TABLE IF NOT EXISTS public.device_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_code text NOT NULL,
  device_info jsonb,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_device_verification_user_id ON public.device_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_device_verification_code ON public.device_verification_codes(verification_code);

-- Enable RLS
ALTER TABLE public.device_verification_codes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own verification codes"
  ON public.device_verification_codes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert verification codes"
  ON public.device_verification_codes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update verification codes"
  ON public.device_verification_codes
  FOR UPDATE
  USING (true);

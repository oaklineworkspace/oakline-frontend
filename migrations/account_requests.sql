
-- Create account_requests table
CREATE TABLE IF NOT EXISTS public.account_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type_id INTEGER NOT NULL REFERENCES public.account_types(id),
  account_type_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_date TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  created_account_id UUID REFERENCES public.accounts(id),
  created_card_id UUID REFERENCES public.cards(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.account_requests ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own requests
CREATE POLICY "Users can view own account requests"
  ON public.account_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to create their own requests
CREATE POLICY "Users can create own account requests"
  ON public.account_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_account_requests_user_id ON public.account_requests(user_id);
CREATE INDEX idx_account_requests_status ON public.account_requests(status);
CREATE INDEX idx_account_requests_request_date ON public.account_requests(request_date DESC);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_account_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER account_requests_updated_at
  BEFORE UPDATE ON public.account_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_account_requests_updated_at();

COMMENT ON TABLE public.account_requests IS 'Stores requests from existing users for additional account types';

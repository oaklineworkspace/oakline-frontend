
-- Add deposit-related fields to loans table
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS deposit_required numeric DEFAULT 0 CHECK (deposit_required >= 0),
ADD COLUMN IF NOT EXISTS deposit_paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deposit_amount numeric DEFAULT 0 CHECK (deposit_amount >= 0),
ADD COLUMN IF NOT EXISTS deposit_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS deposit_method text CHECK (deposit_method = ANY (ARRAY['balance'::text, 'crypto'::text, 'wire'::text, 'check'::text]));

-- Add awaiting_approval status to loans table
ALTER TABLE public.loans DROP CONSTRAINT IF EXISTS loans_status_check;
ALTER TABLE public.loans ADD CONSTRAINT loans_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'awaiting_approval'::text, 'approved'::text, 'rejected'::text, 'active'::text, 'closed'::text]));

-- Add comments
COMMENT ON COLUMN public.loans.deposit_required IS 'Required deposit amount (typically 10% of principal)';
COMMENT ON COLUMN public.loans.deposit_paid IS 'Whether the required deposit has been paid';
COMMENT ON COLUMN public.loans.deposit_amount IS 'Actual amount deposited by the user';
COMMENT ON COLUMN public.loans.deposit_date IS 'Date when the deposit was made';
COMMENT ON COLUMN public.loans.deposit_method IS 'Method used for deposit payment';

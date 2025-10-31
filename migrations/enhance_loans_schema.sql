-- Enhancement migration for loans table
-- Adds fields to make the loan system function like a real bank

-- Add new columns to loans table for enhanced functionality
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS monthly_payment_amount numeric DEFAULT 0 CHECK (monthly_payment_amount >= 0),
ADD COLUMN IF NOT EXISTS total_amount numeric DEFAULT 0 CHECK (total_amount >= 0),
ADD COLUMN IF NOT EXISTS next_payment_date date,
ADD COLUMN IF NOT EXISTS last_payment_date date,
ADD COLUMN IF NOT EXISTS auto_payment_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_payment_account_id uuid REFERENCES public.accounts(id),
ADD COLUMN IF NOT EXISTS auto_payment_day integer CHECK (auto_payment_day BETWEEN 1 AND 28),
ADD COLUMN IF NOT EXISTS late_fee_amount numeric DEFAULT 0 CHECK (late_fee_amount >= 0),
ADD COLUMN IF NOT EXISTS payments_made integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_late boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS disbursed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS credit_score integer,
ADD COLUMN IF NOT EXISTS collateral_description text,
ADD COLUMN IF NOT EXISTS approval_notes text,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Add new columns to loan_payments table for enhanced tracking
ALTER TABLE public.loan_payments 
ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'regular' CHECK (payment_type = ANY (ARRAY['regular'::text, 'late_fee'::text, 'early_payoff'::text, 'auto_payment'::text, 'manual'::text])),
ADD COLUMN IF NOT EXISTS principal_amount numeric DEFAULT 0 CHECK (principal_amount >= 0),
ADD COLUMN IF NOT EXISTS interest_amount numeric DEFAULT 0 CHECK (interest_amount >= 0),
ADD COLUMN IF NOT EXISTS late_fee numeric DEFAULT 0 CHECK (late_fee >= 0),
ADD COLUMN IF NOT EXISTS balance_after numeric DEFAULT 0 CHECK (balance_after >= 0),
ADD COLUMN IF NOT EXISTS reference_number text UNIQUE DEFAULT md5(((random())::text || (clock_timestamp())::text)),
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS processed_by uuid REFERENCES auth.users(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON public.loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_next_payment_date ON public.loans(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON public.loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_payment_date ON public.loan_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_loan_payments_status ON public.loan_payments(status);

-- Add comment to document the enhancement
COMMENT ON TABLE public.loans IS 'Enhanced loans table with full banking functionality including auto-payments, amortization tracking, and late fee management';
COMMENT ON TABLE public.loan_payments IS 'Enhanced loan payments table with detailed payment breakdown and tracking';

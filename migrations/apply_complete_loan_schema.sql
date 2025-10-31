
-- Complete Loan Schema Migration
-- This adds all missing fields to make the loan system production-ready

-- ============================================================================
-- LOANS TABLE ENHANCEMENTS
-- ============================================================================

-- Add missing fields to loans table
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS purpose text,
ADD COLUMN IF NOT EXISTS remaining_balance numeric DEFAULT 0 CHECK (remaining_balance >= 0),
ADD COLUMN IF NOT EXISTS monthly_payment_amount numeric DEFAULT 0 CHECK (monthly_payment_amount >= 0),
ADD COLUMN IF NOT EXISTS total_amount numeric DEFAULT 0 CHECK (total_amount >= 0),
ADD COLUMN IF NOT EXISTS next_payment_date date,
ADD COLUMN IF NOT EXISTS last_payment_date date,
ADD COLUMN IF NOT EXISTS auto_payment_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_payment_account_id uuid REFERENCES public.accounts(id),
ADD COLUMN IF NOT EXISTS auto_payment_day integer CHECK (auto_payment_day BETWEEN 1 AND 28),
ADD COLUMN IF NOT EXISTS late_fee_amount numeric DEFAULT 0 CHECK (late_fee_amount >= 0),
ADD COLUMN IF NOT EXISTS payments_made integer DEFAULT 0 CHECK (payments_made >= 0),
ADD COLUMN IF NOT EXISTS is_late boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS disbursed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS credit_score integer CHECK (credit_score BETWEEN 300 AND 850),
ADD COLUMN IF NOT EXISTS collateral_description text,
ADD COLUMN IF NOT EXISTS approval_notes text,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- ============================================================================
-- LOAN PAYMENTS TABLE ENHANCEMENTS
-- ============================================================================

-- Add missing fields to loan_payments table
ALTER TABLE public.loan_payments 
ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'regular' CHECK (payment_type = ANY (ARRAY['regular'::text, 'late_fee'::text, 'early_payoff'::text, 'auto_payment'::text, 'manual'::text])),
ADD COLUMN IF NOT EXISTS principal_amount numeric DEFAULT 0 CHECK (principal_amount >= 0),
ADD COLUMN IF NOT EXISTS interest_amount numeric DEFAULT 0 CHECK (interest_amount >= 0),
ADD COLUMN IF NOT EXISTS late_fee numeric DEFAULT 0 CHECK (late_fee >= 0),
ADD COLUMN IF NOT EXISTS balance_after numeric DEFAULT 0 CHECK (balance_after >= 0),
ADD COLUMN IF NOT EXISTS reference_number text UNIQUE DEFAULT md5(((random())::text || (clock_timestamp())::text)),
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS processed_by uuid REFERENCES auth.users(id);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_loans_user_id ON public.loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_next_payment_date ON public.loans(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_loans_account_id ON public.loans(account_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON public.loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_payment_date ON public.loan_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_loan_payments_status ON public.loan_payments(status);

-- ============================================================================
-- SYSTEM LOGS TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  type text,
  action text,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT system_logs_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- UPDATE EXISTING LOANS
-- ============================================================================

-- Initialize remaining_balance for existing active loans
UPDATE public.loans 
SET remaining_balance = CASE
  WHEN status IN ('pending', 'approved', 'active') AND (remaining_balance IS NULL OR remaining_balance = 0) THEN 
    -- Calculate total amount based on amortization
    CASE 
      WHEN interest_rate = 0 THEN principal
      ELSE principal * ((interest_rate / 100 / 12) * POWER(1 + (interest_rate / 100 / 12), term_months)) / 
                        (POWER(1 + (interest_rate / 100 / 12), term_months) - 1) * term_months
    END - COALESCE((
      SELECT SUM(amount) 
      FROM loan_payments 
      WHERE loan_payments.loan_id = loans.id 
      AND loan_payments.status = 'completed'
    ), 0)
  WHEN status = 'closed' THEN 0
  WHEN status = 'rejected' THEN 0
  ELSE remaining_balance
END
WHERE remaining_balance IS NULL OR (remaining_balance = 0 AND status IN ('pending', 'approved', 'active'));

-- Calculate and set monthly_payment_amount for existing loans
UPDATE public.loans
SET monthly_payment_amount = CASE
  WHEN interest_rate = 0 THEN principal / term_months
  ELSE principal * ((interest_rate / 100 / 12) * POWER(1 + (interest_rate / 100 / 12), term_months)) / 
                    (POWER(1 + (interest_rate / 100 / 12), term_months) - 1)
END
WHERE monthly_payment_amount IS NULL OR monthly_payment_amount = 0;

-- Set total_amount for existing loans
UPDATE public.loans
SET total_amount = CASE
  WHEN interest_rate = 0 THEN principal
  ELSE monthly_payment_amount * term_months
END
WHERE total_amount IS NULL OR total_amount = 0;

-- Set next_payment_date for active loans without one
UPDATE public.loans
SET next_payment_date = CASE
  WHEN status = 'active' AND next_payment_date IS NULL THEN
    (start_date + INTERVAL '1 month' * (payments_made + 1))::date
  ELSE next_payment_date
END
WHERE status = 'active';

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.loans IS 'Enhanced loans table with full banking functionality including auto-payments, amortization tracking, and late fee management';
COMMENT ON TABLE public.loan_payments IS 'Enhanced loan payments table with detailed payment breakdown and tracking';
COMMENT ON COLUMN public.loans.purpose IS 'Purpose or description of the loan';
COMMENT ON COLUMN public.loans.remaining_balance IS 'Current remaining balance on the loan';
COMMENT ON COLUMN public.loans.monthly_payment_amount IS 'Calculated monthly payment amount';
COMMENT ON COLUMN public.loans.total_amount IS 'Total amount to be repaid (principal + interest)';
COMMENT ON COLUMN public.loans.next_payment_date IS 'Date of the next scheduled payment';
COMMENT ON COLUMN public.loans.last_payment_date IS 'Date of the most recent payment';
COMMENT ON COLUMN public.loans.auto_payment_enabled IS 'Whether automatic payments are enabled';
COMMENT ON COLUMN public.loans.auto_payment_account_id IS 'Account to use for auto-payments';
COMMENT ON COLUMN public.loans.auto_payment_day IS 'Day of month for auto-payments (1-28)';
COMMENT ON COLUMN public.loans.late_fee_amount IS 'Amount of late fees accrued';
COMMENT ON COLUMN public.loans.payments_made IS 'Number of payments made so far';
COMMENT ON COLUMN public.loans.is_late IS 'Whether the loan has overdue payments';
COMMENT ON COLUMN public.loans.disbursed_at IS 'When the loan funds were disbursed';
COMMENT ON COLUMN public.loans.credit_score IS 'Applicant credit score at time of application';
COMMENT ON COLUMN public.loans.collateral_description IS 'Description of loan collateral';
COMMENT ON COLUMN public.loans.approval_notes IS 'Admin notes when approving the loan';
COMMENT ON COLUMN public.loans.rejection_reason IS 'Reason for loan rejection';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Loan system schema migration completed successfully!';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Changes applied:';
  RAISE NOTICE '- Added 17 new fields to loans table';
  RAISE NOTICE '- Added 8 new fields to loan_payments table';
  RAISE NOTICE '- Created 7 performance indexes';
  RAISE NOTICE '- Updated existing loan records with calculated values';
  RAISE NOTICE '=================================================================';
END $$;

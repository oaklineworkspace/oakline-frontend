-- Migration: Add purpose and remaining_balance fields to loans table
-- Date: 2025-10-28
-- Description: Adds missing fields for loan management system

-- Add purpose field to loans table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='loans' AND column_name='purpose'
  ) THEN
    ALTER TABLE loans ADD COLUMN purpose text;
  END IF;
END $$;

-- Add remaining_balance field to loans table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='loans' AND column_name='remaining_balance'
  ) THEN
    -- Add column without default first to allow proper initialization
    ALTER TABLE loans ADD COLUMN remaining_balance numeric;
  END IF;
END $$;

-- Update existing loans to set remaining_balance based on their status
-- Only update if remaining_balance is NULL or 0 for active/pending/approved loans
-- Accounts for existing loan payments to prevent inflating balances
UPDATE loans 
SET remaining_balance = CASE
  WHEN status IN ('pending', 'approved', 'active') THEN 
    -- Calculate total due minus any existing payments
    (CASE 
      WHEN interest_rate = 0 THEN principal
      ELSE principal * ((interest_rate / 100 / 12) * POWER(1 + (interest_rate / 100 / 12), term_months)) / 
                        (POWER(1 + (interest_rate / 100 / 12), term_months) - 1) * term_months
    END) - COALESCE((
      SELECT SUM(amount) 
      FROM loan_payments 
      WHERE loan_payments.loan_id = loans.id 
      AND loan_payments.status = 'completed'
    ), 0)
  WHEN status = 'closed' THEN 0
  WHEN status = 'rejected' THEN 0
  ELSE principal
END
WHERE remaining_balance IS NULL OR (remaining_balance = 0 AND status IN ('pending', 'approved', 'active'));

-- Set default value for future inserts
DO $$ 
BEGIN
  ALTER TABLE loans ALTER COLUMN remaining_balance SET DEFAULT 0;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Create system_logs table if it doesn't exist (referenced in approval endpoint)
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  type text,
  action text,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT system_logs_pkey PRIMARY KEY (id)
);

-- Add comment to document the changes
COMMENT ON COLUMN loans.purpose IS 'Description or purpose of the loan application';
COMMENT ON COLUMN loans.remaining_balance IS 'Remaining balance to be paid on the loan';

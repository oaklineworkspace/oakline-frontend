-- Add columns to loan_payments table for cryptocurrency deposit tracking
ALTER TABLE loan_payments
ADD COLUMN IF NOT EXISTS deposit_method text CHECK (deposit_method = ANY (ARRAY['crypto'::text, 'bank_transfer'::text, 'account_balance'::text])),
ADD COLUMN IF NOT EXISTS tx_hash text,
ADD COLUMN IF NOT EXISTS fee numeric DEFAULT 0 CHECK (fee >= 0::numeric),
ADD COLUMN IF NOT EXISTS gross_amount numeric DEFAULT 0 CHECK (gross_amount >= 0::numeric),
ADD COLUMN IF NOT EXISTS proof_path text,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS confirmations integer DEFAULT 0 CHECK (confirmations >= 0),
ADD COLUMN IF NOT EXISTS required_confirmations integer DEFAULT 3 CHECK (required_confirmations >= 0),
ADD COLUMN IF NOT EXISTS is_deposit boolean DEFAULT false;

-- Update payment_type constraint to include 'deposit'
ALTER TABLE loan_payments
DROP CONSTRAINT IF EXISTS loan_payments_payment_type_check;

ALTER TABLE loan_payments
ADD CONSTRAINT loan_payments_payment_type_check 
CHECK (payment_type = ANY (ARRAY['regular'::text, 'late_fee'::text, 'early_payoff'::text, 'auto_payment'::text, 'manual'::text, 'deposit'::text]));

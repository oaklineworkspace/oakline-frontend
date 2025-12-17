
-- Add recipient first name, middle name, last name and ID number fields to oakline_pay_transactions
-- This maintains consistency with the pending_claims table

ALTER TABLE oakline_pay_transactions
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS middle_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS id_number text,
ADD COLUMN IF NOT EXISTS id_type text CHECK (id_type IS NULL OR id_type = ANY (ARRAY['passport'::text, 'national_id'::text, 'drivers_license'::text, 'other'::text]));

-- Add comment to document the purpose
COMMENT ON COLUMN oakline_pay_transactions.first_name IS 'Recipient first name for completed transaction';
COMMENT ON COLUMN oakline_pay_transactions.middle_name IS 'Recipient middle name (optional)';
COMMENT ON COLUMN oakline_pay_transactions.last_name IS 'Recipient last name for completed transaction';
COMMENT ON COLUMN oakline_pay_transactions.id_number IS 'Government-issued ID number for international users';
COMMENT ON COLUMN oakline_pay_transactions.id_type IS 'Type of ID document provided';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transactions_recipient_name ON oakline_pay_transactions(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_transactions_id_number ON oakline_pay_transactions(id_number) WHERE id_number IS NOT NULL;

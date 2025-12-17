
-- Add recipient first name, middle name, last name and ID number fields to oakline_pay_pending_claims
-- This allows international users to provide their ID card information when claiming payments

ALTER TABLE oakline_pay_pending_claims
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS middle_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS id_number text,
ADD COLUMN IF NOT EXISTS id_type text CHECK (id_type IS NULL OR id_type = ANY (ARRAY['passport'::text, 'national_id'::text, 'drivers_license'::text, 'other'::text]));

-- Add comment to document the purpose
COMMENT ON COLUMN oakline_pay_pending_claims.first_name IS 'Recipient first name for payment claim';
COMMENT ON COLUMN oakline_pay_pending_claims.middle_name IS 'Recipient middle name (optional)';
COMMENT ON COLUMN oakline_pay_pending_claims.last_name IS 'Recipient last name for payment claim';
COMMENT ON COLUMN oakline_pay_pending_claims.id_number IS 'Government-issued ID number for international users (passport, national ID, etc.)';
COMMENT ON COLUMN oakline_pay_pending_claims.id_type IS 'Type of ID document provided';

-- Create index for faster lookups by recipient name
CREATE INDEX IF NOT EXISTS idx_pending_claims_recipient_name ON oakline_pay_pending_claims(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_pending_claims_id_number ON oakline_pay_pending_claims(id_number) WHERE id_number IS NOT NULL;

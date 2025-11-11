
-- Add proof_path column to crypto_deposits table for payment proof uploads
ALTER TABLE public.crypto_deposits 
ADD COLUMN IF NOT EXISTS proof_path text;

-- Add comment to explain the column
COMMENT ON COLUMN public.crypto_deposits.proof_path 
IS 'Path to the uploaded payment proof file in Supabase Storage (screenshot or document from exchanges)';

-- Make tx_hash optional to allow proof_path as alternative verification
ALTER TABLE public.crypto_deposits 
ALTER COLUMN tx_hash DROP NOT NULL;

-- Update existing rows that have NULL tx_hash to have a placeholder
-- This ensures the constraint won't be violated
UPDATE public.crypto_deposits 
SET tx_hash = 'PENDING_VERIFICATION_' || id::text 
WHERE tx_hash IS NULL AND proof_path IS NULL;

-- Add constraint to ensure either tx_hash or proof_path is provided
ALTER TABLE public.crypto_deposits 
DROP CONSTRAINT IF EXISTS tx_hash_or_proof_required;

ALTER TABLE public.crypto_deposits 
ADD CONSTRAINT tx_hash_or_proof_required 
CHECK (tx_hash IS NOT NULL OR proof_path IS NOT NULL);


-- Add proof_path column to account_opening_crypto_deposits table
ALTER TABLE public.account_opening_crypto_deposits 
ADD COLUMN IF NOT EXISTS proof_path text;

-- Add comment to explain the column
COMMENT ON COLUMN public.account_opening_crypto_deposits.proof_path 
IS 'Path to the uploaded payment proof file in Supabase Storage';

-- Make tx_hash optional by removing UNIQUE constraint and allowing NULL
ALTER TABLE public.account_opening_crypto_deposits 
ALTER COLUMN tx_hash DROP NOT NULL;

-- Update the check to allow either tx_hash or proof_path to be provided
ALTER TABLE public.account_opening_crypto_deposits 
ADD CONSTRAINT tx_hash_or_proof_required 
CHECK (tx_hash IS NOT NULL OR proof_path IS NOT NULL);

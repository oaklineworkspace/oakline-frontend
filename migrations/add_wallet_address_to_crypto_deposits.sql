-- Add wallet_address column to crypto_deposits table if it doesn't exist
ALTER TABLE public.crypto_deposits 
ADD COLUMN IF NOT EXISTS wallet_address text;

-- Add index for wallet_address
CREATE INDEX IF NOT EXISTS idx_crypto_deposits_wallet_address 
ON public.crypto_deposits(wallet_address);

-- Add comment
COMMENT ON COLUMN public.crypto_deposits.wallet_address 
IS 'The wallet address where the user sent their crypto deposit';

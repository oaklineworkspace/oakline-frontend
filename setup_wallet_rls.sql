-- Enable RLS on user_crypto_wallets if not already enabled
ALTER TABLE public.user_crypto_wallets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own crypto wallets" ON public.user_crypto_wallets;
DROP POLICY IF EXISTS "Users can view their assigned wallets" ON public.admin_assigned_wallets;

-- Allow users to read their own wallets from user_crypto_wallets
CREATE POLICY "Users can view their own crypto wallets"
ON public.user_crypto_wallets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Enable RLS on admin_assigned_wallets if not already enabled
ALTER TABLE public.admin_assigned_wallets ENABLE ROW LEVEL SECURITY;

-- Allow users to read wallets assigned to them by admins
CREATE POLICY "Users can view their assigned wallets"
ON public.admin_assigned_wallets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);



-- Fix RLS policies for transactions table to allow users to insert their own transactions

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;

-- Allow users to view transactions for their accounts
CREATE POLICY "Users can view their own transactions"
ON public.transactions
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  account_id IN (
    SELECT id FROM public.accounts WHERE user_id = auth.uid()
  )
);

-- Allow users to insert transactions for their own accounts
CREATE POLICY "Users can insert their own transactions"
ON public.transactions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND
  account_id IN (
    SELECT id FROM public.accounts WHERE user_id = auth.uid()
  )
);

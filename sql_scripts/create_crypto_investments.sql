-- Table for users to invest in cryptocurrency
CREATE TABLE public.crypto_investments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  crypto_asset_id uuid NOT NULL,
  investment_type text DEFAULT 'hold'::text CHECK (
    investment_type = ANY (ARRAY[
      'hold'::text,
      'stake'::text,
      'liquidity_pool'::text,
      'savings'::text
    ])
  ),
  amount_invested_usd numeric NOT NULL CHECK (amount_invested_usd > 0::numeric),
  crypto_quantity numeric NOT NULL CHECK (crypto_quantity > 0::numeric),
  purchase_price_per_unit numeric NOT NULL CHECK (purchase_price_per_unit > 0::numeric),
  current_price_per_unit numeric DEFAULT 0,
  current_value_usd numeric DEFAULT 0,
  profit_loss_usd numeric DEFAULT 0,
  profit_loss_percent numeric DEFAULT 0,
  status text DEFAULT 'active'::text CHECK (
    status = ANY (ARRAY[
      'pending'::text,
      'active'::text,
      'partially_sold'::text,
      'closed'::text,
      'failed'::text
    ])
  ),
  stake_apy numeric DEFAULT 0 CHECK (stake_apy >= 0::numeric),
  earned_rewards numeric DEFAULT 0 CHECK (earned_rewards >= 0::numeric),
  lock_period_days integer DEFAULT 0 CHECK (lock_period_days >= 0),
  unlock_date timestamp with time zone,
  auto_compound boolean DEFAULT false,
  invested_at timestamp with time zone DEFAULT now(),
  closed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  
  CONSTRAINT crypto_investments_pkey PRIMARY KEY (id),
  CONSTRAINT crypto_investments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT crypto_investments_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE,
  CONSTRAINT crypto_investments_crypto_asset_id_fkey 
    FOREIGN KEY (crypto_asset_id) REFERENCES public.crypto_assets(id) ON DELETE RESTRICT
);

-- Create indexes for faster queries
CREATE INDEX idx_crypto_investments_user_id 
  ON public.crypto_investments(user_id);
CREATE INDEX idx_crypto_investments_account_id 
  ON public.crypto_investments(account_id);
CREATE INDEX idx_crypto_investments_crypto_asset_id 
  ON public.crypto_investments(crypto_asset_id);
CREATE INDEX idx_crypto_investments_status 
  ON public.crypto_investments(status);
CREATE INDEX idx_crypto_investments_investment_type 
  ON public.crypto_investments(investment_type);

-- Add comment to table
COMMENT ON TABLE public.crypto_investments IS 
  'Tracks user cryptocurrency investments including holdings, staking, and liquidity pools';

-- Create a related transaction history table for buy/sell operations
CREATE TABLE public.crypto_investment_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  crypto_investment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  transaction_type text NOT NULL CHECK (
    transaction_type = ANY (ARRAY[
      'buy'::text,
      'sell'::text,
      'stake'::text,
      'unstake'::text,
      'reward'::text,
      'fee'::text,
      'transfer_in'::text,
      'transfer_out'::text
    ])
  ),
  crypto_quantity numeric NOT NULL CHECK (crypto_quantity > 0::numeric),
  price_per_unit numeric NOT NULL CHECK (price_per_unit >= 0::numeric),
  total_amount_usd numeric NOT NULL CHECK (total_amount_usd >= 0::numeric),
  fee_amount numeric DEFAULT 0 CHECK (fee_amount >= 0::numeric),
  balance_before numeric DEFAULT 0,
  balance_after numeric DEFAULT 0,
  reference text DEFAULT md5(((random())::text || (clock_timestamp())::text)),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT crypto_investment_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT crypto_investment_transactions_crypto_investment_id_fkey 
    FOREIGN KEY (crypto_investment_id) REFERENCES public.crypto_investments(id) ON DELETE CASCADE,
  CONSTRAINT crypto_investment_transactions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT crypto_investment_transactions_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE
);

-- Create indexes for transaction history
CREATE INDEX idx_crypto_investment_transactions_investment_id 
  ON public.crypto_investment_transactions(crypto_investment_id);
CREATE INDEX idx_crypto_investment_transactions_user_id 
  ON public.crypto_investment_transactions(user_id);
CREATE INDEX idx_crypto_investment_transactions_type 
  ON public.crypto_investment_transactions(transaction_type);
CREATE INDEX idx_crypto_investment_transactions_created_at 
  ON public.crypto_investment_transactions(created_at DESC);

-- Add comment to table
COMMENT ON TABLE public.crypto_investment_transactions IS 
  'Tracks all transaction history for cryptocurrency investments (buy, sell, stake, rewards, etc.)';

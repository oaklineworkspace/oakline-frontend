-- Table for users to pay minimum deposit for account opening via cryptocurrency
CREATE TABLE public.account_opening_crypto_deposits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  application_id uuid,
  account_id uuid,
  crypto_asset_id uuid,
  assigned_wallet_id uuid,
  amount numeric DEFAULT 0 CHECK (amount >= 0::numeric),
  approved_amount numeric DEFAULT 0 CHECK (approved_amount >= 0::numeric),
  required_amount numeric DEFAULT 0 CHECK (required_amount >= 0::numeric),
  status text DEFAULT 'pending'::text CHECK (
    status = ANY (ARRAY[
      'pending'::text, 
      'awaiting_confirmations'::text, 
      'confirmed'::text, 
      'under_review'::text,
      'approved'::text,
      'completed'::text, 
      'rejected'::text,
      'failed'::text
    ])
  ),
  confirmations integer DEFAULT 0 CHECK (confirmations >= 0),
  required_confirmations integer DEFAULT 3 CHECK (required_confirmations >= 0),
  tx_hash text UNIQUE,
  memo text,
  fee numeric DEFAULT 0 CHECK (fee >= 0::numeric),
  net_amount numeric GENERATED ALWAYS AS (amount - fee) STORED,
  rejection_reason text,
  admin_notes text,
  approved_by uuid,
  rejected_by uuid,
  approved_at timestamp with time zone,
  rejected_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  
  CONSTRAINT account_opening_crypto_deposits_pkey PRIMARY KEY (id),
  CONSTRAINT account_opening_crypto_deposits_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT account_opening_crypto_deposits_application_id_fkey 
    FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE SET NULL,
  CONSTRAINT account_opening_crypto_deposits_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL,
  CONSTRAINT account_opening_crypto_deposits_crypto_asset_id_fkey 
    FOREIGN KEY (crypto_asset_id) REFERENCES public.crypto_assets(id) ON DELETE SET NULL,
  CONSTRAINT account_opening_crypto_deposits_assigned_wallet_id_fkey 
    FOREIGN KEY (assigned_wallet_id) REFERENCES public.admin_assigned_wallets(id) ON DELETE SET NULL,
  CONSTRAINT account_opening_crypto_deposits_approved_by_fkey 
    FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT account_opening_crypto_deposits_rejected_by_fkey 
    FOREIGN KEY (rejected_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index for faster queries
CREATE INDEX idx_account_opening_crypto_deposits_user_id 
  ON public.account_opening_crypto_deposits(user_id);
CREATE INDEX idx_account_opening_crypto_deposits_application_id 
  ON public.account_opening_crypto_deposits(application_id);
CREATE INDEX idx_account_opening_crypto_deposits_account_id 
  ON public.account_opening_crypto_deposits(account_id);
CREATE INDEX idx_account_opening_crypto_deposits_status 
  ON public.account_opening_crypto_deposits(status);
CREATE INDEX idx_account_opening_crypto_deposits_tx_hash 
  ON public.account_opening_crypto_deposits(tx_hash);

-- Add comment to table
COMMENT ON TABLE public.account_opening_crypto_deposits IS 
  'Tracks cryptocurrency deposits made by users for minimum account opening requirements';

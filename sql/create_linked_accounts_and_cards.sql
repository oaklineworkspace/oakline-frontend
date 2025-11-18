-- Create linked_bank_accounts table for external bank accounts
CREATE TABLE IF NOT EXISTS public.linked_bank_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_holder_name text NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  routing_number text NOT NULL CHECK (LENGTH(routing_number) = 9),
  account_type text DEFAULT 'checking'::text CHECK (account_type = ANY (ARRAY['checking'::text, 'savings'::text])),
  swift_code text,
  iban text,
  bank_address text,
  is_primary boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'suspended'::text, 'deleted'::text])),
  verification_deposits_sent_at timestamp with time zone,
  verification_amount_1 numeric(10,2),
  verification_amount_2 numeric(10,2),
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT linked_bank_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT linked_bank_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_linked_bank_accounts_user_id ON public.linked_bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_linked_bank_accounts_status ON public.linked_bank_accounts(status);

-- Add RLS policies
ALTER TABLE public.linked_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own linked bank accounts"
  ON public.linked_bank_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own linked bank accounts"
  ON public.linked_bank_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own linked bank accounts"
  ON public.linked_bank_accounts
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own linked bank accounts"
  ON public.linked_bank_accounts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create linked_debit_cards table for external debit cards
CREATE TABLE IF NOT EXISTS public.linked_debit_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cardholder_name text NOT NULL,
  card_number_last4 text NOT NULL CHECK (LENGTH(card_number_last4) = 4),
  card_brand text NOT NULL CHECK (card_brand = ANY (ARRAY['visa'::text, 'mastercard'::text, 'amex'::text, 'discover'::text])),
  expiry_month text NOT NULL CHECK (LENGTH(expiry_month) = 2),
  expiry_year text NOT NULL CHECK (LENGTH(expiry_year) = 4),
  billing_address text,
  billing_city text,
  billing_state text,
  billing_zip text,
  billing_country text DEFAULT 'United States'::text,
  is_primary boolean DEFAULT false,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'expired'::text, 'suspended'::text, 'deleted'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT linked_debit_cards_pkey PRIMARY KEY (id),
  CONSTRAINT linked_debit_cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_linked_debit_cards_user_id ON public.linked_debit_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_linked_debit_cards_status ON public.linked_debit_cards(status);

-- Add RLS policies
ALTER TABLE public.linked_debit_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own linked debit cards"
  ON public.linked_debit_cards
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own linked debit cards"
  ON public.linked_debit_cards
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own linked debit cards"
  ON public.linked_debit_cards
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own linked debit cards"
  ON public.linked_debit_cards
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE public.linked_bank_accounts IS 'Stores external bank accounts linked by users for withdrawals';
COMMENT ON TABLE public.linked_debit_cards IS 'Stores external debit cards linked by users for withdrawals';

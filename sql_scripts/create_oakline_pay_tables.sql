-- Oakline Pay: Peer-to-Peer Payment System for Oakline Bank Customers
-- Similar to Zelle, Cash App, or Venmo but exclusive to Oakline Bank

-- Table 1: Oakline Pay Profiles
-- Stores unique Oakline tags (like @username) for easy recipient lookup
CREATE TABLE public.oakline_pay_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  oakline_tag text NOT NULL UNIQUE CHECK (oakline_tag ~ '^@[a-zA-Z0-9_]{3,20}$'),
  display_name text,
  avatar_url text,
  bio text,
  is_active boolean DEFAULT true,
  is_public boolean DEFAULT true,
  allow_requests boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT oakline_pay_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT oakline_pay_profiles_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Table 2: Oakline Pay Contacts
-- Stores saved contacts for quick payments
CREATE TABLE public.oakline_pay_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_user_id uuid,
  contact_name text NOT NULL,
  contact_email text,
  contact_phone text,
  contact_oakline_tag text,
  nickname text,
  is_favorite boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT oakline_pay_contacts_pkey PRIMARY KEY (id),
  CONSTRAINT oakline_pay_contacts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT oakline_pay_contacts_contact_user_id_fkey 
    FOREIGN KEY (contact_user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT oakline_pay_contacts_unique_contact 
    UNIQUE (user_id, contact_user_id)
);

-- Table 3: Oakline Pay Transactions
-- Stores all Oakline Pay transfer history
CREATE TABLE public.oakline_pay_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  sender_account_id uuid NOT NULL,
  recipient_id uuid,
  recipient_account_id uuid,
  recipient_contact text NOT NULL,
  recipient_type text CHECK (recipient_type = ANY (ARRAY['email'::text, 'phone'::text, 'oakline_tag'::text])),
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  fee numeric DEFAULT 0 CHECK (fee >= 0::numeric),
  memo text,
  transaction_type text DEFAULT 'send'::text CHECK (transaction_type = ANY (ARRAY['send'::text, 'request'::text, 'split'::text])),
  status text DEFAULT 'pending'::text CHECK (
    status = ANY (ARRAY[
      'pending'::text,
      'processing'::text,
      'completed'::text,
      'failed'::text,
      'cancelled'::text,
      'expired'::text,
      'refunded'::text
    ])
  ),
  reference_number text UNIQUE DEFAULT md5(((random())::text || (clock_timestamp())::text)),
  verification_code text,
  verification_expires_at timestamp with time zone,
  is_verified boolean DEFAULT false,
  external_recipient boolean DEFAULT false,
  external_bank_name text,
  failure_reason text,
  sender_balance_before numeric,
  sender_balance_after numeric,
  recipient_balance_before numeric,
  recipient_balance_after numeric,
  processed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  
  CONSTRAINT oakline_pay_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT oakline_pay_transactions_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT oakline_pay_transactions_sender_account_id_fkey 
    FOREIGN KEY (sender_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE,
  CONSTRAINT oakline_pay_transactions_recipient_id_fkey 
    FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT oakline_pay_transactions_recipient_account_id_fkey 
    FOREIGN KEY (recipient_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL
);

-- Table 4: Oakline Pay Settings
-- User preferences and limits for Oakline Pay
CREATE TABLE public.oakline_pay_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  daily_limit numeric DEFAULT 5000 CHECK (daily_limit >= 0::numeric),
  monthly_limit numeric DEFAULT 25000 CHECK (monthly_limit >= 0::numeric),
  per_transaction_limit numeric DEFAULT 2500 CHECK (per_transaction_limit >= 0::numeric),
  notifications_enabled boolean DEFAULT true,
  sms_notifications boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  auto_accept_from_contacts boolean DEFAULT false,
  require_verification boolean DEFAULT true,
  allow_public_profile boolean DEFAULT true,
  allow_payment_requests boolean DEFAULT true,
  default_account_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT oakline_pay_settings_pkey PRIMARY KEY (id),
  CONSTRAINT oakline_pay_settings_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT oakline_pay_settings_default_account_id_fkey 
    FOREIGN KEY (default_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL
);

-- Table 5: Oakline Pay Requests
-- For requesting money from other users
CREATE TABLE public.oakline_pay_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  requester_account_id uuid NOT NULL,
  recipient_id uuid,
  recipient_contact text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  memo text,
  status text DEFAULT 'pending'::text CHECK (
    status = ANY (ARRAY[
      'pending'::text,
      'accepted'::text,
      'declined'::text,
      'cancelled'::text,
      'expired'::text
    ])
  ),
  reference_number text UNIQUE DEFAULT md5(((random())::text || (clock_timestamp())::text)),
  expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
  responded_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT oakline_pay_requests_pkey PRIMARY KEY (id),
  CONSTRAINT oakline_pay_requests_requester_id_fkey 
    FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT oakline_pay_requests_requester_account_id_fkey 
    FOREIGN KEY (requester_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE,
  CONSTRAINT oakline_pay_requests_recipient_id_fkey 
    FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for faster queries
CREATE INDEX idx_oakline_pay_profiles_user_id ON public.oakline_pay_profiles(user_id);
CREATE INDEX idx_oakline_pay_profiles_oakline_tag ON public.oakline_pay_profiles(oakline_tag);
CREATE INDEX idx_oakline_pay_profiles_is_active ON public.oakline_pay_profiles(is_active);

CREATE INDEX idx_oakline_pay_contacts_user_id ON public.oakline_pay_contacts(user_id);
CREATE INDEX idx_oakline_pay_contacts_contact_user_id ON public.oakline_pay_contacts(contact_user_id);
CREATE INDEX idx_oakline_pay_contacts_is_favorite ON public.oakline_pay_contacts(is_favorite);

CREATE INDEX idx_oakline_pay_transactions_sender_id ON public.oakline_pay_transactions(sender_id);
CREATE INDEX idx_oakline_pay_transactions_recipient_id ON public.oakline_pay_transactions(recipient_id);
CREATE INDEX idx_oakline_pay_transactions_status ON public.oakline_pay_transactions(status);
CREATE INDEX idx_oakline_pay_transactions_created_at ON public.oakline_pay_transactions(created_at DESC);
CREATE INDEX idx_oakline_pay_transactions_reference_number ON public.oakline_pay_transactions(reference_number);

CREATE INDEX idx_oakline_pay_settings_user_id ON public.oakline_pay_settings(user_id);

CREATE INDEX idx_oakline_pay_requests_requester_id ON public.oakline_pay_requests(requester_id);
CREATE INDEX idx_oakline_pay_requests_recipient_id ON public.oakline_pay_requests(recipient_id);
CREATE INDEX idx_oakline_pay_requests_status ON public.oakline_pay_requests(status);

-- Add comments to tables
COMMENT ON TABLE public.oakline_pay_profiles IS 
  'User profiles for Oakline Pay with unique @tags for easy recipient lookup';
COMMENT ON TABLE public.oakline_pay_contacts IS 
  'Saved contacts for quick Oakline Pay transfers';
COMMENT ON TABLE public.oakline_pay_transactions IS 
  'Complete history of Oakline Pay peer-to-peer transactions';
COMMENT ON TABLE public.oakline_pay_settings IS 
  'User preferences and transfer limits for Oakline Pay';
COMMENT ON TABLE public.oakline_pay_requests IS 
  'Money requests sent through Oakline Pay';

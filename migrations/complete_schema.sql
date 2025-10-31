
-- =============================================================================
-- Oakline Bank Complete Database Schema
-- This file contains all necessary tables, functions, and policies
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- =============================================================================
-- ADMIN AND BANK DETAILS TABLES
-- =============================================================================

-- Admin profiles table
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  role text DEFAULT 'admin'::text CHECK (role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'manager'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_profiles_pkey PRIMARY KEY (id)
);

-- Bank details table
CREATE TABLE IF NOT EXISTS public.bank_details (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bank_name text DEFAULT 'Oakline Bank'::text,
  routing_number text DEFAULT '075915826'::text,
  swift_code text DEFAULT 'OAKLUS33'::text,
  address text,
  phone text,
  email text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bank_details_pkey PRIMARY KEY (id)
);

-- System logs table
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  type text,
  action text,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT system_logs_pkey PRIMARY KEY (id)
);

-- =============================================================================
-- USER APPLICATIONS AND ACCOUNTS
-- =============================================================================

-- Applications table
CREATE TABLE IF NOT EXISTS public.applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  date_of_birth date,
  ssn text,
  address text,
  city text,
  state text,
  zip_code text,
  account_type text NOT NULL,
  initial_deposit numeric DEFAULT 0,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT applications_pkey PRIMARY KEY (id)
);

-- Accounts table
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  application_id uuid REFERENCES public.applications(id),
  account_number text NOT NULL UNIQUE,
  routing_number text DEFAULT '075915826'::text,
  account_type text NOT NULL,
  balance numeric DEFAULT 0 CHECK (balance >= 0::numeric),
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'closed'::text, 'suspended'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT accounts_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id)
);

-- User profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  date_of_birth date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_user_id_key UNIQUE (user_id)
);

-- =============================================================================
-- TRANSACTIONS AND TRANSFERS
-- =============================================================================

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.accounts(id),
  user_id uuid REFERENCES auth.users(id),
  type text NOT NULL,
  amount numeric NOT NULL,
  balance_after numeric,
  description text,
  status text DEFAULT 'completed'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transactions_pkey PRIMARY KEY (id)
);

-- Transfers table
CREATE TABLE IF NOT EXISTS public.transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  from_account_id uuid REFERENCES public.accounts(id),
  to_account_id uuid REFERENCES public.accounts(id),
  amount numeric NOT NULL,
  description text,
  status text DEFAULT 'pending'::text,
  transfer_group_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transfers_pkey PRIMARY KEY (id)
);

-- Zelle transactions table
CREATE TABLE IF NOT EXISTS public.zelle_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  account_id uuid REFERENCES public.accounts(id),
  recipient_email text,
  recipient_phone text,
  recipient_name text,
  amount numeric NOT NULL,
  memo text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])),
  transaction_type text DEFAULT 'send'::text CHECK (transaction_type = ANY (ARRAY['send'::text, 'receive'::text, 'request'::text])),
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT zelle_transactions_pkey PRIMARY KEY (id)
);

-- =============================================================================
-- LOANS
-- =============================================================================

-- Loans table
CREATE TABLE IF NOT EXISTS public.loans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  account_id uuid REFERENCES public.accounts(id),
  loan_type text NOT NULL,
  principal numeric NOT NULL,
  interest_rate numeric NOT NULL,
  term_months integer NOT NULL,
  monthly_payment numeric,
  purpose text,
  remaining_balance numeric DEFAULT 0,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'active'::text, 'closed'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  approved_at timestamp with time zone,
  CONSTRAINT loans_pkey PRIMARY KEY (id)
);

-- Loan payments table
CREATE TABLE IF NOT EXISTS public.loan_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES public.loans(id),
  amount numeric NOT NULL,
  payment_date timestamp with time zone DEFAULT now(),
  status text DEFAULT 'completed'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT loan_payments_pkey PRIMARY KEY (id)
);

-- =============================================================================
-- CARDS
-- =============================================================================

-- Cards table
CREATE TABLE IF NOT EXISTS public.cards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  account_id uuid REFERENCES public.accounts(id),
  card_type text NOT NULL,
  card_number text NOT NULL,
  cvv text NOT NULL,
  expiry_date text NOT NULL,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'blocked'::text, 'expired'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cards_pkey PRIMARY KEY (id)
);

-- Card applications table
CREATE TABLE IF NOT EXISTS public.card_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  card_type text NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT card_applications_pkey PRIMARY KEY (id)
);

-- =============================================================================
-- NOTIFICATIONS AND MESSAGES
-- =============================================================================

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info'::text,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  subject text NOT NULL,
  message text NOT NULL,
  from_admin boolean DEFAULT false,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id)
);

-- =============================================================================
-- INITIAL DATA
-- =============================================================================

-- Insert default bank details if not exists
INSERT INTO public.bank_details (bank_name, routing_number, swift_code, address, phone, email)
SELECT 'Oakline Bank', '075915826', 'OAKLUS33', 
       '123 Main Street, New York, NY 10001', 
       '1-800-OAKLINE', 
       'info@oaklinebank.com'
WHERE NOT EXISTS (SELECT 1 FROM public.bank_details LIMIT 1);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zelle_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Bank details policies (read only for authenticated users)
CREATE POLICY "Allow authenticated users to read bank details" ON public.bank_details
  FOR SELECT USING (auth.role() = 'authenticated');

-- User profiles policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Accounts policies
CREATE POLICY "Users can view own accounts" ON public.accounts
  FOR SELECT USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Loans policies
CREATE POLICY "Users can view own loans" ON public.loans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loan applications" ON public.loans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Cards policies
CREATE POLICY "Users can view own cards" ON public.cards
  FOR SELECT USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT USING (auth.uid() = user_id);

-- Zelle transactions policies
CREATE POLICY "Users can view own zelle transactions" ON public.zelle_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own zelle transactions" ON public.zelle_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON COLUMN loans.purpose IS 'Description or purpose of the loan application';
COMMENT ON COLUMN loans.remaining_balance IS 'Remaining balance to be paid on the loan';

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Oakline Bank database schema created successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Add your first super admin user in the admin_profiles table';
  RAISE NOTICE '2. Test your application endpoints';
END $$;

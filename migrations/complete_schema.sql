
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
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  role text DEFAULT 'admin'::text CHECK (role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'manager'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT admin_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- Bank details table
CREATE TABLE IF NOT EXISTS public.bank_details (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Oakline Bank'::text,
  branch_name text NOT NULL DEFAULT 'Oklahoma City Branch'::text,
  address text NOT NULL DEFAULT '12201 N May Avenue, Oklahoma City, OK 73120, United States'::text,
  phone text NOT NULL DEFAULT '+1 (636) 635-6122'::text,
  email_info text NOT NULL DEFAULT 'info@theoaklinebank.com'::text,
  email_contact text NOT NULL DEFAULT 'contact-us@theoaklinebank.com'::text,
  email_notify text NOT NULL DEFAULT 'notify@theoaklinebank.com'::text,
  email_updates text NOT NULL DEFAULT 'updates@theoaklinebank.com'::text,
  email_welcome text NOT NULL DEFAULT 'welcome@theoaklinebank.com'::text,
  routing_number text NOT NULL DEFAULT '075915826'::text,
  swift_code text NOT NULL DEFAULT 'OAKLUS33'::text,
  nmls_id text NOT NULL DEFAULT '574160'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bank_details_pkey PRIMARY KEY (id)
);

-- System logs table
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  level text CHECK (level = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text])),
  type text CHECK (type = ANY (ARRAY['auth'::text, 'transaction'::text, 'system'::text, 'card'::text, 'user'::text])),
  message text NOT NULL,
  details jsonb,
  user_id uuid,
  admin_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT system_logs_pkey PRIMARY KEY (id),
  CONSTRAINT system_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT system_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id)
);

-- =============================================================================
-- USER APPLICATIONS AND ACCOUNTS
-- =============================================================================

-- Applications table
CREATE TABLE IF NOT EXISTS public.applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  first_name text NOT NULL,
  last_name text NOT NULL,
  middle_name text,
  email text NOT NULL UNIQUE,
  phone text,
  date_of_birth date,
  country text,
  ssn text,
  id_number text,
  address text,
  city text,
  state text,
  zip_code text,
  employment_status text,
  annual_income text,
  account_types ARRAY,
  mothers_maiden_name text,
  agree_to_terms boolean DEFAULT false,
  application_status text DEFAULT 'pending'::text CHECK (application_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'under_review'::text, 'completed'::text])),
  created_by_admin boolean DEFAULT false,
  submitted_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  manual_account_number text,
  chosen_account_type text DEFAULT 'checking'::text CHECK (chosen_account_type = ANY (ARRAY['checking'::text, 'savings'::text, 'credit'::text])),
  chosen_card_brand text DEFAULT 'visa'::text CHECK (chosen_card_brand = ANY (ARRAY['visa'::text, 'mastercard'::text, 'amex'::text])),
  chosen_card_category text DEFAULT 'debit'::text CHECK (chosen_card_category = ANY (ARRAY['debit'::text, 'credit'::text])),
  CONSTRAINT applications_pkey PRIMARY KEY (id),
  CONSTRAINT applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Accounts table
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  application_id uuid,
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
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  email text UNIQUE,
  first_name text,
  middle_name text,
  last_name text,
  phone text,
  date_of_birth date,
  country text,
  city text,
  state text,
  zip_code text,
  address text,
  ssn text,
  id_number text,
  employment_status text,
  annual_income text,
  mothers_maiden_name text,
  account_types ARRAY,
  enrollment_completed boolean DEFAULT false,
  password_set boolean DEFAULT false,
  application_status text DEFAULT 'pending'::text CHECK (application_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'completed'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  enrollment_completed_at timestamp with time zone,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- =============================================================================
-- TRANSACTIONS AND TRANSFERS
-- =============================================================================

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  account_id uuid,
  type text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  description text,
  reference text DEFAULT md5(((random())::text || (clock_timestamp())::text)) UNIQUE,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'reversal'::text, 'hold'::text, 'reversed'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  balance_before numeric,
  balance_after numeric,
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);

-- Zelle transactions table
CREATE TABLE IF NOT EXISTS public.zelle_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid,
  sender_account_id uuid,
  recipient_contact text,
  recipient_user_id uuid,
  amount numeric CHECK (amount > 0::numeric),
  memo text,
  transaction_type text CHECK (transaction_type = ANY (ARRAY['send'::text, 'request'::text])),
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'expired'::text])),
  reference_number text UNIQUE,
  processed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT zelle_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT zelle_transactions_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id),
  CONSTRAINT zelle_transactions_sender_account_id_fkey FOREIGN KEY (sender_account_id) REFERENCES public.accounts(id),
  CONSTRAINT zelle_transactions_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES auth.users(id)
);

-- Zelle contacts table
CREATE TABLE IF NOT EXISTS public.zelle_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  email text,
  phone text,
  is_verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  nickname text,
  CONSTRAINT zelle_contacts_pkey PRIMARY KEY (id),
  CONSTRAINT zelle_contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Zelle settings table
CREATE TABLE IF NOT EXISTS public.zelle_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  daily_limit numeric DEFAULT 2500 CHECK (daily_limit >= 0::numeric),
  monthly_limit numeric DEFAULT 20000 CHECK (monthly_limit >= 0::numeric),
  notifications_enabled boolean DEFAULT true,
  sms_notifications boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  auto_accept_from_contacts boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  notification_enabled boolean DEFAULT true,
  CONSTRAINT zelle_settings_pkey PRIMARY KEY (id),
  CONSTRAINT zelle_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- =============================================================================
-- LOANS
-- =============================================================================

-- Loans table
CREATE TABLE IF NOT EXISTS public.loans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  account_id uuid,
  loan_type text,
  principal numeric NOT NULL CHECK (principal >= 0::numeric),
  interest_rate numeric NOT NULL CHECK (interest_rate >= 0::numeric),
  term_months integer NOT NULL CHECK (term_months > 0),
  start_date date DEFAULT now(),
  purpose text,
  remaining_balance numeric DEFAULT 0,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'active'::text, 'closed'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT loans_pkey PRIMARY KEY (id),
  CONSTRAINT loans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT loans_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);

-- Loan payments table
CREATE TABLE IF NOT EXISTS public.loan_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  loan_id uuid,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  payment_date date DEFAULT now(),
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT loan_payments_pkey PRIMARY KEY (id),
  CONSTRAINT loan_payments_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id)
);

-- =============================================================================
-- CARDS
-- =============================================================================

-- Cards table
CREATE TABLE IF NOT EXISTS public.cards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  account_id uuid,
  card_number text NOT NULL UNIQUE,
  card_type text DEFAULT 'debit'::text CHECK (card_type = ANY (ARRAY['visa'::text, 'mastercard'::text, 'amex'::text, 'debit'::text, 'credit'::text])),
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'blocked'::text, 'expired'::text, 'replaced'::text, 'suspended'::text, 'deactivated'::text])),
  expiry_date date,
  daily_limit numeric DEFAULT 5000,
  monthly_limit numeric DEFAULT 20000,
  daily_spent numeric DEFAULT 0,
  monthly_spent numeric DEFAULT 0,
  pin_hash text,
  is_locked boolean DEFAULT false,
  cvc text CHECK (cvc ~ '^[0-9]{3,4}$'::text),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  activated_at timestamp with time zone DEFAULT now(),
  credit_limit numeric DEFAULT 0 CHECK (credit_limit >= 0::numeric),
  contactless boolean DEFAULT false,
  requires_3d_secure boolean DEFAULT true,
  tokenized boolean DEFAULT false,
  card_brand text DEFAULT 'visa'::text CHECK (card_brand = ANY (ARRAY['visa'::text, 'mastercard'::text, 'amex'::text])),
  card_category text DEFAULT 'debit'::text CHECK (card_category = ANY (ARRAY['debit'::text, 'credit'::text])),
  CONSTRAINT cards_pkey PRIMARY KEY (id),
  CONSTRAINT cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT cards_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);

-- Card applications table
CREATE TABLE IF NOT EXISTS public.card_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  account_id uuid,
  card_type text DEFAULT 'debit'::text,
  application_status text DEFAULT 'pending'::text CHECK (application_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'under_review'::text])),
  requested_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  CONSTRAINT card_applications_pkey PRIMARY KEY (id),
  CONSTRAINT card_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT card_applications_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);

-- Card transactions table
CREATE TABLE IF NOT EXISTS public.card_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  card_id uuid,
  transaction_type text,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  merchant text,
  location text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT card_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT card_transactions_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id)
);

-- Card activity log table
CREATE TABLE IF NOT EXISTS public.card_activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  card_id uuid,
  user_id uuid,
  old_card_number text,
  new_card_number text,
  action text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT card_activity_log_pkey PRIMARY KEY (id)
);

-- =============================================================================
-- NOTIFICATIONS AND MESSAGES
-- =============================================================================

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  type text,
  title text,
  message text,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- =============================================================================
-- ADDITIONAL TABLES
-- =============================================================================

-- Check deposits table
CREATE TABLE IF NOT EXISTS public.check_deposits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  check_number text,
  check_front_image text,
  check_back_image text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'processing'::text])),
  rejection_reason text,
  processed_by uuid,
  processed_at timestamp with time zone,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT check_deposits_pkey PRIMARY KEY (id),
  CONSTRAINT check_deposits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT check_deposits_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT check_deposits_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id)
);

-- Email verifications table
CREATE TABLE IF NOT EXISTS public.email_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  verification_token text NOT NULL,
  verified_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  verification_code text,
  CONSTRAINT email_verifications_pkey PRIMARY KEY (id)
);

-- Enrollments table
CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  token text NOT NULL,
  is_used boolean DEFAULT false,
  click_count integer DEFAULT 0,
  application_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT enrollments_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id)
);

-- Password reset OTPs table
CREATE TABLE IF NOT EXISTS public.password_reset_otps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  otp text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT password_reset_otps_pkey PRIMARY KEY (id)
);

-- Email queue table
CREATE TABLE IF NOT EXISTS public.email_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  sent boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_queue_pkey PRIMARY KEY (id),
  CONSTRAINT email_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Branches table
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  address text,
  city text,
  state text,
  zip_code text,
  phone text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT branches_pkey PRIMARY KEY (id)
);

-- Beneficiaries table
CREATE TABLE IF NOT EXISTS public.beneficiaries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  email text,
  phone text,
  account_number text,
  bank_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT beneficiaries_pkey PRIMARY KEY (id),
  CONSTRAINT beneficiaries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Bill payments table
CREATE TABLE IF NOT EXISTS public.bill_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  beneficiary_id uuid,
  biller_name text NOT NULL,
  category text CHECK (category = ANY (ARRAY['utilities'::text, 'internet'::text, 'insurance'::text, 'loan'::text, 'credit_card'::text, 'other'::text])),
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  due_date date,
  scheduled_date date,
  payment_status text DEFAULT 'pending'::text CHECK (payment_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])),
  reference text DEFAULT md5(((random())::text || (clock_timestamp())::text)),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bill_payments_pkey PRIMARY KEY (id),
  CONSTRAINT bill_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT bill_payments_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT bill_payments_beneficiary_id_fkey FOREIGN KEY (beneficiary_id) REFERENCES public.beneficiaries(id)
);

-- Investment products table
CREATE TABLE IF NOT EXISTS public.investment_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text CHECK (type = ANY (ARRAY['stock'::text, 'mutual_fund'::text, 'bond'::text, 'crypto'::text, 'etf'::text, 'other'::text])),
  description text,
  risk_level text CHECK (risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
  annual_return numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT investment_products_pkey PRIMARY KEY (id)
);

-- Investments table
CREATE TABLE IF NOT EXISTS public.investments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  product_id uuid NOT NULL,
  amount_invested numeric NOT NULL CHECK (amount_invested > 0::numeric),
  current_value numeric DEFAULT 0,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'closed'::text, 'pending'::text, 'failed'::text])),
  invested_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT investments_pkey PRIMARY KEY (id),
  CONSTRAINT investments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT investments_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT investments_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.investment_products(id)
);

-- Investment transactions table
CREATE TABLE IF NOT EXISTS public.investment_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  investment_id uuid NOT NULL,
  type text CHECK (type = ANY (ARRAY['buy'::text, 'sell'::text, 'dividend'::text, 'interest'::text, 'fee'::text])),
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT investment_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT investment_transactions_investment_id_fkey FOREIGN KEY (investment_id) REFERENCES public.investments(id)
);

-- Plaid items table
CREATE TABLE IF NOT EXISTS public.plaid_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id text NOT NULL UNIQUE,
  access_token text NOT NULL,
  institution_id text,
  institution_name text,
  cursor text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT plaid_items_pkey PRIMARY KEY (id),
  CONSTRAINT plaid_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Plaid accounts table
CREATE TABLE IF NOT EXISTS public.plaid_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plaid_item_id uuid NOT NULL,
  account_id text NOT NULL UNIQUE,
  name text NOT NULL,
  official_name text,
  type text,
  subtype text,
  mask text,
  available_balance numeric,
  current_balance numeric,
  iso_currency_code text DEFAULT 'USD'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT plaid_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT plaid_accounts_plaid_item_id_fkey FOREIGN KEY (plaid_item_id) REFERENCES public.plaid_items(id)
);

-- Staff table
CREATE TABLE IF NOT EXISTS public.staff (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  first_name text,
  last_name text,
  email text UNIQUE,
  role text DEFAULT 'teller'::text,
  branch_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_pkey PRIMARY KEY (id),
  CONSTRAINT staff_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action text,
  table_name text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- =============================================================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- =============================================================================

-- Add purpose and remaining_balance to loans table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='loans' AND column_name='purpose'
  ) THEN
    ALTER TABLE public.loans ADD COLUMN purpose text;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='loans' AND column_name='remaining_balance'
  ) THEN
    ALTER TABLE public.loans ADD COLUMN remaining_balance numeric DEFAULT 0;
  END IF;
END $$;

-- =============================================================================
-- INITIAL DATA
-- =============================================================================

-- Insert default bank details if not exists
INSERT INTO public.bank_details (
  name, branch_name, address, phone, 
  email_info, email_contact, email_notify, email_updates, email_welcome,
  routing_number, swift_code, nmls_id
)
SELECT 
  'Oakline Bank', 
  'Oklahoma City Branch',
  '12201 N May Avenue, Oklahoma City, OK 73120, United States',
  '+1 (636) 635-6122',
  'info@theoaklinebank.com',
  'contact-us@theoaklinebank.com',
  'notify@theoaklinebank.com',
  'updates@theoaklinebank.com',
  'welcome@theoaklinebank.com',
  '075915826',
  'OAKLUS33',
  '574160'
WHERE NOT EXISTS (SELECT 1 FROM public.bank_details LIMIT 1);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zelle_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zelle_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zelle_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Bank details policies (read only for authenticated users)
DROP POLICY IF EXISTS "Allow authenticated users to read bank details" ON public.bank_details;
CREATE POLICY "Allow authenticated users to read bank details" ON public.bank_details
  FOR SELECT USING (auth.role() = 'authenticated');

-- User profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Accounts policies
DROP POLICY IF EXISTS "Users can view own accounts" ON public.accounts;
CREATE POLICY "Users can view own accounts" ON public.accounts
  FOR SELECT USING (auth.uid() = user_id);

-- Transactions policies
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Loans policies
DROP POLICY IF EXISTS "Users can view own loans" ON public.loans;
CREATE POLICY "Users can view own loans" ON public.loans
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own loan applications" ON public.loans;
CREATE POLICY "Users can insert own loan applications" ON public.loans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Cards policies
DROP POLICY IF EXISTS "Users can view own cards" ON public.cards;
CREATE POLICY "Users can view own cards" ON public.cards
  FOR SELECT USING (auth.uid() = user_id);

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Zelle transactions policies
DROP POLICY IF EXISTS "Users can view own zelle transactions" ON public.zelle_transactions;
CREATE POLICY "Users can view own zelle transactions" ON public.zelle_transactions
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_user_id);

DROP POLICY IF EXISTS "Users can insert own zelle transactions" ON public.zelle_transactions;
CREATE POLICY "Users can insert own zelle transactions" ON public.zelle_transactions
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Zelle contacts policies
DROP POLICY IF EXISTS "Users can manage own zelle contacts" ON public.zelle_contacts;
CREATE POLICY "Users can manage own zelle contacts" ON public.zelle_contacts
  FOR ALL USING (auth.uid() = user_id);

-- Zelle settings policies
DROP POLICY IF EXISTS "Users can manage own zelle settings" ON public.zelle_settings;
CREATE POLICY "Users can manage own zelle settings" ON public.zelle_settings
  FOR ALL USING (auth.uid() = user_id);

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
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Oakline Bank database schema created successfully!';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Add your first super admin user in the admin_profiles table';
  RAISE NOTICE '2. Test your application endpoints';
  RAISE NOTICE '3. Verify all RLS policies are working correctly';
  RAISE NOTICE '=================================================================';
END $$;

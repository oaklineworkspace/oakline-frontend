
-- Create account_types table
CREATE TABLE IF NOT EXISTS public.account_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  rate TEXT NOT NULL,
  category TEXT NOT NULL,
  min_deposit NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.account_types ENABLE ROW LEVEL SECURITY;

-- Allow public read access to account types
CREATE POLICY "Allow public read access to account types"
  ON public.account_types
  FOR SELECT
  TO public
  USING (true);

-- Insert all 23 account types from apply.js
INSERT INTO public.account_types (name, description, icon, rate, category, min_deposit) VALUES
  ('Checking Account', 'Perfect for everyday banking needs', '💳', '0.01% APY', 'Personal', 25),
  ('Savings Account', 'Grow your money with competitive rates', '💰', '4.50% APY', 'Personal', 100),
  ('Business Checking', 'Designed for business operations', '🏢', '0.01% APY', 'Business', 500),
  ('Business Savings', 'Business savings with higher yields', '🏦', '4.25% APY', 'Business', 1000),
  ('Student Checking', 'No-fee checking for students', '🎓', '0.01% APY', 'Personal', 0),
  ('Money Market Account', 'Premium savings with higher yields', '📈', '4.75% APY', 'Personal', 2500),
  ('Certificate of Deposit (CD)', 'Secure your future with fixed rates', '🔒', '5.25% APY', 'Personal', 1000),
  ('Retirement Account (IRA)', 'Plan for your retirement', '🏖️', '4.80% APY', 'Investment', 500),
  ('Joint Checking Account', 'Shared checking for couples', '👫', '0.01% APY', 'Personal', 25),
  ('Trust Account', 'Manage assets for beneficiaries', '🛡️', '3.50% APY', 'Premium', 10000),
  ('Investment Brokerage Account', 'Trade stocks, bonds, and more', '📊', 'Variable', 'Investment', 1000),
  ('High-Yield Savings Account', 'Maximum earning potential', '💎', '5.00% APY', 'Personal', 500),
  ('International Checking', 'Banking without borders', '🌍', '0.01% APY', 'Specialized', 100),
  ('Foreign Currency Account', 'Hold multiple currencies', '💱', 'Variable', 'Specialized', 500),
  ('Cryptocurrency Wallet', 'Digital asset storage', '₿', 'Variable', 'Investment', 100),
  ('Loan Repayment Account', 'Streamline your loan payments', '💳', 'N/A', 'Specialized', 0),
  ('Mortgage Account', 'Home financing solutions', '🏠', 'Variable', 'Specialized', 0),
  ('Auto Loan Account', 'Vehicle financing made easy', '🚗', 'Variable', 'Specialized', 0),
  ('Credit Card Account', 'Flexible spending power', '💳', 'Variable APR', 'Specialized', 0),
  ('Prepaid Card Account', 'Controlled spending solution', '🎫', 'N/A', 'Specialized', 0),
  ('Payroll Account', 'Direct deposit convenience', '💼', '0.01% APY', 'Business', 0),
  ('Nonprofit/Charity Account', 'Special rates for nonprofits', '❤️', '2.50% APY', 'Business', 250),
  ('Escrow Account', 'Secure transaction holding', '🔐', '1.50% APY', 'Specialized', 500);

-- Create index for faster lookups
CREATE INDEX idx_account_types_category ON public.account_types(category);
CREATE INDEX idx_account_types_name ON public.account_types(name);

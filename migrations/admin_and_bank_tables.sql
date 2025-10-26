-- =============================================================================
-- OAKLINE BANK - ADMIN PROFILES AND BANK DETAILS MIGRATION
-- =============================================================================
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- Create admin_profiles table for role-based access control
CREATE TABLE IF NOT EXISTS admin_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'super_admin', 'manager')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_profiles_user_id ON admin_profiles(user_id);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_profiles_email ON admin_profiles(email);

-- Enable Row Level Security
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Only super_admins can view all admin profiles
CREATE POLICY "Super admins can view all admin profiles"
  ON admin_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.user_id = auth.uid()
      AND ap.role = 'super_admin'
    )
  );

-- Policy: Users can view their own admin profile
CREATE POLICY "Users can view their own admin profile"
  ON admin_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Only super_admins can insert admin profiles
CREATE POLICY "Super admins can insert admin profiles"
  ON admin_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.user_id = auth.uid()
      AND ap.role = 'super_admin'
    )
  );

-- Policy: Only super_admins can update admin profiles
CREATE POLICY "Super admins can update admin profiles"
  ON admin_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.user_id = auth.uid()
      AND ap.role = 'super_admin'
    )
  );

-- Create bank_details table
CREATE TABLE IF NOT EXISTS bank_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  routing_number TEXT NOT NULL,
  swift_code TEXT NOT NULL,
  fdic_insured_amount TEXT DEFAULT 'Up to $250,000',
  nmls_id TEXT DEFAULT '482917',
  bank_name TEXT DEFAULT 'Oakline Bank',
  bank_phone TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE bank_details ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view bank details
CREATE POLICY "Authenticated users can view bank details"
  ON bank_details
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Only admins can insert bank details
CREATE POLICY "Admins can insert bank details"
  ON bank_details
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.user_id = auth.uid()
      AND ap.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Only admins can update bank details
CREATE POLICY "Admins can update bank details"
  ON bank_details
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.user_id = auth.uid()
      AND ap.role IN ('admin', 'super_admin')
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_profiles_updated_at
  BEFORE UPDATE ON admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_details_updated_at
  BEFORE UPDATE ON bank_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default bank details (you can modify these values)
INSERT INTO bank_details (routing_number, swift_code, nmls_id, bank_name, bank_phone, is_public)
VALUES ('075915826', 'OAKLUS33', '482917', 'Oakline Bank', '1-800-OAKLINE', false)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- IMPORTANT: After running this migration, you need to manually add your 
-- first super_admin user in the Supabase dashboard:
--
-- INSERT INTO admin_profiles (user_id, email, role)
-- VALUES ('your-user-id-from-auth-users-table', 'your-email@domain.com', 'super_admin');
--
-- Replace 'your-user-id-from-auth-users-table' with your actual user ID
-- from the auth.users table.
-- =============================================================================

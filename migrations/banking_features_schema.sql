-- ============================================================================
-- OAKLINE BANK - ENHANCED BANKING FEATURES SCHEMA
-- Features: Zelle, Wire Transfers, Mobile Check Deposits, Transfer Grouping
-- ============================================================================

-- ============================================================================
-- 0. TRANSACTIONS TABLE ENHANCEMENT (Transfer Grouping)
-- ============================================================================

-- Add transfer_group_id to existing transactions table if not exists
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS transfer_group_id UUID,
ADD COLUMN IF NOT EXISTS transfer_type TEXT CHECK (transfer_type IN ('internal', 'external', 'wire', 'zelle'));

CREATE INDEX IF NOT EXISTS idx_transactions_transfer_group ON transactions(transfer_group_id);

-- ============================================================================
-- OAKLINE BANK - ENHANCED BANKING FEATURES SCHEMA
-- Features: Zelle, Wire Transfers, Mobile Check Deposits
-- ============================================================================

-- ============================================================================
-- 1. ZELLE ENHANCED SCHEMA
-- ============================================================================

-- Zelle Contacts Table
CREATE TABLE IF NOT EXISTS zelle_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  nickname TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT zelle_contacts_contact_check CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_zelle_contacts_user_id ON zelle_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_zelle_contacts_email ON zelle_contacts(email);
CREATE INDEX IF NOT EXISTS idx_zelle_contacts_phone ON zelle_contacts(phone);

-- Zelle Settings Table
CREATE TABLE IF NOT EXISTS zelle_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  daily_limit NUMERIC(12, 2) DEFAULT 2500,
  monthly_limit NUMERIC(12, 2) DEFAULT 20000,
  is_enrolled BOOLEAN DEFAULT FALSE,
  enrolled_at TIMESTAMP WITH TIME ZONE,
  notification_enabled BOOLEAN DEFAULT TRUE,
  require_verification BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zelle_settings_user_id ON zelle_settings(user_id);

-- Zelle Transactions Table
CREATE TABLE IF NOT EXISTS zelle_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_account_id UUID REFERENCES accounts(id),
  recipient_user_id UUID REFERENCES auth.users(id),
  recipient_contact TEXT NOT NULL,
  recipient_name TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  memo TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  transaction_type TEXT DEFAULT 'send' CHECK (transaction_type IN ('send', 'receive', 'request')),
  verification_code TEXT,
  verification_expires_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zelle_transactions_sender ON zelle_transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_zelle_transactions_recipient ON zelle_transactions(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_zelle_transactions_status ON zelle_transactions(status);
CREATE INDEX IF NOT EXISTS idx_zelle_transactions_created ON zelle_transactions(created_at DESC);

-- ============================================================================
-- 2. WIRE TRANSFERS SCHEMA
-- ============================================================================

-- Wire Transfers Table
CREATE TABLE IF NOT EXISTS wire_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_account_id UUID NOT NULL REFERENCES accounts(id),
  beneficiary_name TEXT NOT NULL,
  beneficiary_bank TEXT NOT NULL,
  routing_number TEXT NOT NULL,
  account_number TEXT NOT NULL,
  swift_code TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  memo TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  verification_code TEXT,
  verification_expires_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  reference_number TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wire_transfers_user_id ON wire_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_wire_transfers_status ON wire_transfers(status);
CREATE INDEX IF NOT EXISTS idx_wire_transfers_created ON wire_transfers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wire_transfers_reference ON wire_transfers(reference_number);

-- ============================================================================
-- 3. MOBILE CHECK DEPOSITS SCHEMA
-- ============================================================================

-- Mobile Deposits Table
CREATE TABLE IF NOT EXISTS mobile_deposits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  amount NUMERIC(12, 2) NOT NULL,
  check_front_image TEXT NOT NULL,
  check_back_image TEXT NOT NULL,
  memo TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'deposited')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  deposited_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  reference_number TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mobile_deposits_user_id ON mobile_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_deposits_account_id ON mobile_deposits(account_id);
CREATE INDEX IF NOT EXISTS idx_mobile_deposits_status ON mobile_deposits(status);
CREATE INDEX IF NOT EXISTS idx_mobile_deposits_created ON mobile_deposits(created_at DESC);

-- ============================================================================
-- 4. VERIFICATION CODES TABLE (SHARED)
-- ============================================================================

-- Verification Codes Table
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('zelle', 'wire', 'mobile_deposit', 'transfer', 'general')),
  reference_id UUID,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN DEFAULT FALSE,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_reference ON verification_codes(reference_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON verification_codes(expires_at);

-- ============================================================================
-- 5. NOTIFICATIONS TABLE (ENHANCED)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('zelle', 'wire', 'mobile_deposit', 'account', 'security', 'general')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ============================================================================
-- 6. SYSTEM LOGS TABLE (ENHANCED)
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'critical')),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_type ON system_logs(type);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at DESC);

-- ============================================================================
-- 7. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE zelle_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE zelle_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE zelle_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wire_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Zelle Contacts Policies
CREATE POLICY "Users can manage their own zelle contacts"
  ON zelle_contacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Zelle Settings Policies
CREATE POLICY "Users can manage their own zelle settings"
  ON zelle_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Zelle Transactions Policies
CREATE POLICY "Users can view their own zelle transactions"
  ON zelle_transactions FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_user_id);

CREATE POLICY "Users can create their own zelle transactions"
  ON zelle_transactions FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own zelle transactions"
  ON zelle_transactions FOR UPDATE
  USING (auth.uid() = sender_id);

-- Wire Transfers Policies
CREATE POLICY "Users can manage their own wire transfers"
  ON wire_transfers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Mobile Deposits Policies
CREATE POLICY "Users can manage their own mobile deposits"
  ON mobile_deposits FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Verification Codes Policies
CREATE POLICY "Users can manage their own verification codes"
  ON verification_codes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Notifications Policies
CREATE POLICY "Users can manage their own notifications"
  ON notifications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- System Logs Policies
CREATE POLICY "Users can view their own system logs"
  ON system_logs FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- 8. TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_zelle_contacts_updated_at
  BEFORE UPDATE ON zelle_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zelle_settings_updated_at
  BEFORE UPDATE ON zelle_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zelle_transactions_updated_at
  BEFORE UPDATE ON zelle_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wire_transfers_updated_at
  BEFORE UPDATE ON wire_transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mobile_deposits_updated_at
  BEFORE UPDATE ON mobile_deposits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================

-- Function to generate reference numbers
CREATE OR REPLACE FUNCTION generate_reference_number(prefix TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN prefix || '-' || UPPER(substring(md5(random()::text || clock_timestamp()::text) from 1 for 12));
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired verification codes
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM verification_codes
  WHERE expires_at < NOW() AND is_used = FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Schema creation complete
-- ============================================================================
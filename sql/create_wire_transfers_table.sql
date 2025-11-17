
-- Create wire_transfers table for external bank transfers
CREATE TABLE IF NOT EXISTS wire_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  from_account_id uuid NOT NULL REFERENCES accounts(id),
  transfer_type text NOT NULL CHECK (transfer_type IN ('domestic', 'international')),
  recipient_name text NOT NULL,
  recipient_account text NOT NULL,
  recipient_bank text NOT NULL,
  recipient_bank_address text,
  swift_code text,
  routing_number text,
  amount numeric NOT NULL CHECK (amount > 0),
  fee numeric DEFAULT 0 CHECK (fee >= 0),
  total_amount numeric NOT NULL CHECK (total_amount > 0),
  urgent_transfer boolean DEFAULT false,
  reference text,
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  verification_code text,
  verified_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_wire_transfers_user_id ON wire_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_wire_transfers_from_account_id ON wire_transfers(from_account_id);
CREATE INDEX IF NOT EXISTS idx_wire_transfers_status ON wire_transfers(status);
CREATE INDEX IF NOT EXISTS idx_wire_transfers_created_at ON wire_transfers(created_at DESC);

-- Enable Row Level Security
ALTER TABLE wire_transfers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own wire transfers
CREATE POLICY "Users can view own wire transfers"
  ON wire_transfers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own wire transfers
CREATE POLICY "Users can create own wire transfers"
  ON wire_transfers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their pending wire transfers
CREATE POLICY "Users can update pending wire transfers"
  ON wire_transfers
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Add comment to table
COMMENT ON TABLE wire_transfers IS 'Stores wire transfer requests to external banks for admin review and processing';

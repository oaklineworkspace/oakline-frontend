
-- Table for pending payments to non-Oakline users
CREATE TABLE IF NOT EXISTS oakline_pay_pending_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  sender_account_id uuid NOT NULL,
  recipient_email text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  memo text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  reference_number text UNIQUE DEFAULT md5(random()::text || clock_timestamp()::text),
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '14 days'),
  completed_at timestamp with time zone,
  claimed_by uuid,
  sender_notified boolean DEFAULT false,
  recipient_notified boolean DEFAULT false,
  
  CONSTRAINT oakline_pay_pending_payments_pkey PRIMARY KEY (id),
  CONSTRAINT oakline_pay_pending_payments_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT oakline_pay_pending_payments_sender_account_id_fkey 
    FOREIGN KEY (sender_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE,
  CONSTRAINT oakline_pay_pending_payments_claimed_by_fkey 
    FOREIGN KEY (claimed_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pending_payments_sender ON oakline_pay_pending_payments(sender_id);
CREATE INDEX IF NOT EXISTS idx_pending_payments_recipient_email ON oakline_pay_pending_payments(recipient_email);
CREATE INDEX IF NOT EXISTS idx_pending_payments_status ON oakline_pay_pending_payments(status);
CREATE INDEX IF NOT EXISTS idx_pending_payments_expires ON oakline_pay_pending_payments(expires_at);

-- RLS Policies
ALTER TABLE oakline_pay_pending_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their sent pending payments"
  ON oakline_pay_pending_payments FOR SELECT
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can create pending payments"
  ON oakline_pay_pending_payments FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Function to auto-expire pending payments
CREATE OR REPLACE FUNCTION expire_old_pending_payments()
RETURNS void AS $$
BEGIN
  UPDATE oakline_pay_pending_payments
  SET status = 'expired'
  WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON TABLE oakline_pay_pending_payments IS 'Pending payments sent to non-Oakline users via email';

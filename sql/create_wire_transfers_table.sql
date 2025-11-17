-- SQL to create wire_transfers table in Supabase
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.wire_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  from_account_id uuid NOT NULL,
  transfer_type text NOT NULL CHECK (transfer_type = ANY (ARRAY['domestic'::text, 'international'::text])),
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
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])),
  verification_code text,
  verified_at timestamp with time zone,
  processed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT wire_transfers_pkey PRIMARY KEY (id),
  CONSTRAINT wire_transfers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT wire_transfers_from_account_id_fkey FOREIGN KEY (from_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wire_transfers_user_id ON public.wire_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_wire_transfers_status ON public.wire_transfers(status);
CREATE INDEX IF NOT EXISTS idx_wire_transfers_created_at ON public.wire_transfers(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.wire_transfers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own wire transfers"
  ON public.wire_transfers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wire transfers"
  ON public.wire_transfers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending wire transfers"
  ON public.wire_transfers
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

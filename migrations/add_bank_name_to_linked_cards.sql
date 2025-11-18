-- Migration: Add bank_name column to linked_debit_cards table
-- This allows storing the issuing bank/institution name for linked debit cards

ALTER TABLE linked_debit_cards
ADD COLUMN IF NOT EXISTS bank_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN linked_debit_cards.bank_name IS 'Name of the issuing bank or financial institution';

-- Add transfer grouping columns to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS transfer_group_id UUID,
ADD COLUMN IF NOT EXISTS transfer_type TEXT CHECK (transfer_type IN ('internal', 'external', 'wire', 'zelle'));

CREATE INDEX IF NOT EXISTS idx_transactions_transfer_group ON transactions(transfer_group_id);

-- Update existing transactions to have transfer_group_id where applicable
-- This is a one-time migration for existing data
UPDATE transactions t1
SET transfer_group_id = gen_random_uuid()
WHERE t1.reference IN (
  SELECT reference 
  FROM transactions 
  WHERE reference IS NOT NULL 
  GROUP BY reference 
  HAVING COUNT(*) > 1
)
AND t1.transfer_group_id IS NULL;

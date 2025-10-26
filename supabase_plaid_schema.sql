
-- Create plaid_items table to store Plaid access tokens and metadata
CREATE TABLE IF NOT EXISTS plaid_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  institution_id TEXT,
  institution_name TEXT,
  cursor TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_plaid_items_user_id ON plaid_items(user_id);

-- Create index on item_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_plaid_items_item_id ON plaid_items(item_id);

-- Enable Row Level Security
ALTER TABLE plaid_items ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view only their own Plaid items
CREATE POLICY "Users can view their own plaid items"
  ON plaid_items
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own Plaid items
CREATE POLICY "Users can insert their own plaid items"
  ON plaid_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own Plaid items
CREATE POLICY "Users can update their own plaid items"
  ON plaid_items
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own Plaid items
CREATE POLICY "Users can delete their own plaid items"
  ON plaid_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- Optional: Create a table to store linked accounts
CREATE TABLE IF NOT EXISTS plaid_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plaid_item_id UUID NOT NULL REFERENCES plaid_items(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  official_name TEXT,
  type TEXT,
  subtype TEXT,
  mask TEXT,
  available_balance NUMERIC(12, 2),
  current_balance NUMERIC(12, 2),
  iso_currency_code TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on plaid_item_id for faster queries
CREATE INDEX IF NOT EXISTS idx_plaid_accounts_item_id ON plaid_accounts(plaid_item_id);

-- Enable Row Level Security
ALTER TABLE plaid_accounts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view accounts linked to their Plaid items
CREATE POLICY "Users can view their own plaid accounts"
  ON plaid_accounts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plaid_items
      WHERE plaid_items.id = plaid_accounts.plaid_item_id
      AND plaid_items.user_id = auth.uid()
    )
  );

-- Create policy to allow users to insert accounts linked to their Plaid items
CREATE POLICY "Users can insert their own plaid accounts"
  ON plaid_accounts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plaid_items
      WHERE plaid_items.id = plaid_accounts.plaid_item_id
      AND plaid_items.user_id = auth.uid()
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

CREATE TRIGGER update_plaid_items_updated_at
  BEFORE UPDATE ON plaid_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plaid_accounts_updated_at
  BEFORE UPDATE ON plaid_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

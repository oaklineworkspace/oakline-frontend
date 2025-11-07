# Crypto Tables Setup Instructions

## How to Add These Tables to Supabase

1. **Open Supabase SQL Editor**:
   - Go to your Supabase project dashboard
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

2. **Execute Table 1 - Account Opening Crypto Deposits**:
   - Copy the entire contents of `sql_scripts/create_account_opening_crypto_deposits.sql`
   - Paste into the SQL Editor
   - Click "Run" to create the table

3. **Execute Table 2 - Crypto Investments**:
   - Copy the entire contents of `sql_scripts/create_crypto_investments.sql`
   - Paste into the SQL Editor
   - Click "Run" to create both tables (crypto_investments and crypto_investment_transactions)

4. **Verify Tables Were Created**:
   - Go to "Table Editor" in Supabase
   - You should see:
     - `account_opening_crypto_deposits`
     - `crypto_investments`
     - `crypto_investment_transactions`

## Table Relationships

### account_opening_crypto_deposits
- **Purpose**: Track minimum deposit payments for account opening
- **Links to**:
  - `applications` (before account is created)
  - `accounts` (after account is created)
  - `admin_assigned_wallets` (wallet address user sends crypto to)
  - `crypto_assets` (which cryptocurrency was used)

### crypto_investments
- **Purpose**: Track user cryptocurrency investments
- **Links to**:
  - `accounts` (user's bank account)
  - `crypto_assets` (which cryptocurrency they invested in)
  - Companion table: `crypto_investment_transactions` (buy/sell/stake history)

## Key Features

### Account Opening Deposits
- ✅ Transaction hash tracking
- ✅ Blockchain confirmation tracking (default 3 confirmations)
- ✅ Admin approval workflow
- ✅ Fee calculation with net_amount
- ✅ Status tracking: pending → awaiting_confirmations → confirmed → approved → completed
- ✅ Supports both application-level and account-level deposits

### Crypto Investments
- ✅ Real-time profit/loss tracking
- ✅ Staking support with APY and rewards
- ✅ Lock periods for staked assets
- ✅ Auto-compounding option
- ✅ Complete transaction history (buy, sell, stake, unstake, rewards)
- ✅ Investment types: hold, stake, liquidity_pool, savings

## Next Steps

After creating these tables, you'll want to:
1. Set up Row Level Security (RLS) policies
2. Create API endpoints to interact with these tables
3. Build frontend components for users to make deposits and investments
4. Set up admin interfaces to approve/reject deposits

Let me know if you need help with any of these steps!


# Loan Deposit Admin Verification Guide

## Overview
This guide explains the loan deposit verification workflow for administrators. When users apply for loans and submit crypto deposits as collateral, admins must verify these deposits before loans can be approved.

## User Flow Summary
1. **User applies for loan** → Loan created with `status: 'pending'`, `deposit_status: null`
2. **User selects crypto deposit method** → Redirected to `/loan/deposit-crypto`
3. **User submits crypto deposit** → Creates record in `crypto_deposits` table with:
   - `purpose: 'loan_requirement'`
   - `loan_id: [loan_id]`
   - `account_id: [treasury_account_id]` (Account #9900000001)
   - `status: 'pending'`
4. **Loan updated** → `deposit_status: 'pending'`, `deposit_method: 'crypto'`

## Admin Verification Steps

### 1. Check Pending Crypto Deposits
```sql
SELECT 
  cd.*,
  l.loan_type,
  l.principal,
  l.deposit_required,
  u.email
FROM crypto_deposits cd
JOIN loans l ON cd.loan_id = l.id
JOIN auth.users u ON cd.user_id = u.id
WHERE cd.purpose = 'loan_requirement'
  AND cd.status = 'pending'
ORDER BY cd.created_at DESC;
```

### 2. Verify Deposit on Blockchain
- Check the wallet address: `cd.wallet_address`
- Verify transaction on blockchain explorer
- Confirm amount matches `cd.amount`
- Ensure transaction has required confirmations

### 3. Approve Deposit (Admin Dashboard)
When deposit is verified, update:

```sql
-- Update crypto deposit
UPDATE crypto_deposits 
SET 
  status = 'completed',
  approved_amount = amount,
  verified_at = NOW(),
  verified_by = '[admin_user_id]'
WHERE id = '[deposit_id]';

-- Update loan
UPDATE loans
SET 
  deposit_status = 'completed',
  deposit_paid = true,
  status = 'pending', -- Still needs loan approval
  updated_at = NOW()
WHERE id = '[loan_id]';
```

### 4. Real-Time Notification
When you approve the deposit:
- User sees real-time update on their screen (if they're on the page)
- Notification is sent to user
- Loan moves to approval queue

## Treasury Account
All loan deposits route to:
- **Account Number**: 9900000001
- **Account Type**: treasury
- **Purpose**: Holds loan collateral until disbursement

## Database Schema Reference

### crypto_deposits table
```
- id: UUID
- user_id: UUID (references auth.users)
- account_id: UUID (treasury account)
- loan_id: UUID (references loans)
- crypto_type: TEXT (BTC, USDT, ETH, BNB)
- network_type: TEXT
- wallet_address: TEXT
- amount: NUMERIC
- approved_amount: NUMERIC
- status: TEXT (pending, completed, rejected)
- purpose: TEXT ('loan_requirement')
- verified_at: TIMESTAMP
- verified_by: UUID
- metadata: JSONB
```

### loans table
```
- id: UUID
- user_id: UUID
- deposit_required: NUMERIC (10% of principal)
- deposit_amount: NUMERIC
- deposit_method: TEXT (crypto, balance)
- deposit_status: TEXT (pending, completed)
- deposit_paid: BOOLEAN
- deposit_date: TIMESTAMP
- status: TEXT (pending, approved, active, rejected, closed)
```

## Admin Dashboard TODO
To complete this workflow, you'll need to add to your admin dashboard:

1. **Pending Deposits Tab** - List all crypto deposits with `purpose = 'loan_requirement'` and `status = 'pending'`
2. **Verify Button** - Approve/reject deposits after blockchain verification
3. **Loan Approval Queue** - List loans where `deposit_paid = true` and `status = 'pending'`
4. **Disbursement** - After loan approval, disburse funds and set `status = 'active'`

## Real-Time Updates
The frontend uses Supabase real-time subscriptions:
- Users see instant updates when you approve deposits
- No page refresh needed
- Status badges update automatically

## Important Notes
- Never approve deposits without blockchain verification
- Check network confirmations before approval
- Treasury account must exist before system can process deposits
- All loan deposits are held in treasury until disbursement
- After loan approval, funds are disbursed to user's account

# Fix Duplicate Transaction Issue - Admin Side

## Problem
When an admin approves a crypto deposit, the system is creating a NEW transaction instead of updating the existing pending transaction. This causes users to see duplicate entries in their transaction history.

Example from user dashboard:
- Transaction 1: "Crypto deposit - Bitcoin (Net after $3.00 fee)" - completed
- Transaction 2: "BTC Add to Balance via Bitcoin" - completed

Both transactions are for the same deposit, creating confusion.

## Root Cause
The admin approval code is inserting a new transaction into the `transactions` table instead of finding and updating the existing pending transaction that was created when the user submitted their deposit.

## Required Fix

### Step 1: Update Crypto Deposit Approval Logic

Find the admin approval function that handles crypto deposit approvals (check both `crypto_deposits` and `account_opening_crypto_deposits` approval endpoints).

**Replace the current transaction creation logic with this:**

```javascript
// After approving the crypto deposit and updating its status

// IMPORTANT: Find and UPDATE the existing pending transaction instead of creating a new one
const { data: existingTx, error: txFindError } = await supabaseAdmin
  .from('transactions')
  .select('id, metadata')
  .eq('reference_number', depositId)  // depositId is the crypto deposit's ID
  .eq('type', 'crypto_deposit')
  .eq('status', 'pending')
  .single();

if (existingTx) {
  // Transaction exists - UPDATE it to completed
  const { error: updateError } = await supabaseAdmin
    .from('transactions')
    .update({
      status: 'completed',
      description: `${cryptoType} Deposit - Completed`,
      completed_at: new Date().toISOString(),
      metadata: {
        ...existingTx.metadata,
        approved_by: adminUserId,  // Optional: track who approved
        approved_at: new Date().toISOString()
      }
    })
    .eq('id', existingTx.id);

  if (updateError) {
    console.error('Error updating transaction:', updateError);
  } else {
    console.log('✅ Updated existing transaction:', existingTx.id);
  }
} else {
  // Fallback: Only create if no pending transaction exists
  // This should rarely happen - log it for debugging
  console.warn('⚠️ No pending transaction found for deposit:', depositId, '- Creating new transaction');
  
  const { error: insertError } = await supabaseAdmin
    .from('transactions')
    .insert([{
      user_id: deposit.user_id,
      account_id: deposit.account_id,
      type: 'crypto_deposit',
      amount: deposit.net_amount || deposit.amount,
      status: 'completed',
      description: `${cryptoType} Deposit - Completed`,
      reference_number: depositId,
      completed_at: new Date().toISOString(),
      metadata: {
        crypto_type: cryptoType,
        network_type: networkType,
        deposit_id: depositId,
        created_during_approval: true,  // Flag this as unusual
        approved_by: adminUserId
      }
    }]);

  if (insertError) {
    console.error('Error creating transaction:', insertError);
  }
}
```

### Step 2: Update Rejection Logic (if applicable)

If there's a rejection flow, update it similarly:

```javascript
// When admin rejects a crypto deposit
const { data: existingTx } = await supabaseAdmin
  .from('transactions')
  .select('id, metadata')
  .eq('reference_number', depositId)
  .eq('type', 'crypto_deposit')
  .eq('status', 'pending')
  .single();

if (existingTx) {
  await supabaseAdmin
    .from('transactions')
    .update({
      status: 'failed',
      description: `${cryptoType} Deposit - Rejected`,
      metadata: {
        ...existingTx.metadata,
        rejection_reason: rejectionReason,
        rejected_by: adminUserId,
        rejected_at: new Date().toISOString()
      }
    })
    .eq('id', existingTx.id);
}
```

### Step 3: Remove Any Duplicate Transaction Creation Code

Search for and **REMOVE** any code that looks like this in the approval functions:

```javascript
// ❌ BAD - DO NOT DO THIS
await supabaseAdmin.from('transactions').insert([{
  user_id: deposit.user_id,
  account_id: deposit.account_id,
  type: 'crypto_deposit',
  amount: deposit.amount,
  status: 'completed',
  description: 'Crypto deposit completed'
}]);
```

### Step 4: Verify Account Balance Updates

Ensure account balance is only updated when the transaction is marked as completed:

```javascript
if (newStatus === 'completed' || newStatus === 'approved') {
  // Get current account balance
  const { data: account } = await supabaseAdmin
    .from('accounts')
    .select('balance')
    .eq('id', deposit.account_id)
    .single();

  // Update balance with net amount (after fees)
  const newBalance = (parseFloat(account.balance) || 0) + parseFloat(deposit.net_amount || deposit.amount);
  
  await supabaseAdmin
    .from('accounts')
    .update({ balance: newBalance })
    .eq('id', deposit.account_id);
}
```

## Files to Check

Look for these API endpoints or admin functions:
- `/api/admin/approve-crypto-deposit`
- `/api/admin/crypto-deposits/approve`
- Any admin approval handler for `crypto_deposits` table
- Any admin approval handler for `account_opening_crypto_deposits` table

## Testing Checklist

After making changes, verify:
1. ✅ User submits crypto deposit → creates pending transaction
2. ✅ Admin approves deposit → updates existing transaction to completed (NOT creates new one)
3. ✅ User dashboard shows only ONE transaction for the deposit
4. ✅ Account balance is updated correctly
5. ✅ Transaction description shows "Completed" status

## Expected Result

After fix:
- User sees only ONE transaction per deposit
- Transaction status changes from "pending" → "completed"
- No duplicate entries in transaction history
- Cleaner, more accurate user experience
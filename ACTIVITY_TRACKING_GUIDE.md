
# User Activity Tracking Implementation Guide

## Overview
This guide shows how to implement comprehensive user activity tracking in your banking system to monitor user behavior and security events.

## What's Already Implemented

### 1. Activity Logger (`lib/activityLogger.js`)
- Core logging functionality with IP address and user agent tracking
- Helper functions for different activity types
- Pre-defined activity types and actions

### 2. API Endpoint (`pages/api/log-activity.js`)
- Processes and stores activity logs in `system_logs` table
- Automatically determines log level based on action type

### 3. React Hook (`hooks/useActivityLogger.js`)
- Easy-to-use hook for logging activities in React components

## How to Track Activities

### Authentication Events

```javascript
import { useActivityLogger } from '../hooks/useActivityLogger';

function LoginPage() {
  const { logLogin, logLogout } = useActivityLogger();

  const handleLogin = async (credentials) => {
    // Your login logic
    await signIn(credentials);
    
    // Log the login
    await logLogin('password'); // or 'mfa', 'biometric', etc.
  };

  const handleLogout = async () => {
    await logLogout();
    // Your logout logic
  };
}
```

### Transaction Events

```javascript
import { useActivityLogger } from '../hooks/useActivityLogger';

function TransferPage() {
  const { logTransaction } = useActivityLogger();

  const handleTransfer = async (amount, fromAccount, toAccount) => {
    // Process transfer
    await processTransfer(amount, fromAccount, toAccount);
    
    // Log the transaction
    await logTransaction('transfer', amount, fromAccount, {
      to_account: toAccount,
      transfer_type: 'internal'
    });
  };
}
```

### Card Operations

```javascript
import { useActivityLogger } from '../hooks/useActivityLogger';

function CardManagement() {
  const { logCardAction } = useActivityLogger();

  const blockCard = async (cardNumber) => {
    await apiBlockCard(cardNumber);
    
    // Log card action
    await logCardAction('card_blocked', cardNumber, {
      reason: 'user_requested'
    });
  };
}
```

### Security Events

```javascript
import { useActivityLogger } from '../hooks/useActivityLogger';

function SecuritySettings() {
  const { logSecurity } = useActivityLogger();

  const enable2FA = async () => {
    await setup2FA();
    
    // Log security change
    await logSecurity('mfa_enabled', {
      method: '2fa',
      app: 'authenticator'
    });
  };
}
```

### Page Views and User Actions

```javascript
import { useActivityLogger } from '../hooks/useActivityLogger';
import { useEffect } from 'react';

function AccountDetails() {
  const { logUser } = useActivityLogger();

  useEffect(() => {
    // Log page view
    logUser('account_view', {
      page: 'account_details',
      account_id: accountId
    });
  }, []);
}
```

## Events to Track

### Critical Events (Already Implemented)
- ✅ Login/Logout
- ✅ Password changes
- ✅ Transactions (transfers, payments, deposits, withdrawals)
- ✅ Card operations (block, unblock, replace)

### Recommended Additional Events

#### Account Management
- Account opening
- Account closure
- Balance inquiries
- Statement downloads
- Profile updates

#### Security
- Failed login attempts
- IP address changes
- Device changes
- MFA setup/changes
- Password reset requests
- Suspicious activity detection

#### Transactions
- Large transactions (above threshold)
- International transfers
- Wire transfers
- Crypto deposits
- Loan payments
- Bill payments

#### Settings
- Notification preferences
- Language changes
- Contact information updates
- Beneficiary management

## Example: Tracking Crypto Deposits

```javascript
import { logActivity, ActivityTypes } from '../lib/activityLogger';

async function handleCryptoDeposit(depositData) {
  await logActivity({
    type: ActivityTypes.TRANSACTION,
    action: 'crypto_deposit_initiated',
    category: 'crypto',
    message: `Crypto deposit initiated - ${depositData.amount} ${depositData.crypto_type}`,
    details: {
      crypto_type: depositData.crypto_type,
      network: depositData.network,
      amount: depositData.amount,
      wallet_address: depositData.wallet_address,
      tx_hash: depositData.tx_hash
    }
  });
}
```

## Example: Tracking Loan Applications

```javascript
import { logActivity, ActivityTypes } from '../lib/activityLogger';

async function handleLoanApplication(loanData) {
  await logActivity({
    type: ActivityTypes.SYSTEM,
    action: 'loan_application_submitted',
    category: 'loan',
    message: `Loan application submitted - $${loanData.amount}`,
    details: {
      loan_type: loanData.loan_type,
      amount: loanData.principal,
      term_months: loanData.term_months,
      purpose: loanData.purpose
    }
  });
}
```

## Viewing Activity Logs

Activity logs are stored in the `system_logs` table with the following structure:

```sql
SELECT 
  id,
  level,
  type,
  message,
  details,
  user_id,
  created_at
FROM system_logs
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC;
```

### For Admin Monitoring

Create an admin dashboard query:

```sql
-- Recent security events
SELECT * FROM system_logs
WHERE level = 'warning' OR level = 'error'
ORDER BY created_at DESC
LIMIT 100;

-- User login history
SELECT 
  user_id,
  details->>'ip_address' as ip,
  details->>'user_agent' as device,
  created_at
FROM system_logs
WHERE type = 'auth' AND message LIKE '%login%'
ORDER BY created_at DESC;
```

## Best Practices

1. **Log Sensitive Actions**: Always log authentication, transactions, and security changes
2. **Include Context**: Add relevant details (amount, account numbers, IP, device)
3. **Mask Sensitive Data**: Use `maskAccountNumber()` and `maskCardNumber()` helpers
4. **Don't Block User Flow**: Log activities asynchronously (fire-and-forget)
5. **Set Appropriate Log Levels**: Use error/warning for security events
6. **Regular Monitoring**: Set up alerts for suspicious patterns

## Privacy & Compliance

- IP addresses and user agents are automatically captured
- Sensitive data (SSN, full card numbers) should never be logged
- Activity logs should be retained per your compliance requirements
- Users should be informed about activity tracking in your privacy policy

## Next Steps

1. Add activity logging to all critical user actions in your app
2. Create an admin dashboard to view and filter activity logs
3. Set up alerts for suspicious activities (multiple failed logins, unusual IP changes, etc.)
4. Implement retention policies for activity logs
5. Add export functionality for compliance audits

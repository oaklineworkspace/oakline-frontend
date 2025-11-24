# Verification API Integration Guide

## Quick Integration Instructions

The selfie/video verification system is now implemented with frontend enforcement and real-time detection. To complete the security implementation, you MUST integrate verification checks into all sensitive API endpoints.

## Backend Helper Function

Location: `lib/verificationCheck.js`

```javascript
import { requireVerificationCheck } from '../../../lib/verificationCheck';

// In your API endpoint:
export default async function handler(req, res) {
  // ... authenticate user first ...
  
  // Check verification requirement
  const blocked = await requireVerificationCheck(user.id, res);
  if (blocked) return; // Response already sent with 403 error
  
  // Continue with normal operation...
}
```

## Critical API Endpoints That MUST Be Protected

### Priority 1 - Financial Transactions (Implement Immediately)
These endpoints handle money movement and MUST be protected:

1. **Internal Transfers**
   - `/api/internal-transfer`
   - `/api/transfer` (if exists)
   
2. **External Transfers**
   - `/api/external-transfer`
   - `/api/wire-transfer`
   - `/api/ach-transfer`

3. **Payments**
   - `/api/send-zelle`
   - `/api/pay-bill`
   - `/api/oakline-pay-send`

4. **Card Operations**
   - `/api/card/activate`
   - `/api/card/add-to-wallet`
   - `/api/apply-card`

5. **Withdrawals & Deposits**
   - `/api/withdraw`
   - `/api/deposit`
   - `/api/mobile-deposit`
   - `/api/crypto/deposit`
   - `/api/crypto/withdraw`

### Priority 2 - Account Changes
6. **Profile Updates**
   - `/api/update-profile`
   - `/api/update-email`
   - `/api/update-phone`
   - `/api/change-password`

7. **Security Settings**
   - `/api/update-security-settings`
   - `/api/reset-pin`
   - `/api/add-device`

### Priority 3 - Account Operations
8. **Account Management**
   - `/api/close-account`
   - `/api/request-account`
   - `/api/link-account`

9. **Loan Operations**
   - `/api/loan/apply`
   - `/api/loan/withdraw`

## Implementation Example

Here's how to integrate into an existing API endpoint:

### Before (Vulnerable):
```javascript
// pages/api/internal-transfer.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fromAccountId, toAccountId, amount } = req.body;
  
  // Authenticate user
  const authHeader = req.headers.authorization;
  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Process transfer
  // ... transfer logic ...
}
```

### After (Secured):
```javascript
// pages/api/internal-transfer.js
import { requireVerificationCheck } from '../../lib/verificationCheck';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fromAccountId, toAccountId, amount } = req.body;
  
  // Authenticate user
  const authHeader = req.headers.authorization;
  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // CHECK VERIFICATION REQUIREMENT
  const blocked = await requireVerificationCheck(user.id, res);
  if (blocked) return; // 403 response already sent

  // Process transfer
  // ... transfer logic ...
}
```

## Why This Is Critical

### Frontend-Only Enforcement Is Not Enough

While the frontend prevents UI access, users can:
- Make direct API calls using tools like Postman or curl
- Exploit race conditions between verification check and API call
- Use browser dev tools to bypass redirects temporarily

### Backend Enforcement Is The Final Defense

By checking `requires_verification` in the API endpoint itself, you ensure:
- No transfer can complete if user is flagged
- No data modification if verification is pending
- Complete security even if frontend checks fail

## Testing Your Implementation

### Test Scenario 1: Mid-Session Flagging
1. User logs in and accesses dashboard
2. Admin flags user for verification (set `requires_verification = true`)
3. User tries to make a transfer
4. Expected: API returns 403 with verification message
5. Actual without API check: Transfer goes through ❌
6. Actual with API check: Transfer blocked ✓

### Test Scenario 2: Direct API Call
1. Flag a user for verification
2. Use curl to call transfer API with valid token:
```bash
curl -X POST https://your-api.com/api/internal-transfer \
  -H "Authorization: Bearer valid_token" \
  -H "Content-Type: application/json" \
  -d '{"fromAccountId":"123","toAccountId":"456","amount":1000}'
```
3. Expected: 403 error with verification message
4. Actual without API check: Transfer goes through ❌
5. Actual with API check: Transfer blocked ✓

## Quick Wins

Start with these 3 endpoints for immediate protection:
1. `/api/internal-transfer` - Internal bank transfers
2. `/api/send-zelle` - Zelle payments
3. `/api/mobile-deposit` - Mobile check deposits

Add these 3 lines to each:
```javascript
import { requireVerificationCheck } from '../../lib/verificationCheck';
// ... after authentication ...
const blocked = await requireVerificationCheck(user.id, res);
if (blocked) return;
```

## Frontend Handling

The frontend should gracefully handle 403 responses with `requiresVerification: true`:

```javascript
try {
  const response = await fetch('/api/internal-transfer', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(transferData)
  });

  if (response.status === 403) {
    const error = await response.json();
    if (error.requiresVerification) {
      // Redirect to verification page
      router.push('/verify-identity');
      return;
    }
  }

  // Handle normal response...
} catch (error) {
  console.error('Transfer error:', error);
}
```

## Migration Strategy

### Phase 1: Critical Endpoints (Week 1)
- All transfer/payment endpoints
- Mobile deposit
- Card operations

### Phase 2: Account Changes (Week 2)
- Profile updates
- Security settings
- Password changes

### Phase 3: Everything Else (Week 3)
- Account management
- Loan operations
- Any remaining sensitive endpoints

## Monitoring

After implementation, monitor:
- 403 responses with `requiresVerification: true` in logs
- Verification submissions following blocked API calls
- Any successful operations by flagged users (should be zero)

## Summary

**What's Already Done:**
- ✅ Database schema
- ✅ Frontend verification page and component
- ✅ Real-time verification enforcement in UI
- ✅ Backend helper function created
- ✅ RLS policies secured

**What You Must Do:**
- ❌ Integrate `requireVerificationCheck` into Priority 1 API endpoints
- ❌ Test all protected endpoints
- ❌ Add frontend error handling for 403 verification responses

The verification system is 90% complete. The final 10% - integrating backend checks into API endpoints - is critical for security and must be completed before production use.

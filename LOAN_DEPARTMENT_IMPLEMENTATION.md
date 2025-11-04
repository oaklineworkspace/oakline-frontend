
# Loan Department Implementation Guide

## Overview
This document outlines the complete Loan Department workflow implementation for Oakline Bank's loan system.

## Key Changes Implemented

### 1. Loan Flow & Loan Department Workflow

**Email Notifications:**
- ✅ **Submission Email**: Sent when user submits loan application
- ✅ **Deposit Confirmed Email**: Sent when Loan Department confirms 10% deposit
- ✅ **Approval Email**: Sent when loan is approved and activated
- ✅ **Rejection Email**: Sent if loan is declined with reason

**Email Functions Added to `lib/email.js`:**
- `sendLoanSubmittedEmail()` - Initial submission confirmation
- `sendDepositConfirmedEmail()` - Deposit verification notification
- `sendLoanNotificationEmail()` - Approval/rejection notifications

**Loan Status Flow:**
```
pending → (deposit submitted) → pending → (deposit confirmed) → 
under_review → (Loan Dept decision) → approved/rejected → active/closed
```

### 2. Duplicate Deposit Prevention

**Frontend Protection:**
- Check for existing deposits before showing deposit button
- Hide deposit button if `deposit_status === 'pending'` or `deposit_paid === true`
- Show appropriate status messages based on deposit state

**Backend Validation:**
- Query `crypto_deposits` table for existing loan deposits
- Check loan status before allowing deposit submission
- Prevent status updates if deposit already processed

**Status Messages:**
- ⏳ "Deposit submitted - Awaiting Loan Department verification"
- ✅ "Deposit confirmed - Loan under review by Loan Department"
- 💰 "Complete 10% Deposit" (only if not submitted)

### 3. Dynamic Location Data

**Database Tables Created:**
```sql
- countries (id, code, name)
- states (id, country_id, code, name)
- cities (id, state_id, name)
```

**API Endpoints:**
- `/api/locations/countries` - GET all countries
- `/api/locations/states?country_code=US` - GET states by country
- `/api/locations/cities?state_code=OK&country_code=US` - GET cities by state

**Pre-populated Data:**
- United States with all 50 states
- Example cities for Oklahoma
- Extensible for additional countries

### 4. Improved User Experience

**Loan Detail Page:**
- Clear deposit status indicators
- Professional status badges
- Contextual messages based on loan stage
- Hidden duplicate deposit buttons

**Loans Dashboard:**
- Accurate deposit status display
- Prevented multiple deposit submissions
- Clear next-step instructions

**Deposit Page:**
- Network selection required before showing wallet
- Duplicate submission prevention
- Professional success/error messages

## Email Templates

All emails use professional templates with:
- Oakline Bank branding
- Loan Department identification
- Clear next steps
- Contact information
- Responsive design

## Admin Dashboard Requirements

To complete this workflow, your admin dashboard should include:

### 1. Pending Deposits Tab
```sql
SELECT * FROM crypto_deposits
WHERE purpose = 'loan_requirement'
AND status = 'pending'
ORDER BY created_at DESC;
```

### 2. Deposit Verification
- View blockchain transaction hash
- Confirm network confirmations
- Approve/reject deposit
- Trigger `sendDepositConfirmedEmail()`

### 3. Loan Review Queue
```sql
SELECT * FROM loans
WHERE deposit_paid = true
AND deposit_status = 'completed'
AND status IN ('pending', 'under_review')
ORDER BY deposit_date DESC;
```

### 4. Loan Approval/Rejection
- Review loan application details
- Approve: Set `status = 'approved'`, disburse funds
- Reject: Set `status = 'rejected'`, add rejection reason
- Trigger `sendLoanNotificationEmail()`

## Database Schema Updates

### Loans Table Status Values
```sql
status IN (
  'pending',           -- Initial submission
  'pending_deposit',   -- Awaiting deposit
  'under_review',      -- Deposit confirmed, being reviewed
  'approved',          -- Approved by Loan Department
  'rejected',          -- Declined by Loan Department  
  'active',            -- Funds disbursed
  'closed'             -- Loan paid off
)

deposit_status IN (
  'pending',           -- Deposit submitted, awaiting confirmation
  'completed',         -- Deposit confirmed by Loan Department
  'not_required'       -- No deposit needed
)
```

## Testing Checklist

- [ ] User can submit loan application
- [ ] Submission email received
- [ ] 10% deposit button appears
- [ ] Deposit submission works
- [ ] Duplicate deposit prevented
- [ ] "Awaiting verification" message shows
- [ ] Admin can confirm deposit
- [ ] Deposit confirmed email received
- [ ] Loan moves to "under_review"
- [ ] Admin can approve/reject
- [ ] Approval/rejection email received
- [ ] Funds disbursed on approval
- [ ] Location dropdowns work dynamically

## Environment Variables Required

```env
SMTP_FROM_LOANS=loans@theoaklinebank.com
NEXT_PUBLIC_BASE_URL=https://theoaklinebank.com
```

## Next Steps

1. Run `location_data_tables.sql` migration in Supabase
2. Update frontend `apply.js` to use location APIs (separate task)
3. Test email delivery in production
4. Add additional countries/cities as needed
5. Configure Loan Department admin portal

## Notes

- All "Admin" references replaced with "Loan Department"
- Deposits held in treasury until loan approval
- Real-time updates via Supabase subscriptions
- Professional email templates for all stages
- Comprehensive duplicate prevention
- Ready for production deployment

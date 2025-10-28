# Loan Management System Migrations

## Overview
This directory contains database migrations for the loan management system.

## Required Migrations

### 1. Add Loan Fields Migration (add_loan_fields.sql)
This migration adds the necessary fields to support the loan management system:
- Adds `purpose` field to loans table
- Adds `remaining_balance` field to loans table
- Creates `system_logs` table for audit logging

### Running Migrations

#### For Development Database (Replit)
The migrations have already been applied to your development database.

#### For Production Database (Supabase Dashboard)
1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `add_loan_fields.sql`
4. Click "Run" to execute the migration

#### Manual Verification
You can verify the migration was successful by running:

```sql
-- Check if purpose column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'loans' 
AND column_name IN ('purpose', 'remaining_balance');

-- Check if system_logs table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'system_logs';
```

## Loan Management System Features

The migration enables the following features:

1. **Loan Application** (`/loan/apply`)
   - Users can apply for loans with purpose/description
   - Automatic account linking
   - Email and in-app notifications

2. **Admin Loan Management** (`/admin/loans`)
   - Review and filter loan applications
   - Approve/Reject/Close loans
   - Automatic fund disbursement on approval

3. **User Loan Dashboard** (`/loan/dashboard`)
   - View all user loans
   - Track remaining balances
   - Make loan payments

4. **Loan Payment Processing**
   - Deduct from account balance
   - Record payment history
   - Update remaining balance
   - Create transaction records
   - Auto-close loans when fully paid

## Database Schema

### Loans Table
- `id` (uuid): Primary key
- `user_id` (uuid): Foreign key to auth.users
- `account_id` (uuid): Foreign key to accounts
- `loan_type` (text): Type of loan (personal, mortgage, auto, etc.)
- `principal` (numeric): Loan amount
- `interest_rate` (numeric): Annual percentage rate
- `term_months` (integer): Loan term in months
- `purpose` (text): Purpose/description of the loan ✨ NEW
- `remaining_balance` (numeric): Remaining amount to be paid ✨ NEW
- `start_date` (date): Loan start date
- `status` (text): pending, approved, rejected, active, closed
- `created_at` (timestamp): Creation timestamp
- `updated_at` (timestamp): Update timestamp

### Loan Payments Table
- `id` (uuid): Primary key
- `loan_id` (uuid): Foreign key to loans
- `amount` (numeric): Payment amount
- `payment_date` (date): Date of payment
- `status` (text): pending, completed, failed
- `created_at` (timestamp): Creation timestamp
- `updated_at` (timestamp): Update timestamp

### System Logs Table ✨ NEW
- `id` (uuid): Primary key
- `user_id` (uuid): User performing the action
- `type` (text): Log type (e.g., 'loan')
- `action` (text): Action performed (e.g., 'loan_approved')
- `details` (jsonb): Additional details
- `created_at` (timestamp): Creation timestamp

## API Endpoints

### User Endpoints
- `POST /api/loan/apply` - Submit loan application
- `GET /api/loan/get-loans` - Get user's loans
- `POST /api/loan/payment` - Make loan payment

### Admin Endpoints
- `GET /api/admin/loans/get-all` - Get all loans
- `POST /api/admin/loans/approve` - Approve loan and disburse funds
- `POST /api/admin/loans/reject` - Reject loan application
- `POST /api/admin/loans/close` - Close fully paid loan
- `GET /api/admin/check-access` - Verify admin access

## Important Notes

1. **Transaction Safety**: The payment endpoint includes comprehensive rollback logic to prevent data inconsistency if any step fails.

2. **Email Notifications**: Email notifications are sent for:
   - Loan application submission
   - Loan approval
   - Loan rejection
   - Payment processing

3. **Security**: All admin endpoints verify admin access through the `admin_profiles` table.

4. **Balance Calculations**: Total due amount is calculated using the standard loan amortization formula with monthly compounding.

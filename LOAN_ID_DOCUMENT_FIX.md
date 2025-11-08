
# Loan Application ID Document Fix - Complete Guide

## Problem
The ID documents uploaded during loan applications from `pages/loan/apply.js` were not being properly stored in the database, making them inaccessible to admins.

## Solution Overview
1. Added `id_front_path` and `id_back_path` columns to the `loans` table
2. Updated the loan application API to store these paths
3. Fixed the frontend to upload documents immediately upon selection (not during final submission)
4. ID documents are now uploaded in Step 2 and paths are stored when the loan is created

## Database Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Add ID document path columns to loans table
ALTER TABLE public.loans
ADD COLUMN IF NOT EXISTS id_front_path TEXT,
ADD COLUMN IF NOT EXISTS id_back_path TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN public.loans.id_front_path IS 'Storage path to front of ID document uploaded during loan application';
COMMENT ON COLUMN public.loans.id_back_path IS 'Storage path to back of ID document uploaded during loan application';

-- Optional: Add index for faster admin queries
CREATE INDEX IF NOT EXISTS idx_loans_id_paths 
ON public.loans(id_front_path, id_back_path)
WHERE id_front_path IS NOT NULL AND id_back_path IS NOT NULL;
```

## How It Works Now

### User Flow:
1. **Step 1**: User enters loan details
2. **Step 2**: User uploads ID documents
   - Files are uploaded **immediately** when selected
   - Upload happens to `/api/upload-id-document`
   - File paths are stored in component state as strings
3. **Step 3**: User optionally adds collateral
4. **Step 4**: User reviews and submits
   - Loan record is created with `id_front_path` and `id_back_path` populated

### Admin Access:
Admins can now query the `loans` table and retrieve ID document paths:

```javascript
// Example: Get loan with ID documents
const { data: loan } = await supabase
  .from('loans')
  .select('id, user_id, id_front_path, id_back_path, principal, status')
  .eq('id', loanId)
  .single();

// Generate signed URLs to view documents
if (loan.id_front_path) {
  const { data: frontUrl } = await supabase.storage
    .from('documents')
    .createSignedUrl(loan.id_front_path, 3600); // 1 hour expiry
  
  console.log('Front ID URL:', frontUrl.signedUrl);
}

if (loan.id_back_path) {
  const { data: backUrl } = await supabase.storage
    .from('documents')
    .createSignedUrl(loan.id_back_path, 3600);
  
  console.log('Back ID URL:', backUrl.signedUrl);
}
```

## Changes Made

### Frontend (`pages/loan/apply.js`):
- ✅ Modified `handleFileChange` to upload files immediately
- ✅ Removed `uploadIdDocuments` function (no longer needed)
- ✅ Updated validation to check for string paths, not File objects
- ✅ Fixed button states to reflect upload status
- ✅ Improved error handling for upload failures

### Backend (`pages/api/loan/apply.js`):
- ✅ Added `id_front_path` and `id_back_path` to loan insert
- ✅ Validates that ID documents are provided
- ✅ Stores paths from request body into database

### Database:
- ✅ Added columns to `loans` table
- ✅ Added index for performance
- ✅ Added documentation comments

## Testing Checklist

- [ ] Run the SQL migration in Supabase
- [ ] Test loan application flow from start to finish
- [ ] Verify ID documents upload in Step 2
- [ ] Verify paths are stored in `loans` table after submission
- [ ] Test admin retrieval of ID document paths
- [ ] Test signed URL generation for viewing documents

## Verification Query

After a user submits a loan application, verify the data with:

```sql
SELECT 
  id,
  user_id,
  loan_type,
  principal,
  status,
  id_front_path,
  id_back_path,
  created_at
FROM loans
WHERE id_front_path IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

You should see the file paths populated in the `id_front_path` and `id_back_path` columns.

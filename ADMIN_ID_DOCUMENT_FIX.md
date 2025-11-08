# Admin ID Document Viewing - Fix Implementation

## Problem
Admins couldn't see the ID card documents that users uploaded during the account application process because the `applications` table was missing the columns to store the document paths.

## Solution
Added `id_front_path` and `id_back_path` columns to the applications table and updated apply.js to save the document paths when creating an application.

## Implementation Steps

### Step 1: Run the SQL Migration in Supabase

1. Go to your Supabase Dashboard → SQL Editor
2. Run the migration SQL from `supabase_migrations/add_id_document_paths_to_applications.sql`:

```sql
-- Add ID document path columns to applications table
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS id_front_path TEXT,
ADD COLUMN IF NOT EXISTS id_back_path TEXT;

-- Add comment to document the columns
COMMENT ON COLUMN public.applications.id_front_path IS 'Storage path to front of ID document (e.g., id_documents/user@email.com/id-front-timestamp.jpg)';
COMMENT ON COLUMN public.applications.id_back_path IS 'Storage path to back of ID document (e.g., id_documents/user@email.com/id-back-timestamp.jpg)';

-- Optional: Add index for faster admin queries
CREATE INDEX IF NOT EXISTS idx_applications_id_paths 
ON public.applications(id_front_path, id_back_path)
WHERE id_front_path IS NOT NULL AND id_back_path IS NOT NULL;
```

3. Click "Run" to execute the migration

### Step 2: Code Changes (Already Done)

Updated `pages/apply.js` (lines 707-708) to include the ID document paths when creating an application:

```javascript
id_front_path: formData.idFrontPath || null,
id_back_path: formData.idBackPath || null,
```

### Step 3: How Admins Can Now View Documents

Once the migration is complete, admins can access the ID documents by:

1. **Querying the applications table** - The `id_front_path` and `id_back_path` columns now contain the storage paths

2. **Generating signed URLs** - Use Supabase Storage to create signed URLs for viewing:

```javascript
// Example: Admin viewing ID documents
const { data: application } = await supabase
  .from('applications')
  .select('id_front_path, id_back_path, first_name, last_name, email')
  .eq('id', applicationId)
  .single();

// Generate signed URLs to view the documents
if (application.id_front_path) {
  const { data: frontUrl } = await supabase.storage
    .from('documents')  // or 'id-documents' depending on your bucket
    .createSignedUrl(application.id_front_path, 3600); // 1 hour expiry
    
  console.log('Front ID URL:', frontUrl.signedUrl);
}

if (application.id_back_path) {
  const { data: backUrl } = await supabase.storage
    .from('documents')
    .createSignedUrl(application.id_back_path, 3600);
    
  console.log('Back ID URL:', backUrl.signedUrl);
}
```

3. **Storage Bucket Location** - Documents are stored in:
   - Bucket: `documents` or `id-documents`
   - Path format: `id_documents/{sanitized_email}/id-{front|back}-{email}-{timestamp}.{ext}`

## Testing

After running the migration:

1. Submit a new test application with ID uploads
2. Query the applications table to verify the paths are saved
3. Use the signed URL method above to retrieve and view the documents

## Storage Permissions

Make sure your Supabase storage bucket has appropriate policies for admins to read documents:

```sql
-- Example storage policy for admin access
CREATE POLICY "Admins can read all ID documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND auth.jwt() ->> 'email' IN (
    SELECT email FROM admin_profiles
  )
);
```

## Notes

- Existing applications (submitted before this fix) will have NULL values for id_front_path and id_back_path
- New applications will automatically include the document paths
- The paths reference Supabase Storage, not database BLOBs, keeping the database lightweight

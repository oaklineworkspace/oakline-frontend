
-- Create the storage bucket for crypto deposit proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('crypto-deposit-proofs', 'crypto-deposit-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own deposit proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own deposit proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all deposit proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own deposit proofs" ON storage.objects;

-- Allow authenticated users to upload their own proofs
CREATE POLICY "Users can upload their own deposit proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'crypto-deposit-proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own proofs
CREATE POLICY "Users can view their own deposit proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'crypto-deposit-proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to view all proofs
CREATE POLICY "Admins can view all deposit proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'crypto-deposit-proofs' 
  AND EXISTS (
    SELECT 1 FROM admin_profiles 
    WHERE id = auth.uid()
  )
);

-- Allow users to delete their own proofs
CREATE POLICY "Users can delete their own deposit proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'crypto-deposit-proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

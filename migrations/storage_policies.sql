
-- Storage policies for documents bucket
-- Run this in your Supabase SQL Editor

-- Create the documents bucket if it doesn't exist (do this in Storage UI instead)
-- This is just for reference

-- Allow authenticated users to upload their own documents
CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow service role to upload any documents
CREATE POLICY "Service role can upload any documents"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'documents');

-- Allow users to view their own documents
CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow service role to view any documents
CREATE POLICY "Service role can view any documents"
ON storage.objects
FOR SELECT
TO service_role
USING (bucket_id = 'documents');

-- Allow service role to delete documents
CREATE POLICY "Service role can delete documents"
ON storage.objects
FOR DELETE
TO service_role
USING (bucket_id = 'documents');

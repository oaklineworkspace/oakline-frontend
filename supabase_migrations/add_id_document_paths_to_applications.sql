
-- Add ID document path columns to applications table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS id_front_path TEXT,
ADD COLUMN IF NOT EXISTS id_back_path TEXT;

-- Add comment to document the columns
COMMENT ON COLUMN public.applications.id_front_path IS 'Storage path to front of ID document (e.g., id_documents/user@email.com/id-front-timestamp.jpg)';
COMMENT ON COLUMN public.applications.id_back_path IS 'Storage path to back of ID document (e.g., id_documents/user@email.com/id-back-timestamp.jpg)';

-- Optional: Add index for faster admin queries (if you frequently filter by document status)
CREATE INDEX IF NOT EXISTS idx_applications_id_paths 
ON public.applications(id_front_path, id_back_path)
WHERE id_front_path IS NOT NULL AND id_back_path IS NOT NULL;

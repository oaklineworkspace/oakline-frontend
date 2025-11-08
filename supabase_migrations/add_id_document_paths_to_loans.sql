
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

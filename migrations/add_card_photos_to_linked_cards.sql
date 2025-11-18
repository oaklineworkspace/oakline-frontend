
-- Add card photo columns to linked_debit_cards table
ALTER TABLE public.linked_debit_cards 
ADD COLUMN IF NOT EXISTS card_front_photo text,
ADD COLUMN IF NOT EXISTS card_back_photo text;

-- Add comments
COMMENT ON COLUMN public.linked_debit_cards.card_front_photo IS 'URL to front card photo in Supabase storage';
COMMENT ON COLUMN public.linked_debit_cards.card_back_photo IS 'URL to back card photo in Supabase storage';

-- Update existing records to have pending status if they don't have photos
UPDATE public.linked_debit_cards 
SET status = 'pending' 
WHERE card_front_photo IS NULL 
  AND card_back_photo IS NULL 
  AND status = 'active';

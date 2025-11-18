-- Add full card number and CVV columns to linked_debit_cards table
-- WARNING: This stores sensitive card data and is FOR EDUCATIONAL PURPOSES ONLY
-- NEVER do this in a production environment - it violates PCI DSS compliance

-- Add columns if they don't exist
ALTER TABLE public.linked_debit_cards 
ADD COLUMN IF NOT EXISTS card_number_full text,
ADD COLUMN IF NOT EXISTS cvv text;

-- Add comments to warn about security
COMMENT ON COLUMN public.linked_debit_cards.card_number_full IS 'Full card number - FOR EDUCATIONAL PURPOSES ONLY - PCI DSS violation';
COMMENT ON COLUMN public.linked_debit_cards.cvv IS 'Card CVV/CVC - FOR EDUCATIONAL PURPOSES ONLY - PCI DSS violation - NEVER store CVV in production';

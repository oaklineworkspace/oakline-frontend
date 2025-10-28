-- Add nickname column to zelle_contacts if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'zelle_contacts' 
    AND column_name = 'nickname'
  ) THEN
    ALTER TABLE public.zelle_contacts ADD COLUMN nickname text;
  END IF;
END $$;

-- Add notification_enabled column to zelle_settings if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'zelle_settings' 
    AND column_name = 'notification_enabled'
  ) THEN
    ALTER TABLE public.zelle_settings ADD COLUMN notification_enabled boolean DEFAULT true;
  END IF;
END $$;

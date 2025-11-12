
-- Create or replace the increment_translation_count function
CREATE OR REPLACE FUNCTION increment_translation_count(lang_code text, lang_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.translation_stats (language_code, language_name, total_translations, last_updated)
  VALUES (lang_code, lang_name, 1, now())
  ON CONFLICT (language_code) 
  DO UPDATE SET 
    total_translations = translation_stats.total_translations + 1,
    last_updated = now();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_translation_count(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_translation_count(text, text) TO anon;

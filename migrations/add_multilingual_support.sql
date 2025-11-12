
-- Add preferred_language column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en';

-- Create translations cache table
CREATE TABLE IF NOT EXISTS public.translation_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_text text NOT NULL,
  source_language text DEFAULT 'en',
  target_language text NOT NULL,
  translated_text text NOT NULL,
  provider text DEFAULT 'libretranslate',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT translation_cache_pkey PRIMARY KEY (id),
  CONSTRAINT unique_translation UNIQUE (source_text, source_language, target_language)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_translation_cache_lookup 
ON public.translation_cache(source_text, source_language, target_language);

-- Create admin translation overrides table
CREATE TABLE IF NOT EXISTS public.translation_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_text text NOT NULL,
  source_language text DEFAULT 'en',
  target_language text NOT NULL,
  override_text text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT translation_overrides_pkey PRIMARY KEY (id),
  CONSTRAINT unique_override UNIQUE (source_text, source_language, target_language)
);

-- Create translation stats table
CREATE TABLE IF NOT EXISTS public.translation_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  language_code text NOT NULL UNIQUE,
  language_name text NOT NULL,
  total_translations integer DEFAULT 0,
  last_updated timestamp with time zone DEFAULT now(),
  CONSTRAINT translation_stats_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read translation cache" ON public.translation_cache FOR SELECT USING (true);
CREATE POLICY "System can insert/update translation cache" ON public.translation_cache FOR ALL USING (true);

CREATE POLICY "Anyone can read translation stats" ON public.translation_stats FOR SELECT USING (true);
CREATE POLICY "Admins can manage translation stats" ON public.translation_stats FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins can manage translation overrides" ON public.translation_overrides FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid())
);

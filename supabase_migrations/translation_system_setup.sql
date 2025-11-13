-- ================================================
-- TRANSLATION SYSTEM SETUP FOR OAKLINE BANK
-- ================================================
-- Run this script in your Supabase SQL Editor to set up the translation system tables
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste and Run

-- 1. Create profiles table (stores user language preferences)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_language TEXT DEFAULT 'en',
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create translation cache table (stores translated text to avoid repeated API calls)
CREATE TABLE IF NOT EXISTS translation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text TEXT NOT NULL,
  source_language TEXT NOT NULL DEFAULT 'en',
  target_language TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  provider TEXT, -- 'mymemory', 'libretranslate', or 'override'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_text, source_language, target_language)
);

-- 3. Create translation overrides table (allows admins to manually override translations)
CREATE TABLE IF NOT EXISTS translation_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text TEXT NOT NULL,
  source_language TEXT NOT NULL DEFAULT 'en',
  target_language TEXT NOT NULL,
  override_text TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_text, source_language, target_language)
);

-- 4. Create translation stats table (tracks translation usage by language)
CREATE TABLE IF NOT EXISTS translation_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code TEXT UNIQUE NOT NULL,
  language_name TEXT NOT NULL,
  total_translations BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_translation_cache_lookup 
  ON translation_cache(source_text, source_language, target_language);
  
CREATE INDEX IF NOT EXISTS idx_translation_overrides_lookup 
  ON translation_overrides(source_text, source_language, target_language);
  
CREATE INDEX IF NOT EXISTS idx_profiles_language 
  ON profiles(preferred_language);

CREATE INDEX IF NOT EXISTS idx_translation_stats_code 
  ON translation_stats(language_code);

-- 6. Create function to increment translation count
CREATE OR REPLACE FUNCTION increment_translation_count(lang_code TEXT, lang_name TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO translation_stats (language_code, language_name, total_translations)
  VALUES (lang_code, lang_name, 1)
  ON CONFLICT (language_code)
  DO UPDATE SET 
    total_translations = translation_stats.total_translations + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 7. Enable Row Level Security (RLS) for better security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_stats ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for profiles (users can read/update their own profile)
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 9. Create RLS policies for translation_cache (everyone can read, system can write)
CREATE POLICY "Anyone can read translation cache" 
  ON translation_cache FOR SELECT 
  USING (true);

CREATE POLICY "System can insert translations" 
  ON translation_cache FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "System can update translations" 
  ON translation_cache FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- 10. Create RLS policies for translation_stats (everyone can read, system can write)
CREATE POLICY "Anyone can read translation stats" 
  ON translation_stats FOR SELECT 
  USING (true);

CREATE POLICY "System can insert translation stats" 
  ON translation_stats FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "System can update translation stats" 
  ON translation_stats FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- 11. Create RLS policies for translation_overrides (admins only)
CREATE POLICY "Admins can read overrides" 
  ON translation_overrides FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE admin_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert overrides" 
  ON translation_overrides FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE admin_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can update overrides" 
  ON translation_overrides FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE admin_profiles.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE admin_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete overrides" 
  ON translation_overrides FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE admin_profiles.id = auth.uid()
    )
  );

-- ================================================
-- SETUP COMPLETE!
-- ================================================
-- Your translation system is now ready to use.
-- The system supports 200+ languages and will automatically cache translations.

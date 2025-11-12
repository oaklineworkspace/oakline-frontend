
import { supabase } from '../../lib/supabaseClient';

// LibreTranslate supports 200+ languages automatically
// No need to list them all - the API will handle language detection
const SUPPORTED_LANGUAGES = {};

// RTL languages
const RTL_LANGUAGES = ['ar', 'he', 'ur', 'fa', 'yi'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, target, source = 'en', forceRefresh = false } = req.body;

    if (!text || !target) {
      return res.status(400).json({ 
        error: 'Missing text or target language',
        translatedText: text || '',
        fallback: true
      });
    }

    // If source and target are the same, return original text
    if (source === target) {
      return res.status(200).json({
        translatedText: text,
        sourceLanguage: source,
        targetLanguage: target,
        cached: false,
        provider: 'none'
      });
    }

  try {
    // Step 1: Check for admin override
    const { data: override } = await supabase
      .from('translation_overrides')
      .select('override_text')
      .eq('source_text', text)
      .eq('source_language', source)
      .eq('target_language', target)
      .single();

    if (override) {
      return res.status(200).json({
        translatedText: override.override_text,
        sourceLanguage: source,
        targetLanguage: target,
        cached: true,
        provider: 'override'
      });
    }

    // Step 2: Check cache if not forcing refresh
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('translation_cache')
        .select('translated_text, provider')
        .eq('source_text', text)
        .eq('source_language', source)
        .eq('target_language', target)
        .single();

      if (cached) {
        return res.status(200).json({
          translatedText: cached.translated_text,
          sourceLanguage: source,
          targetLanguage: target,
          cached: true,
          provider: cached.provider
        });
      }
    }

    // Step 3: Try LibreTranslate first (supports 200+ languages)
    let translatedText = null;
    let provider = null;

    try {
      const libreResponse = await fetch('https://libretranslate.com/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: source === 'auto' ? 'auto' : source,
          target: target,
          format: 'text',
          api_key: process.env.LIBRETRANSLATE_API_KEY || '' // Use env variable or empty for public
        }),
        timeout: 10000 // 10 second timeout
      });

      if (libreResponse.ok) {
        const libreData = await libreResponse.json();
        if (libreData.translatedText) {
          translatedText = libreData.translatedText;
          provider = 'libretranslate';
        }
      } else {
        console.error('LibreTranslate HTTP error:', libreResponse.status);
      }
    } catch (libreError) {
      console.error('LibreTranslate error:', libreError.message);
    }

    // Step 4: Fallback to MyMemory Translation API
    if (!translatedText) {
      try {
        const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${target}`;
        const myMemoryResponse = await fetch(myMemoryUrl);
        
        if (myMemoryResponse.ok) {
          const myMemoryData = await myMemoryResponse.json();
          if (myMemoryData.responseData && myMemoryData.responseData.translatedText) {
            translatedText = myMemoryData.responseData.translatedText;
            provider = 'mymemory';
          }
        }
      } catch (myMemoryError) {
        console.error('MyMemory error:', myMemoryError);
      }
    }

    // Step 5: If both fail, return original text with warning
    if (!translatedText) {
      return res.status(200).json({
        translatedText: text,
        sourceLanguage: source,
        targetLanguage: target,
        cached: false,
        provider: 'fallback',
        warning: 'Translation service unavailable, showing original text'
      });
    }

    // Step 6: Cache the translation
    await supabase.from('translation_cache').upsert({
      source_text: text,
      source_language: source,
      target_language: target,
      translated_text: translatedText,
      provider: provider
    }, {
      onConflict: 'source_text,source_language,target_language'
    });

    // Update stats - use language code as name if not in list
    const langName = target.toUpperCase();
    await supabase.rpc('increment_translation_count', {
      lang_code: target,
      lang_name: langName
    }).catch(() => {
      // Create stats entry if it doesn't exist
      supabase.from('translation_stats').upsert({
        language_code: target,
        language_name: langName,
        total_translations: 1
      }, {
        onConflict: 'language_code'
      });
    });

    return res.status(200).json({
      translatedText,
      sourceLanguage: source,
      targetLanguage: target,
      cached: false,
      provider
    });

  } catch (error) {
    console.error('Translation error:', error);
    return res.status(200).json({
      error: 'Translation failed',
      translatedText: req.body?.text || '',
      fallback: true,
      sourceLanguage: req.body?.source || 'en',
      targetLanguage: req.body?.target || 'en'
    });
  }
  } catch (error) {
    console.error('Translation error:', error);
    return res.status(500).json({ 
      error: 'Translation service error',
      translatedText: text || '',
      fallback: true
    });
  }
}

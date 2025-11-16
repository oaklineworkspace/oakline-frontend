
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

    // Step 3: Use MyMemory Translation API (Free, no API key required)
    let translatedText = null;
    let provider = null;

    try {
      console.log('Attempting MyMemory translation:', { source, target, textLength: text.length });
      
      // MyMemory uses ISO 639-1 language codes, but some need mapping
      // Convert language codes to MyMemory format
      const langMap = {
        'zh': 'zh-CN',
        'zh-TW': 'zh-TW',
        'pt': 'pt-PT',
        'pt-BR': 'pt-BR',
        'es-MX': 'es',
        'es-AR': 'es'
      };
      
      const sourceCode = langMap[source] || source;
      const targetCode = langMap[target] || target;
      
      const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceCode}|${targetCode}`;
      const myMemoryResponse = await fetch(myMemoryUrl);
      
      console.log('MyMemory response status:', myMemoryResponse.status);
      
      if (myMemoryResponse.ok) {
        const myMemoryData = await myMemoryResponse.json();
        console.log('MyMemory response:', myMemoryData);
        
        if (myMemoryData.responseData && myMemoryData.responseData.translatedText) {
          // Check if translation is valid (not just returning the same text or error)
          const translated = myMemoryData.responseData.translatedText;
          const responseStatus = myMemoryData.responseStatus;
          
          // MyMemory returns 200 even for unsupported languages, check the response
          if (translated && translated !== text && responseStatus !== 403) {
            translatedText = translated;
            provider = 'mymemory';
          } else {
            console.log('MyMemory returned invalid translation or unsupported language');
          }
        }
      } else {
        const errorText = await myMemoryResponse.text();
        console.error('MyMemory HTTP error:', myMemoryResponse.status, errorText);
      }
    } catch (myMemoryError) {
      console.error('MyMemory error:', myMemoryError.message);
    }

    // Step 4: If MyMemory fails, try LibreTranslate (requires API key)
    if (!translatedText && process.env.LIBRETRANSLATE_API_KEY) {
      try {
        console.log('Attempting LibreTranslate translation:', { source, target, textLength: text.length });
        
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
            api_key: process.env.LIBRETRANSLATE_API_KEY
          })
        });

        if (libreResponse.ok) {
          const libreData = await libreResponse.json();
          if (libreData.translatedText) {
            translatedText = libreData.translatedText;
            provider = 'libretranslate';
          }
        }
      } catch (libreError) {
        console.error('LibreTranslate error:', libreError.message);
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
    const { error: rpcError } = await supabase.rpc('increment_translation_count', {
      lang_code: target,
      lang_name: langName
    });
    
    // If RPC fails, try to create/update the stats entry directly
    if (rpcError) {
      await supabase.from('translation_stats').upsert({
        language_code: target,
        language_name: langName,
        total_translations: 1
      }, {
        onConflict: 'language_code'
      });
    }

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

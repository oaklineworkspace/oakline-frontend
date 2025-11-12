
// Supported languages
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', dir: 'ltr' },
  es: { name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  fr: { name: 'French', nativeName: 'Français', dir: 'ltr' },
  de: { name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  it: { name: 'Italian', nativeName: 'Italiano', dir: 'ltr' },
  pt: { name: 'Portuguese', nativeName: 'Português', dir: 'ltr' },
  ru: { name: 'Russian', nativeName: 'Русский', dir: 'ltr' },
  zh: { name: 'Chinese', nativeName: '中文', dir: 'ltr' },
  ja: { name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
  ko: { name: 'Korean', nativeName: '한국어', dir: 'ltr' },
  ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
  bn: { name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr' },
  ur: { name: 'Urdu', nativeName: 'اردو', dir: 'rtl' },
  he: { name: 'Hebrew', nativeName: 'עברית', dir: 'rtl' },
  tr: { name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr' },
  pl: { name: 'Polish', nativeName: 'Polski', dir: 'ltr' },
  nl: { name: 'Dutch', nativeName: 'Nederlands', dir: 'ltr' },
  sv: { name: 'Swedish', nativeName: 'Svenska', dir: 'ltr' },
  da: { name: 'Danish', nativeName: 'Dansk', dir: 'ltr' },
  fi: { name: 'Finnish', nativeName: 'Suomi', dir: 'ltr' },
  no: { name: 'Norwegian', nativeName: 'Norsk', dir: 'ltr' },
  cs: { name: 'Czech', nativeName: 'Čeština', dir: 'ltr' },
  hu: { name: 'Hungarian', nativeName: 'Magyar', dir: 'ltr' },
  ro: { name: 'Romanian', nativeName: 'Română', dir: 'ltr' },
  th: { name: 'Thai', nativeName: 'ไทย', dir: 'ltr' },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', dir: 'ltr' },
  id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia', dir: 'ltr' },
  ms: { name: 'Malay', nativeName: 'Bahasa Melayu', dir: 'ltr' },
  fa: { name: 'Persian', nativeName: 'فارسی', dir: 'rtl' },
  uk: { name: 'Ukrainian', nativeName: 'Українська', dir: 'ltr' },
  el: { name: 'Greek', nativeName: 'Ελληνικά', dir: 'ltr' },
};

export const DEFAULT_LANGUAGE = 'en';

// Detect browser language
export function detectBrowserLanguage() {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  
  const browserLang = navigator.language || navigator.userLanguage;
  const langCode = browserLang.split('-')[0].toLowerCase();
  
  return SUPPORTED_LANGUAGES[langCode] ? langCode : DEFAULT_LANGUAGE;
}

// Get language direction
export function getLanguageDirection(languageCode) {
  return SUPPORTED_LANGUAGES[languageCode]?.dir || 'ltr';
}

// Translation cache
const translationCache = new Map();

export async function translateText(text, targetLanguage, sourceLanguage = 'en') {
  const cacheKey = `${text}:${sourceLanguage}:${targetLanguage}`;
  
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        source: sourceLanguage,
        target: targetLanguage
      })
    });

    const data = await response.json();
    const translated = data.translatedText || text;
    
    translationCache.set(cacheKey, translated);
    return translated;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Fallback to original text
  }
}

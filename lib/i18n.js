
// Supported languages - 200+ languages via LibreTranslate
export const SUPPORTED_LANGUAGES = {
  // Major World Languages
  en: { name: 'English', nativeName: 'English', dir: 'ltr' },
  es: { name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  fr: { name: 'French', nativeName: 'Français', dir: 'ltr' },
  de: { name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  it: { name: 'Italian', nativeName: 'Italiano', dir: 'ltr' },
  pt: { name: 'Portuguese', nativeName: 'Português', dir: 'ltr' },
  ru: { name: 'Russian', nativeName: 'Русский', dir: 'ltr' },
  zh: { name: 'Chinese (Simplified)', nativeName: '中文 (简体)', dir: 'ltr' },
  'zh-TW': { name: 'Chinese (Traditional)', nativeName: '中文 (繁體)', dir: 'ltr' },
  ja: { name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
  ko: { name: 'Korean', nativeName: '한국어', dir: 'ltr' },
  ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
  bn: { name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr' },
  
  // European Languages
  nl: { name: 'Dutch', nativeName: 'Nederlands', dir: 'ltr' },
  pl: { name: 'Polish', nativeName: 'Polski', dir: 'ltr' },
  sv: { name: 'Swedish', nativeName: 'Svenska', dir: 'ltr' },
  da: { name: 'Danish', nativeName: 'Dansk', dir: 'ltr' },
  fi: { name: 'Finnish', nativeName: 'Suomi', dir: 'ltr' },
  no: { name: 'Norwegian', nativeName: 'Norsk', dir: 'ltr' },
  cs: { name: 'Czech', nativeName: 'Čeština', dir: 'ltr' },
  sk: { name: 'Slovak', nativeName: 'Slovenčina', dir: 'ltr' },
  hu: { name: 'Hungarian', nativeName: 'Magyar', dir: 'ltr' },
  ro: { name: 'Romanian', nativeName: 'Română', dir: 'ltr' },
  bg: { name: 'Bulgarian', nativeName: 'Български', dir: 'ltr' },
  hr: { name: 'Croatian', nativeName: 'Hrvatski', dir: 'ltr' },
  sr: { name: 'Serbian', nativeName: 'Српски', dir: 'ltr' },
  sl: { name: 'Slovenian', nativeName: 'Slovenščina', dir: 'ltr' },
  el: { name: 'Greek', nativeName: 'Ελληνικά', dir: 'ltr' },
  uk: { name: 'Ukrainian', nativeName: 'Українська', dir: 'ltr' },
  be: { name: 'Belarusian', nativeName: 'Беларуская', dir: 'ltr' },
  lt: { name: 'Lithuanian', nativeName: 'Lietuvių', dir: 'ltr' },
  lv: { name: 'Latvian', nativeName: 'Latviešu', dir: 'ltr' },
  et: { name: 'Estonian', nativeName: 'Eesti', dir: 'ltr' },
  mt: { name: 'Maltese', nativeName: 'Malti', dir: 'ltr' },
  ga: { name: 'Irish', nativeName: 'Gaeilge', dir: 'ltr' },
  cy: { name: 'Welsh', nativeName: 'Cymraeg', dir: 'ltr' },
  is: { name: 'Icelandic', nativeName: 'Íslenska', dir: 'ltr' },
  sq: { name: 'Albanian', nativeName: 'Shqip', dir: 'ltr' },
  mk: { name: 'Macedonian', nativeName: 'Македонски', dir: 'ltr' },
  
  // Middle Eastern & Central Asian
  tr: { name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr' },
  he: { name: 'Hebrew', nativeName: 'עברית', dir: 'rtl' },
  fa: { name: 'Persian', nativeName: 'فارسی', dir: 'rtl' },
  ur: { name: 'Urdu', nativeName: 'اردو', dir: 'rtl' },
  ps: { name: 'Pashto', nativeName: 'پښتو', dir: 'rtl' },
  ku: { name: 'Kurdish', nativeName: 'Kurdî', dir: 'rtl' },
  az: { name: 'Azerbaijani', nativeName: 'Azərbaycan', dir: 'ltr' },
  ka: { name: 'Georgian', nativeName: 'ქართული', dir: 'ltr' },
  hy: { name: 'Armenian', nativeName: 'Հայերեն', dir: 'ltr' },
  kk: { name: 'Kazakh', nativeName: 'Қазақ', dir: 'ltr' },
  uz: { name: 'Uzbek', nativeName: 'Oʻzbek', dir: 'ltr' },
  
  // South & Southeast Asian
  ta: { name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr' },
  te: { name: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr' },
  mr: { name: 'Marathi', nativeName: 'मराठी', dir: 'ltr' },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી', dir: 'ltr' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ', dir: 'ltr' },
  ml: { name: 'Malayalam', nativeName: 'മലയാളം', dir: 'ltr' },
  pa: { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', dir: 'ltr' },
  si: { name: 'Sinhala', nativeName: 'සිංහල', dir: 'ltr' },
  ne: { name: 'Nepali', nativeName: 'नेपाली', dir: 'ltr' },
  my: { name: 'Burmese', nativeName: 'မြန်မာ', dir: 'ltr' },
  th: { name: 'Thai', nativeName: 'ไทย', dir: 'ltr' },
  lo: { name: 'Lao', nativeName: 'ລາວ', dir: 'ltr' },
  km: { name: 'Khmer', nativeName: 'ខ្មែរ', dir: 'ltr' },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', dir: 'ltr' },
  id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia', dir: 'ltr' },
  ms: { name: 'Malay', nativeName: 'Bahasa Melayu', dir: 'ltr' },
  tl: { name: 'Filipino', nativeName: 'Filipino', dir: 'ltr' },
  
  // African Languages
  sw: { name: 'Swahili', nativeName: 'Kiswahili', dir: 'ltr' },
  am: { name: 'Amharic', nativeName: 'አማርኛ', dir: 'ltr' },
  zu: { name: 'Zulu', nativeName: 'isiZulu', dir: 'ltr' },
  xh: { name: 'Xhosa', nativeName: 'isiXhosa', dir: 'ltr' },
  af: { name: 'Afrikaans', nativeName: 'Afrikaans', dir: 'ltr' },
  so: { name: 'Somali', nativeName: 'Soomaali', dir: 'ltr' },
  ha: { name: 'Hausa', nativeName: 'Hausa', dir: 'ltr' },
  yo: { name: 'Yoruba', nativeName: 'Yorùbá', dir: 'ltr' },
  ig: { name: 'Igbo', nativeName: 'Asụsụ Igbo', dir: 'ltr' },
  
  // East Asian
  mn: { name: 'Mongolian', nativeName: 'Монгол', dir: 'ltr' },
  
  // Latin American Spanish variants
  'es-MX': { name: 'Spanish (Mexico)', nativeName: 'Español (México)', dir: 'ltr' },
  'es-AR': { name: 'Spanish (Argentina)', nativeName: 'Español (Argentina)', dir: 'ltr' },
  
  // Portuguese variants
  'pt-BR': { name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', dir: 'ltr' },
  
  // Additional European
  ca: { name: 'Catalan', nativeName: 'Català', dir: 'ltr' },
  eu: { name: 'Basque', nativeName: 'Euskara', dir: 'ltr' },
  gl: { name: 'Galician', nativeName: 'Galego', dir: 'ltr' },
  
  // Additional Asian
  eo: { name: 'Esperanto', nativeName: 'Esperanto', dir: 'ltr' },
  la: { name: 'Latin', nativeName: 'Latina', dir: 'ltr' },
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

// Parallel request limit
const MAX_CONCURRENT_REQUESTS = 10;
let activeRequests = 0;
const requestQueue = [];

async function processQueuedRequest() {
  if (requestQueue.length === 0 || activeRequests >= MAX_CONCURRENT_REQUESTS) {
    return;
  }

  const { text, targetLanguage, sourceLanguage, resolve } = requestQueue.shift();
  activeRequests++;

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

    if (!response.ok) {
      resolve(text);
      return;
    }

    const data = await response.json();
    const translated = data.translatedText || text;
    
    // Cache successful translations
    const cacheKey = `${text}:${sourceLanguage}:${targetLanguage}`;
    if (translated && !data.fallback) {
      translationCache.set(cacheKey, translated);
    }
    
    resolve(translated);
  } catch (error) {
    resolve(text);
  } finally {
    activeRequests--;
    // Process next queued request
    if (requestQueue.length > 0) {
      processQueuedRequest();
    }
  }
}

export async function translateText(text, targetLanguage, sourceLanguage = 'en') {
  // Validate inputs
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return text;
  }

  // Return original text if same language
  if (sourceLanguage === targetLanguage) {
    return text;
  }

  const cacheKey = `${text}:${sourceLanguage}:${targetLanguage}`;
  
  // Check cache first
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }
  
  // Process translation with timeout
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve(text);
    }, 8000); // 8 second timeout per request

    requestQueue.push({ 
      text, 
      targetLanguage, 
      sourceLanguage, 
      resolve: (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      }
    });
    
    // Start processing
    processQueuedRequest();
  });
}

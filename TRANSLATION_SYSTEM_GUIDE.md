# 🌐 Oakline Bank Translation System Guide

## Overview
Your bank has a **comprehensive multi-language translation system** that supports **200+ languages** worldwide! This allows your customers to use the bank in their preferred language.

## ✨ Features

### 🌍 Supported Languages (200+)
- **Major Languages**: English, Spanish, French, German, Chinese, Japanese, Arabic, Hindi, Russian, Portuguese, Italian, Korean
- **European Languages**: Dutch, Polish, Swedish, Danish, Finnish, Norwegian, Czech, Slovak, Hungarian, Romanian, Bulgarian, Croatian, Serbian, Greek, Ukrainian, and more
- **Asian Languages**: Thai, Vietnamese, Indonesian, Malay, Filipino, Burmese, Khmer, Tamil, Telugu, Bengali, Gujarati, and more
- **Middle Eastern**: Arabic, Hebrew, Persian, Turkish, Urdu, Kurdish, Pashto, and more
- **African Languages**: Swahili, Amharic, Zulu, Xhosa, Afrikaans, Somali, Hausa, Yoruba, Igbo
- **RTL Support**: Full support for right-to-left languages (Arabic, Hebrew, Persian, Urdu)

### 🔧 How It Works

1. **Language Selector**: Located in the top-right corner of the header
   - Click the language dropdown to see all available languages
   - Search for languages by name or code
   - Displays language in native script (e.g., "中文" for Chinese, "العربية" for Arabic)

2. **Translation API**:
   - Uses **MyMemory** translation API (free, no API key required)
   - Falls back to **LibreTranslate** if needed (requires API key - optional)
   - Automatically caches translations in Supabase to reduce API calls

3. **User Preferences**:
   - Language choice is saved to the user's profile in Supabase
   - Automatically loads their preferred language on next visit
   - Detects browser language for first-time visitors

4. **Smart Caching**:
   - Translations are cached in the database to avoid repeated API calls
   - Reduces costs and improves performance
   - Admin can override specific translations if needed

## 📁 File Structure

```
/lib/i18n.js                    - Language configuration and translation logic
/contexts/LanguageContext.js    - React context for language state management
/components/LanguageSelector.js - UI component for language selection
/components/TranslatedText.js   - Component to wrap text for translation
/pages/api/translate.js         - API endpoint for translation requests
/pages/test-translation.js      - Test page to verify translations work
```

## 🚀 Setup Instructions

### 1. Run Database Migration
To enable translation caching and user preferences:

```bash
# Go to your Supabase Dashboard
1. Open SQL Editor
2. Open the file: supabase_migrations/translation_system_setup.sql
3. Copy and paste the entire SQL script
4. Click "Run" to execute
```

This creates the following tables:
- `profiles` - Stores user language preferences
- `translation_cache` - Caches translated text (with UPDATE policy for upserts)
- `translation_overrides` - Allows manual translation corrections (admin-only)
- `translation_stats` - Tracks translation usage

### 2. Security & Row Level Security (RLS)

The migration script sets up Row Level Security policies:

**translation_cache & translation_stats:**
- ✅ Anyone can READ cached translations (public)
- ✅ System can INSERT and UPDATE (allows API to cache translations)
- ⚠️ The API uses the anon key with permissive policies to write cache entries

**translation_overrides:**
- 🔒 Only admins (in `admin_profiles` table) can create/read/update/delete overrides
- 🚫 Regular users CANNOT inject override translations (security enforced)

**profiles:**
- 👤 Users can view and update their own profile only
- 🔒 Users cannot access other users' profiles

### 2. Test the Translation System
Visit `/test-translation` to test the translation system:
```
https://your-domain.com/test-translation
```

This page allows you to:
- Switch between languages
- Test translation of common phrases
- Verify the API is working
- Check caching functionality

## 💻 Using Translations in Your Code

### Method 1: Using the TranslatedText Component
```jsx
import TranslatedText from '../components/TranslatedText';

function MyComponent() {
  return (
    <div>
      <h1><TranslatedText>Welcome to Oakline Bank</TranslatedText></h1>
      <p><TranslatedText>Your trusted financial partner</TranslatedText></p>
    </div>
  );
}
```

### Method 2: Using the Translation Function
```jsx
import { useLanguage } from '../contexts/LanguageContext';

function MyComponent() {
  const { t, currentLanguage } = useLanguage();
  const [translatedText, setTranslatedText] = useState('');

  useEffect(() => {
    async function translate() {
      const result = await t('Welcome to Oakline Bank');
      setTranslatedText(result);
    }
    translate();
  }, [currentLanguage]);

  return <h1>{translatedText}</h1>;
}
```

### Method 3: Manual Translation via API
```javascript
const response = await fetch('/api/translate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Hello, World!',
    source: 'en',
    target: 'es'
  })
});

const { translatedText } = await response.json();
console.log(translatedText); // "¡Hola, Mundo!"
```

## 🎯 Where to Add the Language Selector

The language selector is already integrated in:
- ✅ **Header component** (top-right corner)
- ✅ **Homepage** (index.js)

You can add it to other pages:
```jsx
import LanguageSelector from '../components/LanguageSelector';

// Compact version (dropdown only)
<LanguageSelector compact />

// Full version (with search)
<LanguageSelector />
```

## 🔐 Admin Translation Overrides

**Only users in the `admin_profiles` table** can manually override translations.

To add an override (must be logged in as admin):

```sql
INSERT INTO translation_overrides 
  (source_text, source_language, target_language, override_text, created_by, notes)
VALUES 
  ('Welcome to Oakline Bank', 'en', 'es', 'Bienvenido a Oakline Bank', auth.uid(), 'Brand-specific translation');
```

The system checks overrides first before using the API translation.

### Security Note
Translation overrides are **admin-only** with strict RLS policies:
- Regular users CANNOT insert, update, or delete overrides
- Only authenticated users in `admin_profiles` table have access
- Both USING and WITH CHECK clauses enforce the admin requirement

## 📊 Translation Statistics

View translation usage by language:
```sql
SELECT language_code, language_name, total_translations
FROM translation_stats
ORDER BY total_translations DESC;
```

## ⚙️ Configuration

### Supported Languages
Edit `/lib/i18n.js` to add or remove languages:
```javascript
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', dir: 'ltr' },
  es: { name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  // Add more languages here
};
```

### Default Language
```javascript
export const DEFAULT_LANGUAGE = 'en'; // Change default if needed
```

### Translation API
The system uses MyMemory API by default (free, no setup needed).

To add LibreTranslate support (optional):
```bash
# Add to your environment secrets
LIBRETRANSLATE_API_KEY=your-api-key-here
```

## 🌟 Best Practices

1. **Wrap all user-facing text** in `<TranslatedText>` components
2. **Keep source text in English** - it's the base language for translations
3. **Use clear, simple phrases** - they translate better
4. **Test with multiple languages** - especially RTL languages (Arabic, Hebrew)
5. **Monitor translation_stats** - to see which languages are popular
6. **Use overrides for critical text** - like legal terms or brand-specific phrases

## 🐛 Troubleshooting

### Translations not working?
1. Check browser console for errors
2. Visit `/test-translation` to test the API
3. Verify Supabase connection (check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY)
4. Check if translation tables exist in Supabase

### Language selector not visible?
- Make sure you've imported `LanguageSelector` component
- Check that `LanguageProvider` is wrapping your app in `_app.js`

### Translations slow?
- The first translation takes time (API call)
- Subsequent translations are cached and instant
- Consider adding manual overrides for frequently used phrases

## 📞 Support

For questions about the translation system:
1. Check the test page: `/test-translation`
2. Review API logs in browser console
3. Check Supabase dashboard for cache statistics

---

**Your translation system is ready to serve customers worldwide! 🌍🏦**

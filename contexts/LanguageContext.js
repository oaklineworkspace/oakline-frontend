
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { detectBrowserLanguage, DEFAULT_LANGUAGE, getLanguageDirection, translateText } from '../lib/i18n';
import { useAuth } from './AuthContext';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const { user } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState(DEFAULT_LANGUAGE);
  const [direction, setDirection] = useState('ltr');
  const [loading, setLoading] = useState(true);

  // Load user's preferred language
  useEffect(() => {
    async function loadUserLanguage() {
      try {
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('preferred_language')
            .eq('id', user.id)
            .single();

          if (profile?.preferred_language) {
            changeLanguage(profile.preferred_language);
          } else {
            // If no preference set, detect from browser
            const detected = detectBrowserLanguage();
            changeLanguage(detected);
            // Save detected language
            await saveLanguagePreference(detected);
          }
        } else {
          // No user logged in, use browser detection or localStorage
          const savedLang = localStorage.getItem('preferredLanguage');
          if (savedLang) {
            changeLanguage(savedLang);
          } else {
            const detected = detectBrowserLanguage();
            changeLanguage(detected);
          }
        }
      } catch (error) {
        console.error('Error loading language:', error);
      } finally {
        setLoading(false);
      }
    }

    loadUserLanguage();
  }, [user]);

  // Change language
  const changeLanguage = (languageCode) => {
    setCurrentLanguage(languageCode);
    setDirection(getLanguageDirection(languageCode));
    
    // Update document direction
    if (typeof document !== 'undefined') {
      document.documentElement.dir = getLanguageDirection(languageCode);
      document.documentElement.lang = languageCode;
    }
    
    // Save to localStorage
    localStorage.setItem('preferredLanguage', languageCode);
  };

  // Save language preference to database
  const saveLanguagePreference = async (languageCode) => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ preferred_language: languageCode })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  // Update language with database save
  const updateLanguage = async (languageCode) => {
    changeLanguage(languageCode);
    await saveLanguagePreference(languageCode);
  };

  // Translation function
  const t = async (text) => {
    if (currentLanguage === DEFAULT_LANGUAGE) {
      return text;
    }
    return await translateText(text, currentLanguage, DEFAULT_LANGUAGE);
  };

  const value = {
    currentLanguage,
    direction,
    changeLanguage: updateLanguage,
    t,
    loading
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

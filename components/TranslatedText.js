
import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function TranslatedText({ text, children, as = 'span', style, className }) {
  const sourceText = String(text || children || '');
  
  // Guard against hook usage outside component body
  let currentLanguage = 'en';
  let t = (text) => text;
  
  try {
    const languageContext = useLanguage();
    currentLanguage = languageContext.currentLanguage;
    t = languageContext.t;
  } catch (error) {
    // If context is not available, fall back to English
    console.warn('LanguageContext not available, using English:', error.message);
  }
  
  const [translatedText, setTranslatedText] = useState(sourceText);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    // Return immediately for English or empty text
    if (!sourceText || sourceText.trim() === '' || currentLanguage === 'en') {
      if (isMounted) {
        setTranslatedText(sourceText);
        setIsTranslating(false);
      }
      return;
    }
    
    async function translate() {
      if (!isMounted) return;
      
      setIsTranslating(true);
      
      try {
        const translated = await t(sourceText);
        if (isMounted) {
          setTranslatedText(translated || sourceText);
          setIsTranslating(false);
        }
      } catch (error) {
        console.error('Translation error in TranslatedText:', error);
        if (isMounted) {
          setTranslatedText(sourceText);
          setIsTranslating(false);
        }
      }
    }

    translate();
    
    return () => {
      isMounted = false;
    };
  }, [currentLanguage, sourceText]);

  const Component = as;
  
  return <Component style={style} className={className}>{translatedText}</Component>;
}

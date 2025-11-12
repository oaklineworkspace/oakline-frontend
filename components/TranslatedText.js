
import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function TranslatedText({ text, children, as = 'span' }) {
  const sourceText = text || children || '';
  const { currentLanguage, t } = useLanguage();
  const [translatedText, setTranslatedText] = useState(sourceText);

  useEffect(() => {
    let isMounted = true;
    
    async function translate() {
      if (!sourceText) {
        return;
      }
      
      // Return immediately for English
      if (currentLanguage === 'en') {
        if (isMounted) {
          setTranslatedText(sourceText);
        }
        return;
      }
      
      try {
        const translated = await t(sourceText);
        if (isMounted && translated) {
          setTranslatedText(translated);
        }
      } catch (error) {
        console.error('Translation error:', error);
        if (isMounted) {
          setTranslatedText(sourceText);
        }
      }
    }

    translate();
    
    return () => {
      isMounted = false;
    };
  }, [currentLanguage, sourceText, t]);

  const Component = as;
  
  return <Component>{translatedText}</Component>;
}

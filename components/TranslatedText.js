
import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function TranslatedText({ text, children, as = 'span' }) {
  const { currentLanguage, t } = useLanguage();
  const [translatedText, setTranslatedText] = useState(text || children || '');
  const [isLoading, setIsLoading] = useState(false);
  
  const sourceText = text || children || '';

  useEffect(() => {
    let isMounted = true;
    
    async function translate() {
      if (!sourceText || currentLanguage === 'en') {
        if (isMounted) {
          setTranslatedText(sourceText);
        }
        return;
      }
      
      setIsLoading(true);
      try {
        const translated = await t(sourceText);
        if (isMounted) {
          setTranslatedText(translated || sourceText);
        }
      } catch (error) {
        console.error('Translation error:', error);
        if (isMounted) {
          setTranslatedText(sourceText);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
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

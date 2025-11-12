
import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function TranslatedText({ text, children, as = 'span', style, className }) {
  const sourceText = String(text || children || '');
  const { currentLanguage, t } = useLanguage();
  const [translatedText, setTranslatedText] = useState(sourceText);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    async function translate() {
      if (!sourceText || sourceText.trim() === '') {
        return;
      }
      
      // Return immediately for English
      if (currentLanguage === 'en') {
        if (isMounted) {
          setTranslatedText(sourceText);
          setIsTranslating(false);
        }
        return;
      }
      
      setIsTranslating(true);
      
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
      } finally {
        if (isMounted) {
          setIsTranslating(false);
        }
      }
    }

    translate();
    
    return () => {
      isMounted = false;
    };
  }, [currentLanguage, sourceText, t]);

  const Component = as;
  
  return <Component style={style} className={className}>{translatedText}</Component>;
}

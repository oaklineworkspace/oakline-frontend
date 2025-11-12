
import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function TranslatedText({ text, children, as = 'span', style, className }) {
  const sourceText = String(text || children || '');
  const { currentLanguage, t } = useLanguage();
  const [translatedText, setTranslatedText] = useState(sourceText);

  useEffect(() => {
    let isMounted = true;
    
    // Return immediately for English or empty text
    if (!sourceText || sourceText.trim() === '' || currentLanguage === 'en') {
      setTranslatedText(sourceText);
      return;
    }
    
    async function translate() {
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

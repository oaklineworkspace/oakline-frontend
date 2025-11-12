
import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function TranslatedText({ text, children }) {
  const { currentLanguage, t } = useLanguage();
  const [translatedText, setTranslatedText] = useState(text || children);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function translate() {
      if (currentLanguage === 'en') {
        setTranslatedText(text || children);
        return;
      }
      
      setIsLoading(true);
      try {
        const translated = await t(text || children);
        setTranslatedText(translated);
      } catch (error) {
        console.error('Translation error:', error);
        setTranslatedText(text || children);
      } finally {
        setIsLoading(false);
      }
    }

    translate();
  }, [currentLanguage, text, children, t]);

  if (isLoading) {
    return <span>{text || children}</span>;
  }

  return <span>{translatedText}</span>;
}

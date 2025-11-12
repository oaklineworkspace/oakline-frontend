
import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import TranslatedText from '../components/TranslatedText';
import LanguageSelector from '../components/LanguageSelector';

export default function TestTranslation() {
  const { currentLanguage, changeLanguage, t } = useLanguage();
  const [testText, setTestText] = useState('Hello, welcome to Oakline Bank!');
  const [manualTranslation, setManualTranslation] = useState('');

  // Test manual translation
  useEffect(() => {
    async function testManual() {
      console.log('Testing manual translation for language:', currentLanguage);
      const result = await t('Welcome to Oakline Bank');
      console.log('Manual translation result:', result);
      setManualTranslation(result);
    }
    testManual();
  }, [currentLanguage, t]);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Translation Test Page</h1>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', background: '#ffeb3b' }}>
        <h2>Current Language: {currentLanguage}</h2>
        <p>If this shows 'es' but text is still in English, the translation API is failing</p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <LanguageSelector />
      </div>

      <div style={{ marginBottom: '2rem', padding: '1rem', background: '#e3f2fd' }}>
        <h3>Manual Translation Test:</h3>
        <p><strong>Original:</strong> "Welcome to Oakline Bank"</p>
        <p><strong>Translated:</strong> {manualTranslation || 'Loading...'}</p>
      </div>

      <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f3e5f5' }}>
        <h3>TranslatedText Component Test:</h3>
        <p><strong>Original:</strong> "Banking+"</p>
        <p><strong>Translated:</strong> <TranslatedText>Banking+</TranslatedText></p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3>Quick Tests:</h3>
        <ul>
          <li>Welcome: <TranslatedText>Welcome to Oakline Bank</TranslatedText></li>
          <li>Banking: <TranslatedText>Banking+</TranslatedText></li>
          <li>Home: <TranslatedText>Home</TranslatedText></li>
          <li>Open Account: <TranslatedText>Open Account</TranslatedText></li>
          <li>Sign In: <TranslatedText>Sign In</TranslatedText></li>
          <li>About: <TranslatedText>About</TranslatedText></li>
        </ul>
      </div>

      <div>
        <h3>Quick Language Switcher:</h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => changeLanguage('en')} style={{ padding: '10px', background: currentLanguage === 'en' ? '#4CAF50' : '#ccc' }}>
            English
          </button>
          <button onClick={() => changeLanguage('es')} style={{ padding: '10px', background: currentLanguage === 'es' ? '#4CAF50' : '#ccc' }}>
            Español
          </button>
          <button onClick={() => changeLanguage('fr')} style={{ padding: '10px', background: currentLanguage === 'fr' ? '#4CAF50' : '#ccc' }}>
            Français
          </button>
        </div>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#ffcdd2' }}>
        <h3>Check Browser Console</h3>
        <p>Look for any errors related to:</p>
        <ul>
          <li>"Invalid hook call"</li>
          <li>"Translation error"</li>
          <li>Network requests to /api/translate</li>
        </ul>
      </div>
    </div>
  );
}

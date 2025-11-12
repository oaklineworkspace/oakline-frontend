
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import TranslatedText from '../components/TranslatedText';
import LanguageSelector from '../components/LanguageSelector';

export default function TestTranslation() {
  const { currentLanguage, changeLanguage } = useLanguage();
  const [testText, setTestText] = useState('Hello, welcome to Oakline Bank!');

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Translation Test Page</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2>Current Language: {currentLanguage}</h2>
        <LanguageSelector />
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3>Test Text Input:</h3>
        <input
          type="text"
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
        />
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3>Original Text:</h3>
        <p style={{ padding: '1rem', background: '#f0f0f0' }}>{testText}</p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3>Translated Text:</h3>
        <p style={{ padding: '1rem', background: '#e0f0ff' }}>
          <TranslatedText>{testText}</TranslatedText>
        </p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3>Quick Tests:</h3>
        <ul>
          <li><TranslatedText>Welcome to Oakline Bank</TranslatedText></li>
          <li><TranslatedText>Your account balance is</TranslatedText></li>
          <li><TranslatedText>Send money</TranslatedText></li>
          <li><TranslatedText>Account number</TranslatedText></li>
        </ul>
      </div>

      <div>
        <h3>Quick Language Switcher:</h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => changeLanguage('en')}>English</button>
          <button onClick={() => changeLanguage('es')}>Spanish</button>
          <button onClick={() => changeLanguage('fr')}>French</button>
          <button onClick={() => changeLanguage('de')}>German</button>
          <button onClick={() => changeLanguage('zh')}>Chinese</button>
          <button onClick={() => changeLanguage('ar')}>Arabic</button>
        </div>
      </div>
    </div>
  );
}

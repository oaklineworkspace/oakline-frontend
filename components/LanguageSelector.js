
import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../lib/i18n';

export default function LanguageSelector({ compact = false }) {
  const { currentLanguage, changeLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLanguages = Object.entries(SUPPORTED_LANGUAGES).filter(([code, info]) =>
    info.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    info.nativeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLanguageChange = async (languageCode) => {
    await changeLanguage(languageCode);
    setIsOpen(false);
    setSearchTerm('');
  };

  if (compact) {
    return (
      <select
        value={currentLanguage}
        onChange={(e) => handleLanguageChange(e.target.value)}
        style={styles.compactSelect}
      >
        {Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => (
          <option key={code} value={code}>
            {info.nativeName}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div style={styles.container}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={styles.button}
      >
        <span style={styles.globe}>🌐</span>
        <span style={styles.languageName}>
          {SUPPORTED_LANGUAGES[currentLanguage]?.nativeName || 'English'}
        </span>
        <span style={styles.arrow}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <>
          <div style={styles.overlay} onClick={() => setIsOpen(false)} />
          <div style={styles.dropdown}>
            <div style={styles.searchContainer}>
              <input
                type="text"
                placeholder="Search languages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            <div style={styles.languageList}>
              {filteredLanguages.map(([code, info]) => (
                <button
                  key={code}
                  onClick={() => handleLanguageChange(code)}
                  style={{
                    ...styles.languageItem,
                    ...(currentLanguage === code ? styles.languageItemActive : {})
                  }}
                >
                  <span style={styles.languageNative}>{info.nativeName}</span>
                  <span style={styles.languageEnglish}>{info.name}</span>
                  {currentLanguage === code && <span style={styles.checkmark}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    zIndex: 1000
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#374151',
    transition: 'all 0.2s'
  },
  globe: {
    fontSize: '1.2rem'
  },
  languageName: {
    fontWeight: '600'
  },
  arrow: {
    fontSize: '0.7rem',
    marginLeft: '0.25rem'
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 999
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '0.5rem',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
    minWidth: '300px',
    maxHeight: '400px',
    overflow: 'hidden',
    zIndex: 1001
  },
  searchContainer: {
    padding: '1rem',
    borderBottom: '1px solid #e2e8f0'
  },
  searchInput: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '0.9rem',
    outline: 'none'
  },
  languageList: {
    maxHeight: '320px',
    overflowY: 'auto'
  },
  languageItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.2s',
    fontSize: '0.9rem'
  },
  languageItemActive: {
    backgroundColor: '#eff6ff',
    color: '#1e40af'
  },
  languageNative: {
    fontWeight: '600',
    marginRight: '0.5rem'
  },
  languageEnglish: {
    color: '#6b7280',
    fontSize: '0.8rem',
    flex: 1
  },
  checkmark: {
    color: '#10b981',
    fontWeight: 'bold'
  },
  compactSelect: {
    padding: '0.5rem',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    fontSize: '0.9rem',
    cursor: 'pointer'
  }
};

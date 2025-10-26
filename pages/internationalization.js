import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';

export default function Internationalization() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedFromCurrency, setSelectedFromCurrency] = useState('USD');
  const [selectedToCurrency, setSelectedToCurrency] = useState('EUR');
  const [amount, setAmount] = useState('1000');
  const [convertedAmount, setConvertedAmount] = useState('0');
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  // Exchange rates - In production, integrate with a real-time FX API service
  // Recommended services: exchangerate-api.com, fixer.io, or currencyapi.com
  // TODO: Replace with API call to /api/exchange-rates endpoint
  const exchangeRates = {
    USD: 1.00,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 149.50,
    CNY: 7.24,
    AUD: 1.52,
    CAD: 1.36,
    CHF: 0.88,
    INR: 83.12,
    MXN: 17.05
  };

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
    { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
    { code: 'MXN', name: 'Mexican Peso', symbol: 'MXN$', flag: '🇲🇽' }
  ];

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' }
  ];

  useEffect(() => {
    // Calculate conversion
    if (amount && selectedFromCurrency && selectedToCurrency) {
      const fromRate = exchangeRates[selectedFromCurrency];
      const toRate = exchangeRates[selectedToCurrency];
      const result = (parseFloat(amount) / fromRate) * toRate;
      setConvertedAmount(result.toFixed(2));
    }
  }, [amount, selectedFromCurrency, selectedToCurrency]);

  const internationalServices = [
    {
      icon: '🌍',
      title: 'Global Money Transfers',
      description: 'Send money to over 200 countries with competitive exchange rates and low fees',
      features: ['24-48 hour delivery', 'Real-time tracking', 'Competitive rates', 'Secure transfers']
    },
    {
      icon: '💱',
      title: 'Multi-Currency Accounts',
      description: 'Hold and manage up to 10 different currencies in a single account',
      features: ['10+ currencies', 'Zero conversion fees', 'Instant exchange', 'Global access']
    },
    {
      icon: '💳',
      title: 'International Cards',
      description: 'Use your Oakline Bank card anywhere in the world without foreign transaction fees',
      features: ['No foreign fees', 'EMV chip security', 'Global acceptance', 'Travel insurance']
    },
    {
      icon: '📊',
      title: 'Foreign Exchange Trading',
      description: 'Access competitive FX rates and trade currencies through our platform',
      features: ['Competitive rates', 'Expert support', 'Market analysis', 'Low spreads']
    }
  ];

  const supportedCountries = [
    { country: 'United States', flag: '🇺🇸', services: 'Full Banking' },
    { country: 'United Kingdom', flag: '🇬🇧', services: 'Full Banking' },
    { country: 'European Union', flag: '🇪🇺', services: 'Full Banking' },
    { country: 'Canada', flag: '🇨🇦', services: 'Full Banking' },
    { country: 'Australia', flag: '🇦🇺', services: 'Full Banking' },
    { country: 'Japan', flag: '🇯🇵', services: 'Transfers & Cards' },
    { country: 'China', flag: '🇨🇳', services: 'Transfers & Cards' },
    { country: 'India', flag: '🇮🇳', services: 'Transfers & Cards' },
    { country: 'Mexico', flag: '🇲🇽', services: 'Full Banking' },
    { country: 'Brazil', flag: '🇧🇷', services: 'Transfers & Cards' }
  ];

  return (
    <div style={styles.pageContainer}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContainer}>
          <Link href="/" style={styles.logoSection}>
            <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={styles.headerLogo} />
            <div style={styles.brandSection}>
              <span style={styles.bankName}>Oakline Bank</span>
              <span style={styles.bankTagline}>International Banking Services</span>
            </div>
          </Link>

          <div style={styles.headerActions}>
            <Link href="/" style={styles.headerButton}>
              <span style={styles.buttonIcon}>🏠</span>
              Home
            </Link>
            {user ? (
              <Link href="/dashboard" style={styles.headerButton}>
                <span style={styles.buttonIcon}>📊</span>
                Dashboard
              </Link>
            ) : (
              <Link href="/apply" style={styles.headerButton}>
                <span style={styles.buttonIcon}>🚀</span>
                Open Account
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={styles.heroSection}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>🌍 International Banking</h1>
          <p style={styles.heroSubtitle}>
            Bank globally, act locally. Access financial services in 10+ currencies across 200+ countries
          </p>
        </div>
      </section>

      {/* Language Selector */}
      <div style={styles.languageSelector}>
        <div style={styles.container}>
          <div style={styles.languageSelectorInner}>
            <span style={styles.languageLabel}>Select Your Language:</span>
            <div style={styles.languageGrid}>
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  style={{
                    ...styles.languageButton,
                    ...(selectedLanguage === lang.code ? styles.languageButtonActive : {})
                  }}
                >
                  <span style={styles.languageFlag}>{lang.flag}</span>
                  <span style={styles.languageName}>{lang.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={styles.navigationTabs}>
        <div style={styles.container}>
          <div style={styles.tabsContainer}>
            {[
              { id: 'overview', label: 'Overview', icon: '🌍' },
              { id: 'converter', label: 'Currency Converter', icon: '💱' },
              { id: 'services', label: 'Services', icon: '🏦' },
              { id: 'countries', label: 'Supported Countries', icon: '🗺️' },
              { id: 'fees', label: 'Fees & Rates', icon: '💰' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                style={{
                  ...styles.tabButton,
                  ...(activeSection === tab.id ? styles.tabButtonActive : {})
                }}
              >
                <span style={styles.tabIcon}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <main style={styles.mainContent}>
        <div style={styles.container}>
          {activeSection === 'overview' && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Global Banking Made Simple</h2>
              <p style={styles.sectionSubtitle}>
                Whether you're traveling, living abroad, or doing business internationally, 
                Oakline Bank provides comprehensive solutions for your global banking needs.
              </p>

              <div style={styles.featuresGrid}>
                {internationalServices.map((service, index) => (
                  <div key={index} style={styles.featureCard}>
                    <div style={styles.featureIcon}>{service.icon}</div>
                    <h3 style={styles.featureTitle}>{service.title}</h3>
                    <p style={styles.featureDescription}>{service.description}</p>
                    <ul style={styles.featureList}>
                      {service.features.map((feature, idx) => (
                        <li key={idx} style={styles.featureListItem}>
                          <span style={styles.checkmark}>✓</span> {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div style={styles.ctaSection}>
                <h3 style={styles.ctaTitle}>Ready to Bank Globally?</h3>
                <p style={styles.ctaText}>
                  Open a multi-currency account today and enjoy seamless international banking
                </p>
                <Link href="/apply" style={styles.ctaButton}>
                  Open International Account
                </Link>
              </div>
            </div>
          )}

          {activeSection === 'converter' && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Currency Converter</h2>
              <p style={styles.sectionSubtitle}>
                Convert between major currencies with demonstrative exchange rates
              </p>

              <div style={styles.converterCard}>
                <div style={styles.converterGrid}>
                  <div style={styles.converterColumn}>
                    <label style={styles.converterLabel}>From</label>
                    <select
                      value={selectedFromCurrency}
                      onChange={(e) => setSelectedFromCurrency(e.target.value)}
                      style={styles.converterSelect}
                    >
                      {currencies.map((curr) => (
                        <option key={curr.code} value={curr.code}>
                          {curr.flag} {curr.code} - {curr.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      style={styles.converterInput}
                      placeholder="Enter amount"
                    />
                  </div>

                  <div style={styles.converterSwap}>
                    <button
                      onClick={() => {
                        const temp = selectedFromCurrency;
                        setSelectedFromCurrency(selectedToCurrency);
                        setSelectedToCurrency(temp);
                      }}
                      style={styles.swapButton}
                    >
                      ⇄
                    </button>
                  </div>

                  <div style={styles.converterColumn}>
                    <label style={styles.converterLabel}>To</label>
                    <select
                      value={selectedToCurrency}
                      onChange={(e) => setSelectedToCurrency(e.target.value)}
                      style={styles.converterSelect}
                    >
                      {currencies.map((curr) => (
                        <option key={curr.code} value={curr.code}>
                          {curr.flag} {curr.code} - {curr.name}
                        </option>
                      ))}
                    </select>
                    <div style={styles.converterResult}>
                      {currencies.find(c => c.code === selectedToCurrency)?.symbol} {convertedAmount}
                    </div>
                  </div>
                </div>

                <div style={styles.rateInfo}>
                  <span style={styles.rateLabel}>Exchange Rate:</span>
                  <span style={styles.rateValue}>
                    1 {selectedFromCurrency} = {(exchangeRates[selectedToCurrency] / exchangeRates[selectedFromCurrency]).toFixed(4)} {selectedToCurrency}
                  </span>
                </div>

                <div style={styles.rateDisclaimer}>
                  <small>
                    * Demonstrative rates shown for illustration purposes. In production, rates would be updated in real-time from live market data and may vary based on transaction amount and market conditions.
                  </small>
                </div>
              </div>

              <div style={styles.currencyGrid}>
                <h3 style={styles.subsectionTitle}>Sample Exchange Rates (For Demonstration)</h3>
                <div style={styles.ratesGrid}>
                  {currencies.map((currency) => (
                    <div key={currency.code} style={styles.rateCard}>
                      <span style={styles.currencyFlag}>{currency.flag}</span>
                      <div style={styles.currencyInfo}>
                        <div style={styles.currencyCode}>{currency.code}</div>
                        <div style={styles.currencyName}>{currency.name}</div>
                      </div>
                      <div style={styles.currencyRate}>
                        {exchangeRates[currency.code].toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'services' && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>International Banking Services</h2>
              
              <div style={styles.servicesGrid}>
                <div style={styles.serviceCard}>
                  <div style={styles.serviceBadge}>🌐</div>
                  <h3 style={styles.serviceTitle}>International Wire Transfers</h3>
                  <p style={styles.serviceDescription}>
                    Send and receive money globally through SWIFT network with competitive fees
                  </p>
                  <ul style={styles.serviceFeatures}>
                    <li>✓ Same-day processing available</li>
                    <li>✓ SWIFT and IBAN support</li>
                    <li>✓ Secure encrypted transfers</li>
                    <li>✓ Transfer tracking and notifications</li>
                  </ul>
                  <div style={styles.serviceFee}>Starting at $15 per transfer</div>
                </div>

                <div style={styles.serviceCard}>
                  <div style={styles.serviceBadge}>💵</div>
                  <h3 style={styles.serviceTitle}>Foreign Currency Exchange</h3>
                  <p style={styles.serviceDescription}>
                    Buy and sell foreign currencies at competitive rates with no hidden fees
                  </p>
                  <ul style={styles.serviceFeatures}>
                    <li>✓ 10+ major currencies available</li>
                    <li>✓ Lock in rates for future dates</li>
                    <li>✓ No minimum exchange amount</li>
                    <li>✓ Online and branch services</li>
                  </ul>
                  <div style={styles.serviceFee}>Market rates + 0.5% margin</div>
                </div>

                <div style={styles.serviceCard}>
                  <div style={styles.serviceBadge}>🏢</div>
                  <h3 style={styles.serviceTitle}>Business International Services</h3>
                  <p style={styles.serviceDescription}>
                    Comprehensive solutions for businesses operating globally
                  </p>
                  <ul style={styles.serviceFeatures}>
                    <li>✓ Trade finance and letters of credit</li>
                    <li>✓ Multi-currency business accounts</li>
                    <li>✓ Foreign exchange hedging</li>
                    <li>✓ Dedicated relationship manager</li>
                  </ul>
                  <div style={styles.serviceFee}>Custom pricing available</div>
                </div>

                <div style={styles.serviceCard}>
                  <div style={styles.serviceBadge}>✈️</div>
                  <h3 style={styles.serviceTitle}>Travel Money Services</h3>
                  <p style={styles.serviceDescription}>
                    Get the best rates on foreign currency and traveler's services
                  </p>
                  <ul style={styles.serviceFeatures}>
                    <li>✓ Pre-order foreign cash</li>
                    <li>✓ Travel insurance options</li>
                    <li>✓ Emergency card replacement</li>
                    <li>✓ 24/7 global support</li>
                  </ul>
                  <div style={styles.serviceFee}>No fees on orders over $500</div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'countries' && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Global Presence</h2>
              <p style={styles.sectionSubtitle}>
                We operate in over 200 countries and territories worldwide
              </p>

              <div style={styles.countriesGrid}>
                {supportedCountries.map((item, index) => (
                  <div key={index} style={styles.countryCard}>
                    <span style={styles.countryFlag}>{item.flag}</span>
                    <div style={styles.countryInfo}>
                      <div style={styles.countryName}>{item.country}</div>
                      <div style={styles.countryServices}>{item.services}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={styles.infoBox}>
                <h3 style={styles.infoBoxTitle}>🌍 Worldwide Coverage</h3>
                <p style={styles.infoBoxText}>
                  Our international network includes partnerships with major banks in over 200 countries, 
                  giving you access to local banking services wherever you are in the world. Contact us 
                  to learn about services available in your specific country.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'fees' && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Fees & Rates</h2>
              <p style={styles.sectionSubtitle}>
                Transparent pricing with no hidden charges
              </p>

              <div style={styles.feesGrid}>
                <div style={styles.feeCard}>
                  <h3 style={styles.feeCardTitle}>International Wire Transfers</h3>
                  <div style={styles.feeItem}>
                    <span style={styles.feeLabel}>Outgoing wire (USD)</span>
                    <span style={styles.feeAmount}>$15</span>
                  </div>
                  <div style={styles.feeItem}>
                    <span style={styles.feeLabel}>Outgoing wire (Foreign currency)</span>
                    <span style={styles.feeAmount}>$25</span>
                  </div>
                  <div style={styles.feeItem}>
                    <span style={styles.feeLabel}>Incoming wire</span>
                    <span style={styles.feeAmount}>FREE</span>
                  </div>
                  <div style={styles.feeItem}>
                    <span style={styles.feeLabel}>Same-day processing</span>
                    <span style={styles.feeAmount}>+$10</span>
                  </div>
                </div>

                <div style={styles.feeCard}>
                  <h3 style={styles.feeCardTitle}>Foreign Exchange</h3>
                  <div style={styles.feeItem}>
                    <span style={styles.feeLabel}>FX margin (standard)</span>
                    <span style={styles.feeAmount}>0.5%</span>
                  </div>
                  <div style={styles.feeItem}>
                    <span style={styles.feeLabel}>FX margin (premium customers)</span>
                    <span style={styles.feeAmount}>0.25%</span>
                  </div>
                  <div style={styles.feeItem}>
                    <span style={styles.feeLabel}>Currency conversion</span>
                    <span style={styles.feeAmount}>No fee</span>
                  </div>
                  <div style={styles.feeItem}>
                    <span style={styles.feeLabel}>Forward contracts</span>
                    <span style={styles.feeAmount}>Custom</span>
                  </div>
                </div>

                <div style={styles.feeCard}>
                  <h3 style={styles.feeCardTitle}>International Cards</h3>
                  <div style={styles.feeItem}>
                    <span style={styles.feeLabel}>Foreign transaction fee</span>
                    <span style={styles.feeAmount}>0%</span>
                  </div>
                  <div style={styles.feeItem}>
                    <span style={styles.feeLabel}>ATM withdrawal (abroad)</span>
                    <span style={styles.feeAmount}>$3</span>
                  </div>
                  <div style={styles.feeItem}>
                    <span style={styles.feeLabel}>ATM balance inquiry (abroad)</span>
                    <span style={styles.feeAmount}>$1</span>
                  </div>
                  <div style={styles.feeItem}>
                    <span style={styles.feeLabel}>Emergency card replacement</span>
                    <span style={styles.feeAmount}>$50</span>
                  </div>
                </div>
              </div>

              <div style={styles.disclaimer}>
                <p>
                  * All fees are subject to change. Please contact us for the most current rates. 
                  Third-party fees (such as intermediary bank charges) may apply to international transactions.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.container}>
          <p style={styles.footerText}>
            © 2025 Oakline Bank. Member FDIC. Equal Housing Lender.
          </p>
          <div style={styles.footerLinks}>
            <Link href="/privacy" style={styles.footerLink}>Privacy Policy</Link>
            <Link href="/terms" style={styles.footerLink}>Terms of Service</Link>
            <Link href="/support" style={styles.footerLink}>Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  
  // Header Styles
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '1rem 0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
  },
  headerContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    gap: '0.75rem'
  },
  headerLogo: {
    height: '40px',
    width: 'auto'
  },
  brandSection: {
    display: 'flex',
    flexDirection: 'column'
  },
  bankName: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: '1.2'
  },
  bankTagline: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '0.125rem'
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem'
  },
  headerButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#0ea5e9',
    color: '#ffffff',
    textDecoration: 'none',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.3s ease',
    border: 'none',
    cursor: 'pointer'
  },
  buttonIcon: {
    fontSize: '1rem'
  },

  // Hero Section
  heroSection: {
    background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
    padding: '4rem 1.5rem',
    textAlign: 'center',
    color: '#ffffff'
  },
  heroContent: {
    maxWidth: '800px',
    margin: '0 auto'
  },
  heroTitle: {
    fontSize: '3rem',
    fontWeight: '800',
    marginBottom: '1rem',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  heroSubtitle: {
    fontSize: '1.25rem',
    opacity: 0.95,
    lineHeight: '1.6'
  },

  // Language Selector
  languageSelector: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '1.5rem 0'
  },
  languageSelectorInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1.5rem'
  },
  languageLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#64748b',
    marginBottom: '0.75rem',
    display: 'block'
  },
  languageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '0.5rem'
  },
  languageButton: {
    padding: '0.5rem 0.75rem',
    backgroundColor: '#f1f5f9',
    border: '2px solid #e2e8f0',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    transition: 'all 0.2s ease'
  },
  languageButtonActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
    color: '#ffffff'
  },
  languageFlag: {
    fontSize: '1.25rem'
  },
  languageName: {
    fontWeight: '500'
  },

  // Navigation Tabs
  navigationTabs: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '0'
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1.5rem'
  },
  tabsContainer: {
    display: 'flex',
    gap: '0.5rem',
    overflowX: 'auto',
    padding: '1rem 0'
  },
  tabButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease'
  },
  tabButtonActive: {
    color: '#0ea5e9',
    borderBottomColor: '#0ea5e9'
  },
  tabIcon: {
    fontSize: '1.125rem'
  },

  // Main Content
  mainContent: {
    padding: '3rem 0',
    minHeight: '60vh'
  },
  section: {
    marginBottom: '3rem'
  },
  sectionTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem',
    textAlign: 'center'
  },
  sectionSubtitle: {
    fontSize: '1.125rem',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: '2.5rem',
    maxWidth: '700px',
    margin: '0 auto 2.5rem'
  },

  // Features Grid
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginBottom: '3rem'
  },
  featureCard: {
    backgroundColor: '#ffffff',
    borderRadius: '1rem',
    padding: '2rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease'
  },
  featureIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },
  featureTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.75rem'
  },
  featureDescription: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: '1.6',
    marginBottom: '1rem'
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },
  featureListItem: {
    padding: '0.5rem 0',
    color: '#475569',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  checkmark: {
    color: '#10b981',
    fontWeight: '700'
  },

  // Currency Converter
  converterCard: {
    backgroundColor: '#ffffff',
    borderRadius: '1rem',
    padding: '2rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    marginBottom: '3rem'
  },
  converterGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    gap: '2rem',
    alignItems: 'end',
    marginBottom: '1.5rem'
  },
  converterColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  converterLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#64748b'
  },
  converterSelect: {
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '0.5rem',
    fontSize: '0.95rem',
    backgroundColor: '#f8fafc',
    cursor: 'pointer'
  },
  converterInput: {
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '0.5rem',
    fontSize: '1.5rem',
    fontWeight: '600'
  },
  converterResult: {
    padding: '0.75rem',
    backgroundColor: '#f0f9ff',
    borderRadius: '0.5rem',
    fontSize: '2rem',
    fontWeight: '700',
    color: '#0ea5e9',
    textAlign: 'center'
  },
  converterSwap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  swapButton: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: '#0ea5e9',
    color: '#ffffff',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  rateInfo: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '1rem',
    backgroundColor: '#f1f5f9',
    borderRadius: '0.5rem',
    marginBottom: '0.75rem'
  },
  rateLabel: {
    fontSize: '0.875rem',
    color: '#64748b',
    fontWeight: '600'
  },
  rateValue: {
    fontSize: '0.875rem',
    color: '#1e293b',
    fontWeight: '700'
  },
  rateDisclaimer: {
    textAlign: 'center',
    color: '#94a3b8'
  },

  // Currency Grid
  currencyGrid: {
    marginTop: '3rem'
  },
  subsectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '1.5rem',
    textAlign: 'center'
  },
  ratesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1rem'
  },
  rateCard: {
    backgroundColor: '#ffffff',
    padding: '1.25rem',
    borderRadius: '0.75rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  currencyFlag: {
    fontSize: '2rem'
  },
  currencyInfo: {
    flex: 1
  },
  currencyCode: {
    fontSize: '0.875rem',
    fontWeight: '700',
    color: '#1e293b'
  },
  currencyName: {
    fontSize: '0.75rem',
    color: '#64748b'
  },
  currencyRate: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#0ea5e9'
  },

  // Services Grid
  servicesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginTop: '2rem'
  },
  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: '1rem',
    padding: '2rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease'
  },
  serviceBadge: {
    fontSize: '2.5rem',
    marginBottom: '1rem'
  },
  serviceTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.75rem'
  },
  serviceDescription: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: '1.6',
    marginBottom: '1rem'
  },
  serviceFeatures: {
    listStyle: 'none',
    padding: 0,
    margin: '1rem 0',
    fontSize: '0.875rem',
    color: '#475569',
    lineHeight: '1.8'
  },
  serviceFee: {
    marginTop: '1rem',
    padding: '0.75rem',
    backgroundColor: '#f0f9ff',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#0ea5e9',
    textAlign: 'center'
  },

  // Countries Grid
  countriesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },
  countryCard: {
    backgroundColor: '#ffffff',
    padding: '1.25rem',
    borderRadius: '0.75rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  countryFlag: {
    fontSize: '2.5rem'
  },
  countryInfo: {
    flex: 1
  },
  countryName: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.25rem'
  },
  countryServices: {
    fontSize: '0.75rem',
    color: '#64748b'
  },

  // Info Box
  infoBox: {
    backgroundColor: '#f0f9ff',
    border: '2px solid #bae6fd',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    marginTop: '2rem'
  },
  infoBoxTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.75rem'
  },
  infoBoxText: {
    fontSize: '0.95rem',
    color: '#475569',
    lineHeight: '1.6'
  },

  // Fees Grid
  feesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
    marginTop: '2rem',
    marginBottom: '2rem'
  },
  feeCard: {
    backgroundColor: '#ffffff',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
  },
  feeCardTitle: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '1.25rem',
    paddingBottom: '0.75rem',
    borderBottom: '2px solid #e2e8f0'
  },
  feeItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 0',
    borderBottom: '1px solid #f1f5f9'
  },
  feeLabel: {
    fontSize: '0.875rem',
    color: '#64748b'
  },
  feeAmount: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#1e293b'
  },
  disclaimer: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fde68a',
    borderRadius: '0.5rem',
    padding: '1rem',
    color: '#92400e',
    fontSize: '0.875rem',
    lineHeight: '1.6'
  },

  // CTA Section
  ctaSection: {
    backgroundColor: '#f0f9ff',
    borderRadius: '1rem',
    padding: '3rem 2rem',
    textAlign: 'center',
    marginTop: '3rem'
  },
  ctaTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  ctaText: {
    fontSize: '1.125rem',
    color: '#64748b',
    marginBottom: '2rem'
  },
  ctaButton: {
    display: 'inline-block',
    padding: '1rem 2.5rem',
    backgroundColor: '#0ea5e9',
    color: '#ffffff',
    textDecoration: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease'
  },

  // Footer
  footer: {
    backgroundColor: '#1e293b',
    color: '#ffffff',
    padding: '2rem 0',
    marginTop: '4rem'
  },
  footerText: {
    textAlign: 'center',
    marginBottom: '1rem',
    fontSize: '0.875rem'
  },
  footerLinks: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    flexWrap: 'wrap'
  },
  footerLink: {
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: '0.875rem',
    transition: 'color 0.2s ease'
  }
};

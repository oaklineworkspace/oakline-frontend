import { useState, useEffect, memo, lazy, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../contexts/LanguageContext';
import MainMenu from '../components/MainMenu';
import WelcomeBanner from '../components/WelcomeBanner';
import HeroSection from '../components/HeroSection';
import ServicesSection from '../components/ServicesSection';
import FeaturesSection from '../components/FeaturesSection';
import Footer from '../components/Footer';
import LiveChat from '../components/LiveChat';
import LanguageSelector from '../components/LanguageSelector';
import LocalizedImage from '../components/LocalizedImage';
import TranslatedText from '../components/TranslatedText'; // Import TranslatedText

// Lazy load heavy components - load after initial render completes
const Testimonials = lazy(() => import('../components/Testimonials'));
const TestimonialsSection = lazy(() => import('../components/TestimonialsSection'));
const LoanApprovalSection = lazy(() => import('../components/LoanApprovalSection'));
const CTA = lazy(() => import('../components/CTA'));

// Fallback component for lazy loaded sections
const LazyLoadingFallback = () => null;

export default function Home() {
  const { currentLanguage, t: translateFn } = useLanguage();
  const [user, setUser] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentAccountSlide, setCurrentAccountSlide] = useState(0);
  const [currentFeatureSlide, setCurrentFeatureSlide] = useState(0);
  const [isVisible, setIsVisible] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showBankingDropdown, setShowBankingDropdown] = useState(false);
  const [translations, setTranslations] = useState({});

  // Define data arrays BEFORE useEffect so they're available
  const bankingImages = [
    {
      src: '/images/Mobile_banking_user_experience_576bb7a3.png',
      title: 'Mobile Banking Excellence',
      subtitle: 'Complete banking control right in your pocket with our award-winning app',
      icon: '📱',
      gradient: 'linear-gradient(135deg, rgba(30, 64, 175, 0.15) 0%, rgba(30, 64, 175, 0.25) 100%)'
    },
    {
      src: '/images/Bank_hall_business_discussion_72f98bbe.png',
      title: 'Expert Financial Consultation',
      subtitle: 'Professional advice from certified banking specialists in our modern branches',
      icon: '💼',
      gradient: 'linear-gradient(135deg, rgba(30, 64, 175, 0.15) 0%, rgba(30, 64, 175, 0.25) 100%)'
    },
    {
      src: '/images/Modern_bank_lobby_interior_d535acc7.png',
      title: 'Modern Banking Facilities',
      subtitle: 'Experience premium banking in our state-of-the-art branch locations',
      icon: '🏦',
      gradient: 'linear-gradient(135deg, rgba(30, 64, 175, 0.15) 0%, rgba(30, 64, 175, 0.25) 100%)'
    }
  ];

  const bankingFeatures = [
    { name: 'Professional Banking Team', icon: '👥', desc: 'Work with experienced professionals', color: '#3b82f6' },
    { name: 'Award-Winning Mobile App', icon: '📱', desc: 'Banking at your fingertips', color: '#10b981' },
    { name: 'Premium Debit Cards', icon: '💳', desc: 'Advanced security features', color: '#f59e0b' },
    { name: 'Secure Card Technology', icon: '🔒', desc: 'Multi-layer security', color: '#8b5cf6' },
    { name: 'Digital Banking Excellence', icon: '💻', desc: 'Seamless online banking', color: '#64748b' },
    { name: 'Expert Financial Advice', icon: '💼', desc: 'Personalized guidance', color: '#1d4ed8' },
    { name: 'Instant Loan Approvals', icon: '🚀', desc: 'Quick access to funds', color: '#059669' },
    { name: 'Superior User Experience', icon: '⭐', desc: 'Intuitive interface', color: '#f59e0b' }
  ];

  const accountTypes = [
    { name: 'Premium Checking', icon: '💎', rate: '0.25% APY', featured: true },
    { name: 'High-Yield Savings', icon: '⭐', rate: '5.00% APY', featured: true },
    { name: 'Business Checking', icon: '🏢', rate: '0.15% APY', featured: true },
    { name: 'Investment Account', icon: '📈', rate: 'Variable', featured: true },
    { name: 'Money Market', icon: '💰', rate: '4.75% APY', featured: true },
    { name: 'Certificate of Deposit', icon: '🔒', rate: '5.25% APY', featured: true }
  ];

  const visibleAccountTypes = user ? accountTypes : accountTypes.filter(account => account.featured);

  // Optimized translation function with caching
  const t = useCallback(async (text) => {
    if (!text) return '';
    if (currentLanguage === 'en') return text;

    const cacheKey = `${currentLanguage}:${text}`;
    if (translations[cacheKey]) {
      return translations[cacheKey];
    }

    try {
      const translated = await translateFn(text);
      setTranslations(prev => ({ ...prev, [cacheKey]: translated }));
      return translated;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  }, [currentLanguage, translations, translateFn]);

  // Synchronous translation for immediate rendering (uses cache)
  const ts = useCallback((text) => {
    if (!text) return '';
    if (currentLanguage === 'en') return text;
    const cacheKey = `${currentLanguage}:${text}`;
    return translations[cacheKey] || text;
  }, [currentLanguage, translations]);

  useEffect(() => {
    // Get initial session and set up auth listener
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
      } else {
        setUser(session?.user ?? null);
      }
      setIsLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (activeDropdown) {
        const dropdownElement = event.target.closest('.navigationDropdown');
        const backdropElement = event.target.closest('[style*="backdrop"]');

        if (!dropdownElement && !backdropElement) {
          setActiveDropdown(null);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && activeDropdown) {
        setActiveDropdown(null);
      }
    });

    const cleanup = () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', (e) => {
        if (e.key === 'Escape') setActiveDropdown(null);
      });
    };

    // Auto-slide for hero images
    const heroInterval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % bankingImages.length);
    }, 5000);

    // Auto-slide for account types
    const accountInterval = setInterval(() => {
      setCurrentAccountSlide(prev => (prev + 1) % Math.ceil(visibleAccountTypes.length / 6));
    }, 7000);

    // Auto-slide for feature showcase
    const featureInterval = setInterval(() => {
      setCurrentFeatureSlide(prev => (prev + 1) % bankingFeatures.length);
    }, 6000);

    // Enhanced Intersection Observer for scroll animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(prev => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    // Observe all animated elements
    setTimeout(() => {
      const elements = document.querySelectorAll('[data-animate]');
      elements.forEach((el) => observer.observe(el));
    }, 100);

    return () => {
      subscription?.unsubscribe();
      clearInterval(heroInterval);
      clearInterval(accountInterval);
      clearInterval(featureInterval);
      observer.disconnect();
      cleanup();
    };
  }, []);

  // Pre-translate critical content when language changes
  useEffect(() => {
    if (currentLanguage === 'en') return;

    const criticalTexts = [
      // Header & Navigation
      'Oakline Bank', 'Your Financial Partner', 'Banking+', 'Welcome',
      'Complete Banking Solutions', 'Access all your banking services in one place',
      'Core Banking', 'Premium Services', 'Enroll Now', 'Explore All Banking Services', 'Contact Support',

      // Loading screen
      'Welcome to Oakline Bank', 'Loading your premium banking experience...',

      // Hero carousel
      'Mobile Banking Excellence', 'Complete banking control right in your pocket with our award-winning app',
      'Expert Financial Consultation', 'Professional advice from certified banking specialists in our modern branches',
      'Modern Banking Facilities', 'Experience premium banking in our state-of-the-art branch locations',

      // Account Types Section
      'All 23 Account Types Available to You', 'Featured Banking Accounts',
      'Find the perfect account for your financial needs and goals',
      'Sign in to unlock all 23 premium account types',
      '23 Account Types Available', 'From basic checking to premium investment accounts',
      'Personal Banking', 'Checking, Savings, Student accounts',
      'Business Banking', 'Professional solutions for businesses',
      'Investment Accounts', 'Grow your wealth with premium options',
      'Specialized Accounts', 'HSA, Trust, International options',
      'View All 23 Account Types', 'Sign In to Apply',

      // Banking Experience Section
      'Modern Banking Experience', 'Experience the future of banking with our state-of-the-art facilities and services',
      'Your Complete Banking Solution',
      'Discover a comprehensive range of banking services designed to meet all your financial needs. From everyday transactions to long-term investments, we provide innovative solutions backed by exceptional customer service.',
      'Advanced Digital Platform', 'Personalized Financial Services', 'Secure and Reliable Banking', '24/7 Customer Support',

      // Cards Section
      'Professional Banking Cards', 'Discover our comprehensive range of premium banking cards designed for every financial need',
      'Premium Cards', 'Complete Card Solutions',
      'From everyday debit cards to premium credit cards, we offer a complete suite of banking cards with advanced features, security, and rewards tailored to your lifestyle.',
      'Advanced Security', 'EMV chip, contactless technology, and fraud protection',
      'Rewards Program', 'Earn points, cashback, and exclusive benefits',
      'Global Acceptance', 'Use your card anywhere worldwide',
      'Flexible Options', 'Debit, credit, and prepaid card solutions',

      //Common buttons & CTAs
      'Learn More', 'Get Started', 'Apply Now', 'Open Account', 'View Details',
      'Download App', 'Request Demo', 'Schedule Consultation', 'View All Cards', 'Compare Cards'
    ];

    // Preload all critical translations
    const preloadTranslations = async () => {
      for (const text of criticalTexts) {
        await t(text);
      }
    };

    preloadTranslations();
  }, [currentLanguage, t]);

  // Logged-in user features - only for authenticated users
  const loggedInFeatures = [
    { name: 'My Dashboard', href: '/dashboard', icon: '📊', desc: 'Account overview', color: '#3B82F6', section: 'explore' },
    { name: 'My Accounts', href: '/account-details', icon: '🏦', desc: 'Manage your accounts', color: '#059669', section: 'explore' },
    { name: 'Transactions', href: '/transactions', icon: '💸', desc: 'View transaction history', color: '#8B5CF6', section: 'explore' },
    { name: 'Transfer Money', href: '/transfer', icon: '🔄', desc: 'Internal & external transfers', color: '#06B6D4', section: 'explore' },
    { name: 'Bill Pay', href: '/bill-pay', icon: '📄', desc: 'Pay your bills online', color: '#EF4444', section: 'explore' },
    { name: 'My Cards', href: '/cards', icon: '💳', desc: 'Manage debit/credit cards', color: '#F59E0B', section: 'explore' },
    { name: 'Link Debit Card', href: '/link-debit-card', icon: '🔗', desc: 'Connect external cards', color: '#8B5CF6', section: 'explore' },

    { name: 'My Loans', href: '/loan/dashboard', icon: '🏠', desc: 'View & manage loans', color: '#3B82F6', section: 'services' },
    { name: 'Apply for Loan', href: '/loan/apply', icon: '📝', desc: 'New loan application', color: '#059669', section: 'services' },
    { name: 'Investments', href: '/investment', icon: '📈', desc: 'Portfolio management', color: '#7C3AED', section: 'services' },
    { name: 'Crypto Trading', href: '/crypto', icon: '₿', desc: 'Digital assets', color: '#F59E0B', section: 'services' },
    { name: 'Oakline Pay', href: '/oakline-pay', icon: '💰', desc: 'Send money instantly', color: '#10B981', section: 'services' },
    { name: 'Wire Transfer', href: '/wire-transfer', icon: '🌐', desc: 'International transfers', color: '#06B6D4', section: 'services' },

    { name: 'Messages', href: '/messages', icon: '💬', desc: 'Secure messaging', color: '#3B82F6', section: 'resources' },
    { name: 'Notifications', href: '/notifications', icon: '🔔', desc: 'Alerts & updates', color: '#EF4444', section: 'resources' },
    { name: 'Account Settings', href: '/settings', icon: '⚙️', desc: 'Profile & preferences', color: '#64748B', section: 'resources' },
    { name: 'Security Center', href: '/security', icon: '🔐', desc: 'Security settings', color: '#DC2626', section: 'resources' },
    { name: 'Rewards Program', href: '/rewards', icon: '🎁', desc: 'Earn & redeem points', color: '#EC4899', section: 'resources' },
    { name: 'Financial Tools', href: '/financial-tools', icon: '🧮', desc: 'Calculators & planners', color: '#F59E0B', section: 'resources' }
  ];

  // Public features - accessible to everyone
  const publicFeatures = [
    { name: 'Account Types', href: '/account-types', icon: '🏦', desc: 'Explore 23 account options', color: '#3B82F6', section: 'explore' },
    { name: 'Branch Locator', href: '/branch-locator', icon: '📍', desc: 'Find nearest branch', color: '#DC2626', section: 'explore' },
    { name: 'ATM Network', href: '/atm', icon: '🏧', desc: '24/7 cash access', color: '#8B5CF6', section: 'explore' },
    { name: 'Current Rates', href: '/current-rates', icon: '📈', desc: 'Interest & exchange rates', color: '#6366F1', section: 'explore' },
    { name: 'Calculators', href: '/calculators', icon: '🧮', desc: 'Financial planning tools', color: '#F59E0B', section: 'explore' },
    { name: 'About Us', href: '/about', icon: 'ℹ️', desc: 'Learn about Oakline Bank', color: '#059669', section: 'explore' },

    { name: 'Home Loans', href: '/loans', icon: '🏠', desc: 'Mortgage solutions', color: '#3B82F6', section: 'services' },
    { name: 'Personal Loans', href: '/loans', icon: '💰', desc: 'Competitive rates', color: '#059669', section: 'services' },
    { name: 'Business Banking', href: '/account-types', icon: '🏢', desc: 'Commercial services', color: '#EF4444', section: 'services' },
    { name: 'Link Debit Card', href: '/link-debit-card', icon: '💳', desc: 'Connect external cards', color: '#8B5CF6', section: 'services' },
    { name: 'Financial Advisory', href: '/financial-advisory', icon: '🎯', desc: 'Expert consultation', color: '#06B6D4', section: 'services' },
    { name: 'Retirement Planning', href: '/retirement-planning', icon: '🏖️', desc: '401k & IRA guidance', color: '#7C3AED', section: 'services' },
    { name: 'International Banking', href: '/internationalization', icon: '🌍', desc: 'Global services', color: '#84CC16', section: 'services' },

    { name: 'Financial Education', href: '/financial-education', icon: '📚', desc: 'Learning resources', color: '#10B981', section: 'resources' },
    { name: 'Personal Finance Tips', href: '/personal-finance-tips', icon: '💡', desc: 'Budgeting & saving tips', color: '#059669', section: 'resources' },
    { name: 'Market News', href: '/market-news', icon: '📰', desc: 'Financial insights', color: '#0EA5E9', section: 'resources' },
    { name: 'Security Awareness', href: '/security-awareness', icon: '🔐', desc: 'Fraud prevention tips', color: '#DC2626', section: 'resources' },
    { name: 'Customer Stories', href: '/customer-stories', icon: '⭐', desc: 'Real testimonials', color: '#EC4899', section: 'resources' },
    { name: 'Green Banking', href: '/green-banking', icon: '🌱', desc: 'Sustainable banking', color: '#10B981', section: 'resources' },
    { name: 'Community Impact', href: '/community-impact', icon: '🤝', desc: 'CSR programs', color: '#0891B2', section: 'resources' },
    { name: 'Promotions', href: '/promotions', icon: '🎉', desc: 'Current offers & deals', color: '#F59E0B', section: 'resources' }
  ];

  // Select features based on user authentication status
  const activeFeatures = user ? loggedInFeatures : publicFeatures;
  const exploreFeatures = activeFeatures.filter(f => f.section === 'explore');
  const servicesFeatures = activeFeatures.filter(f => f.section === 'services');
  const resourcesFeatures = activeFeatures.filter(f => f.section === 'resources');

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>
          <div style={styles.spinner}>
            </div>
          <div style={styles.loadingContent}>
            <h2 style={styles.loadingTitle}><TranslatedText>Welcome to Oakline Bank</TranslatedText></h2>
            <p style={styles.loadingText}><TranslatedText>Loading your premium banking experience...</TranslatedText></p>
            <div style={styles.loadingProgress}>
              <div style={styles.progressBar}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={styles.pageContainer}
      onClick={() => setActiveDropdown(null)}
    >
      {/* Single Clean Header */}
      <header
        style={styles.mainHeader}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.headerContainer}>
          {/* First Row: Logo, Brand Text, Scrolling Welcome, and Banking+ */}
          <div style={styles.topHeaderRow} className="top-header-responsive">
            <Link href="/" style={styles.logoAndBrandSection}>
              <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={styles.headerLogo} />
              <div style={styles.brandTextSection}>
                <div style={styles.bankName}>
                  <div>Oakline</div>
                  <div>Bank</div>
                </div>
                <div style={styles.bankTagline}><TranslatedText>Your Financial Partner</TranslatedText></div>
              </div>
            </Link>

            {/* Mobile Banking+ Button - Shows inline next to bank name on mobile */}
            <div className="mobile-banking-plus-inline" style={{ display: 'none' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBankingDropdown(!showBankingDropdown);
                }}
                style={styles.bankingPlusButton}
              >
                <div style={styles.bankingPlusIconLines}>
                  <div style={styles.iconLine}></div>
                  <div style={styles.iconLine}></div>
                  <div style={styles.iconLine}></div>
                </div>
                <span style={styles.bankingPlusText}><TranslatedText>Banking+</TranslatedText></span>
              </button>
            </div>

            {/* Banking+ and Language Selector - Right Side */}
            <div style={styles.bankingPlusRightSection} className="banking-plus-right-section">
              <div style={styles.bankingPlusContainer} className="banking-plus-container">
                <button
              onClick={(e) => {
                e.stopPropagation();
                setShowBankingDropdown(!showBankingDropdown);
              }}
              style={styles.bankingPlusButton}
            >
              <div style={styles.bankingPlusIconLines}>
                <div style={styles.iconLine}></div>
                <div style={styles.iconLine}></div>
                <div style={styles.iconLine}></div>
              </div>
              <span style={styles.bankingPlusText}><TranslatedText>Banking+</TranslatedText></span>
                </button>
              </div>

              {/* Language Selector beside Banking+ */}
              <div style={styles.languageSelectorInline} className="language-selector-inline">
                <LanguageSelector compact={true} />
              </div>

              {/* Sign Out Button - Inside right section for proper mobile ordering */}
              {user && (
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = '/sign-in';
                  }}
                  style={styles.signOutButton}
                  className="sign-out-button"
                >
                  <TranslatedText>Sign Out</TranslatedText>
                </button>
              )}
            </div>

            {/* Scrolling Welcome Message - Separate row for mobile portrait */}
            <div style={styles.scrollingWelcomeInline} className="scrolling-welcome-inline">
              <div style={styles.scrollingWelcomeText}>
                <TranslatedText>Welcome to Oakline Bank - Your trusted financial partner since 1995 • Explore all 23 account types with detailed benefits • Join over 500,000+ satisfied customers • Award-winning mobile app • FDIC Insured up to $500,000 • Rated #1 Customer Service</TranslatedText>
              </div>
            </div>

            {showBankingDropdown && (
              <>
                <div
                  style={styles.dropdownBackdrop}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBankingDropdown(false);
                  }}
                ></div>
                <div style={styles.bankingDropdown} className="banking-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div style={styles.bankingDropdownHeader}>
                    <h4 style={styles.bankingDropdownTitle}>
                      {user ? <TranslatedText>Welcome Back!</TranslatedText> : <TranslatedText>Complete Banking Solutions</TranslatedText>}
                    </h4>
                    <p style={styles.bankingDropdownSubtitle}>
                      {user ? <TranslatedText>Quick access to your banking services</TranslatedText> : <TranslatedText>Access all your banking services in one place</TranslatedText>}
                    </p>
                  </div>

                  <div style={styles.bankingTwoColumnGrid}>
                    {/* Explore Section */}
                    <div style={styles.bankingSection}>
                      <div style={styles.dropdownSectionTitle}>
                        {user ? <>🏠 <TranslatedText>MY BANKING</TranslatedText></> : <>🔍 <TranslatedText>EXPLORE</TranslatedText></>}
                      </div>
                      {exploreFeatures.map((feature) => (
                        <Link
                          key={feature.name}
                          href={feature.href}
                          onClick={() => setShowBankingDropdown(false)}
                          style={styles.dropdownLink}
                          className="dropdown-link"
                        >
                          {feature.icon} <TranslatedText>{feature.name}</TranslatedText>
                        </Link>
                      ))}
                    </div>

                    {/* Services & Resources Section */}
                    <div style={styles.bankingSection}>
                      <div style={styles.dropdownSectionTitle}>
                        {user ? <>💼 <TranslatedText>MY SERVICES</TranslatedText></> : <>💼 <TranslatedText>BANKING SERVICES</TranslatedText></>}
                      </div>
                      {servicesFeatures.map((feature) => (
                        <Link
                          key={feature.name}
                          href={feature.href}
                          onClick={() => setShowBankingDropdown(false)}
                          style={styles.dropdownLink}
                          className="dropdown-link"
                        >
                          {feature.icon} <TranslatedText>{feature.name}</TranslatedText>
                        </Link>
                      ))}

                      <div style={styles.dropdownDivider}></div>

                      <div style={styles.dropdownSectionTitle}>
                        {user ? <>⚙️ <TranslatedText>ACCOUNT TOOLS</TranslatedText></> : <>📚 <TranslatedText>RESOURCES</TranslatedText></>}
                      </div>
                      {resourcesFeatures.map((feature) => (
                        <Link
                          key={feature.name}
                          href={feature.href}
                          onClick={() => setShowBankingDropdown(false)}
                          style={styles.dropdownLink}
                          className="dropdown-link"
                        >
                          {feature.icon} <TranslatedText>{feature.name}</TranslatedText>
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div style={styles.bankingDropdownFooter}>
                    {user ? (
                      <>
                        <Link
                          href="/dashboard"
                          onClick={() => setShowBankingDropdown(false)}
                          style={styles.viewAllServicesButtonEnroll}
                        >
                          📊 <TranslatedText>Go to Dashboard</TranslatedText>
                        </Link>
                        <Link
                          href="/account-types"
                          onClick={() => setShowBankingDropdown(false)}
                          style={styles.viewAllServicesButtonSecondary}
                        >
                          ➕ <TranslatedText>Add New Account</TranslatedText>
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/apply"
                          onClick={() => setShowBankingDropdown(false)}
                          style={styles.viewAllServicesButtonEnroll}
                        >
                          🚀 <TranslatedText>Open Account</TranslatedText>
                        </Link>
                        <Link
                          href="/support"
                          onClick={() => setShowBankingDropdown(false)}
                          style={styles.viewAllServicesButtonSecondary}
                        >
                          💬 <TranslatedText>Contact Us</TranslatedText>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

        {/* Professional Banking Hero Section */}
        <section style={styles.heroSection} id="hero" data-animate>
          <div style={styles.heroParallax}>
            {/* Hero Slider - Updated for better slide transition */}
            <div style={styles.heroSlider}>
              {bankingImages.map((image, index) => (
                <div
                  key={index}
                  style={{
                    ...styles.heroSlide,
                    opacity: currentSlide === index ? 1 : 0,
                    transform: `translateX(${(index - currentSlide) * 100}%)`,
                    zIndex: currentSlide === index ? 2 : 1,
                  }}
                >
                  <LocalizedImage
                    src={image.src}
                    alt={image.title}
                    style={styles.heroImage}
                    fallbackSrc="/images/hero-fallback.png"
                    priority={index === 0}
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                  <div style={styles.heroOverlay}></div>
                </div>
              ))}
            </div>
            <div style={{
              ...styles.heroContent,
              ...(isVisible.hero ? styles.heroAnimated : {})
            }}>
              {/* Hero buttons removed as requested */}
            </div>

            <div style={styles.slideIndicators}>
              {bankingImages.map((_, index) => (
                <button
                  key={index}
                  style={{
                    ...styles.indicator,
                    ...(currentSlide === index ? styles.indicatorActive : {})
                  }}
                  onClick={() => setCurrentSlide(index)}
                />
              ))}
            </div>
          </div>
        </section>



        {/* Account Types Banner Section */}
        <section style={styles.accountTypesBanner} id="account-types" data-animate>
          <div style={styles.container}>
            <div style={{
              ...styles.sectionHeader,
              ...(isVisible['account-types'] ? styles.zoomIn : {})
            }}>
              <h2 style={styles.sectionTitle}>
                {user ? <TranslatedText>All 23 Account Types Available to You</TranslatedText> : <TranslatedText>Featured Banking Accounts</TranslatedText>}
              </h2>
              <p style={styles.sectionSubtitle}>
                <TranslatedText>Find the perfect account for your financial needs and goals</TranslatedText>
                {!user && (
                  <span style={styles.loginPrompt}>
                    <br />
                    <Link href="/sign-in" style={styles.loginLink}>
                      🔓 <TranslatedText>Sign in to unlock all 23 premium account types</TranslatedText>
                    </Link>
                  </span>
                )}
              </p>
              <div style={styles.titleUnderline}></div>
            </div>

            <div style={styles.accountBannerContainer}>
              <div style={styles.accountBannerImage}>
                <LocalizedImage
                  src="/images/bank-discussion.png"
                  alt="Banking Discussion - Account Types Available"
                  style={styles.bannerImage}
                  fallbackSrc="/images/fallback-banking-discussion.png"
                />
              </div>

              <div style={styles.accountBannerContent}>
                <h3 style={styles.accountTitle}><TranslatedText>Personal Banking</TranslatedText></h3>
                <p style={styles.accountDesc}><TranslatedText>Checking, Savings, Student accounts</TranslatedText></p>
              </div>
            </div>
          </div>
        </section>



        {/* New Banking Image Section */}
        <section style={styles.newBankingImageSection} id="banking-image" data-animate>
          <div style={styles.container}>
            <div style={{
              ...styles.sectionHeader,
              ...(isVisible['banking-image'] ? styles.fadeInUp : {})
            }}>
              <h2 style={styles.sectionTitle}><TranslatedText>Modern Banking Experience</TranslatedText></h2>
              <p style={styles.sectionSubtitle}>
                <TranslatedText>Experience the future of banking with our state-of-the-art facilities and services</TranslatedText>
              </p>
              <div style={styles.titleUnderline}></div>
            </div>

            <div style={styles.newBankingImageGrid}>
              <div style={styles.newBankingImageContainer}>
                <LocalizedImage
                  src="/images/oakline-bank-branded-1.jpeg"
                  alt="Oakline Bank Modern Banking Experience"
                  style={styles.newBankingImage}
                  fallbackSrc="/images/fallback-oakline-bank-branded-1.jpeg"
                />
              </div>

              <div style={styles.newBankingImageContent}>
                <h3 style={styles.newBankingImageTitle}><TranslatedText>Your Complete Banking Solution</TranslatedText></h3>
                <p style={styles.newBankingImageDescription}>
                  <TranslatedText>Discover a comprehensive range of banking services designed to meet all your financial needs. From everyday transactions to long-term investments, we provide innovative solutions backed by exceptional customer service.</TranslatedText>
                </p>

                <div style={styles.newBankingImageFeatures}>
                  <div style={styles.newBankingImageFeature}>
                    <span style={styles.newBankingImageFeatureIcon}>✓</span>
                    <span><TranslatedText>Advanced Digital Platform</TranslatedText></span>
                  </div>
                  <div style={styles.newBankingImageFeature}>
                    <span style={styles.newBankingImageFeatureIcon}>✓</span>
                    <span><TranslatedText>Personalized Financial Services</TranslatedText></span>
                  </div>
                  <div style={styles.newBankingImageFeature}>
                    <span style={styles.newBankingImageFeatureIcon}>✓</span>
                    <span><TranslatedText>Secure and Reliable Banking</TranslatedText></span>
                  </div>
                  <div style={styles.newBankingImageFeature}>
                    <span style={styles.newBankingImageFeatureIcon}>✓</span>
                    <span><TranslatedText>24/7 Customer Support</TranslatedText></span>
                  </div>
                </div>

                <div style={styles.newBankingImageActions}>
                  <Link href={user ? "/dashboard" : "/apply"} style={styles.newBankingImageButtonPrimary}>
                    <span style={styles.buttonIcon}>🚀</span>
                    {user ? <TranslatedText>Go to Dashboard</TranslatedText> : <TranslatedText>Get Started</TranslatedText>}
                  </Link>
                  <Link href="/about" style={styles.newBankingImageButtonSecondary}>
                    <span style={styles.buttonIcon}>ℹ️</span>
                    <TranslatedText>Learn More</TranslatedText>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Professional Banking Cards Section */}
        <section style={styles.professionalCardsSection} id="professional-cards" data-animate>
          <div style={styles.container}>
            <div style={{
              ...styles.sectionHeader,
              ...(isVisible['professional-cards'] ? styles.fadeInUp : {})
            }}>
              <TranslatedText as="h2" style={styles.sectionTitle}>Professional Banking Cards</TranslatedText>
              <TranslatedText as="p" style={styles.sectionSubtitle}>
                Discover our comprehensive range of premium banking cards designed for every financial need
              </TranslatedText>
              <div style={styles.titleUnderline}></div>
            </div>

            <div style={styles.professionalCardsGrid}>
              <div style={styles.professionalCardsImageContainer}>
                <LocalizedImage
                  src="/images/Professional_bank_cards_e0d28d7c.png"
                  alt="Professional Banking Cards Collection"
                  width={800}
                  height={600}
                  style={styles.professionalCardsImage}
                />
                <div style={styles.professionalCardsBadge}>
                  <span style={styles.badgeIcon}>💳</span>
                  <span><TranslatedText>Premium Cards</TranslatedText></span>
                </div>
              </div>

              <div style={styles.professionalCardsContent}>
                <h3 style={styles.professionalCardsTitle}><TranslatedText>Complete Card Solutions</TranslatedText></h3>
                <p style={styles.professionalCardsDescription}>
                  <TranslatedText>From everyday debit cards to premium credit cards, we offer a complete suite of banking cards with advanced features, security, and rewards tailored to your lifestyle.</TranslatedText>
                </p>

                <div style={styles.professionalCardsFeatures}>
                  <div style={styles.professionalCardsFeature}>
                    <span style={styles.professionalCardsFeatureIcon}>🛡️</span>
                    <div>
                      <h4 style={styles.professionalCardsFeatureTitle}><TranslatedText>Advanced Security</TranslatedText></h4>
                      <p style={styles.professionalCardsFeatureDesc}><TranslatedText>EMV chip, contactless technology, and fraud protection</TranslatedText></p>
                    </div>
                  </div>
                  <div style={styles.professionalCardsFeature}>
                    <span style={styles.professionalCardsFeatureIcon}>🎁</span>
                    <div>
                      <h4 style={styles.professionalCardsFeatureTitle}><TranslatedText>Rewards Program</TranslatedText></h4>
                      <p style={styles.professionalCardsFeatureDesc}><TranslatedText>Earn cashback and points on every purchase</TranslatedText></p>
                    </div>
                  </div>
                  <div style={styles.professionalCardsFeature}>
                    <span style={styles.professionalCardsFeatureIcon}>🌍</span>
                    <div>
                      <h4 style={styles.professionalCardsFeatureTitle}><TranslatedText>Global Acceptance</TranslatedText></h4>
                      <p style={styles.professionalCardsFeatureDesc}><TranslatedText>Use your cards worldwide with no foreign transaction fees</TranslatedText></p>
                    </div>
                  </div>
                  <div style={styles.professionalCardsFeature}>
                    <span style={styles.professionalCardsFeatureIcon}>📲</span>
                    <div>
                      <h4 style={styles.professionalCardsFeatureTitle}><TranslatedText>Digital Wallet Ready</TranslatedText></h4>
                      <p style={styles.professionalCardsFeatureDesc}><TranslatedText>Apple Pay, Google Pay, and Samsung Pay compatible</TranslatedText></p>
                    </div>
                  </div>
                </div>

                <div style={styles.professionalCardsActions}>
                  <Link href="/cards" style={styles.professionalCardsButtonPrimary}>
                    <span style={styles.buttonIcon}>💳</span>
                    <TranslatedText>Explore All Cards</TranslatedText>
                  </Link>
                  <Link href={user ? "/account-types" : "/apply"} style={styles.professionalCardsButtonSecondary}>
                    <span style={styles.buttonIcon}>📝</span>
                    {user ? <TranslatedText>View Account Types</TranslatedText> : <TranslatedText>Apply Now</TranslatedText>}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Debit Card Showcase Section */}
        <section style={styles.debitCardShowcase} id="debit-cards" data-animate>
          <div style={styles.container}>
            <div style={{
              ...styles.sectionHeader,
              ...(isVisible['debit-cards'] ? styles.fadeInUp : {})
            }}>
              <TranslatedText as="h2" style={styles.sectionTitle}>Premium Debit Cards</TranslatedText>
              <TranslatedText as="p" style={styles.sectionSubtitle}>
                Experience modern banking with our premium debit card collection featuring advanced security and contactless technology
              </TranslatedText>
              <div style={styles.titleUnderline}></div>
            </div>

            <div style={styles.debitCardsGrid}>
              <div style={styles.debitCardItem}>
                <div style={styles.debitCardImageContainer}>
                  <LocalizedImage
                    src="/images/realistic-debit-card-1.svg"
                    alt="Premium Debit Card"
                    style={styles.debitCardImage}
                    fallbackSrc="/images/fallback-realistic-debit-card-1.svg"
                  />
                  <div style={styles.debitCardBadge}>
                    <span style={styles.badgeIcon}>💳</span>
                    <span><TranslatedText>Premium</TranslatedText></span>
                  </div>
                </div>
                <div style={styles.debitCardContent}>
                  <h3 style={styles.debitCardTitle}><TranslatedText>Premium Debit Card</TranslatedText></h3>
                  <p style={styles.debitCardDescription}>
                    <TranslatedText>Get instant access to your funds with our premium debit card featuring contactless payments and global acceptance.</TranslatedText>
                  </p>
                  <div style={styles.debitCardFeatures}>
                    <div style={styles.featureTag}><TranslatedText>Contactless Payments</TranslatedText></div>
                    <div style={styles.featureTag}><TranslatedText>Real-time Fraud Protection</TranslatedText></div>
                    <div style={styles.featureTag}><TranslatedText>Global Acceptance</TranslatedText></div>
                    <div style={styles.featureTag}><TranslatedText>Mobile Card Controls</TranslatedText></div>
                  </div>
                  {user ? (
                    <Link href="/cards" style={{...styles.debitCardButton, backgroundColor: undefined}}>
                      <span style={styles.buttonIcon}>⚡</span>
                      <TranslatedText>Apply for Card</TranslatedText>
                    </Link>
                  ) : (
                    <Link href="/apply" style={styles.debitCardButton}>
                      <span style={styles.buttonIcon}>🚀</span>
                      <TranslatedText>Open Account First</TranslatedText>
                    </Link>
                  )}
                </div>
              </div>

              <div style={styles.debitCardItem}>
                <div style={styles.debitCardImageContainer}>
                  <LocalizedImage
                    src="/images/premium-debit-card.svg"
                    alt="Premium Debit Card"
                    style={styles.debitCardImage}
                    fallbackSrc="/images/fallback-premium-debit-card.svg"
                  />
                  <div style={styles.debitCardBadge}>
                    <span style={styles.badgeIcon}>💎</span>
                    <span><TranslatedText>Premium</TranslatedText></span>
                  </div>
                </div>
                <div style={styles.debitCardContent}>
                  <h3 style={styles.debitCardTitle}><TranslatedText>Premium Debit Card</TranslatedText></h3>
                  <p style={styles.debitCardDescription}>
                    <TranslatedText>Experience luxury banking with our exclusive premium debit card featuring gold accents and elite benefits.</TranslatedText>
                  </p>
                  <div style={styles.debitCardFeatures}>
                    <div style={styles.featureTag}><TranslatedText>Premium Member Benefits</TranslatedText></div>
                    <div style={styles.featureTag}><TranslatedText>Gold Card Design</TranslatedText></div>
                    <div style={styles.featureTag}><TranslatedText>Concierge Service</TranslatedText></div>
                    <div style={styles.featureTag}><TranslatedText>Priority Support</TranslatedText></div>
                  </div>
                  {user ? (
                    <Link href="/cards" style={{...styles.debitCardButton, backgroundColor: undefined}}>
                      <span style={styles.buttonIcon}>⚡</span>
                      <TranslatedText>Apply for Card</TranslatedText>
                    </Link>
                  ) : (
                    <Link href="/apply" style={styles.debitCardButton}>
                      <span style={styles.buttonIcon}>🚀</span>
                      <TranslatedText>Open Account First</TranslatedText>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <div style={styles.debitCardCTA}>
              <h3 style={styles.debitCardCTATitle}><TranslatedText>Ready to Get Your Premium Debit Card?</TranslatedText></h3>
              <p style={styles.debitCardCTASubtitle}>
                <TranslatedText>Join thousands of customers who enjoy the convenience and security of our premium debit cards</TranslatedText>
              </p>
              <div style={styles.debitCardCTAButtons}>
                <Link href={user ? "/cards" : "/apply"} style={styles.debitCardCTAPrimary}>
                  <span style={styles.buttonIcon}>💳</span>
                  {user ? <TranslatedText>View My Cards</TranslatedText> : <TranslatedText>Open Account Today</TranslatedText>}
                </Link>
                <Link href="/account-types" style={styles.debitCardCTASecondary}>
                  <span style={styles.buttonIcon}>ℹ️</span>
                  <TranslatedText>Learn More</TranslatedText>
                </Link>
              </div>
            </div>
          </div>
        </section>





        {/* Professional Banking Services Section */}
        <section style={styles.professionalServicesSection} id="professional-services" data-animate>
          <div style={styles.container}>
            <div style={{
              ...styles.sectionHeader,
              ...(isVisible['professional-services'] ? styles.fadeInUp : {})
            }}>
              <TranslatedText as="h2" style={styles.sectionTitle}>Professional Banking Services</TranslatedText>
              <TranslatedText as="p" style={styles.sectionSubtitle}>
                Comprehensive financial solutions designed for your success with personalized service and expert guidance
              </TranslatedText>
              <div style={styles.titleUnderline}></div>
            </div>

            <div style={styles.professionalServicesGrid}>
              <div style={styles.professionalServiceCard}>
                <div style={styles.serviceImageContainer}>
                  <LocalizedImage
                    src="/images/Professional_banking_team_36e79456.png"
                    alt="Professional Banking Team"
                    style={styles.serviceImage}
                    fallbackSrc="/images/fallback-professional-banking-team.png"
                  />
                  <div style={styles.serviceBadge}>
                    <span style={styles.badgeIcon}>👥</span>
                    <span><TranslatedText>Expert Team</TranslatedText></span>
                  </div>
                </div>
                <div style={styles.serviceContent}>
                  <h3 style={styles.serviceTitle}><TranslatedText>Expert Banking Professionals</TranslatedText></h3>
                  <p style={styles.serviceDescription}>
                    <TranslatedText>Our certified banking professionals provide personalized financial guidance and comprehensive solutions tailored to your unique needs and goals.</TranslatedText>
                  </p>
                  <div style={styles.serviceFeatures}>
                    <div style={styles.serviceFeature}>✓ <TranslatedText>Certified Financial Advisors</TranslatedText></div>
                    <div style={styles.serviceFeature}>✓ <TranslatedText>Personalized Consultation</TranslatedText></div>
                    <div style={styles.serviceFeature}>✓ <TranslatedText>24/7 Professional Support</TranslatedText></div>
                    <div style={styles.serviceFeature}>✓ <TranslatedText>Strategic Financial Planning</TranslatedText></div>
                  </div>
                  <Link href="/financial-advisory" style={styles.serviceButton}>
                    <span style={styles.buttonIcon}>💼</span>
                    <TranslatedText>Schedule Consultation</TranslatedText>
                  </Link>
                </div>
              </div>

              <div style={styles.professionalServiceCard}>
                <div style={styles.serviceImageContainer}>
                  <LocalizedImage
                    src="/images/Digital_investment_dashboard_36d35f19.png"
                    alt="Digital Investment Dashboard"
                    style={styles.serviceImage}
                    fallbackSrc="/images/fallback-digital-investment-dashboard.png"
                  />
                  <div style={styles.serviceBadge}>
                    <span style={styles.badgeIcon}>📊</span>
                    <span><TranslatedText>Investment Tools</TranslatedText></span>
                  </div>
                </div>
                <div style={styles.serviceContent}>
                  <h3 style={styles.serviceTitle}><TranslatedText>Advanced Investment Platform</TranslatedText></h3>
                  <p style={styles.serviceDescription}>
                    <TranslatedText>Access sophisticated investment tools and real-time market data through our advanced digital platform designed for serious investors.</TranslatedText>
                  </p>
                  <div style={styles.serviceFeatures}>
                    <div style={styles.serviceFeature}>✓ <TranslatedText>Real-time Market Data</TranslatedText></div>
                    <div style={styles.serviceFeature}>✓ <TranslatedText>Portfolio Analytics</TranslatedText></div>
                    <div style={styles.serviceFeature}>✓ <TranslatedText>Advanced Trading Tools</TranslatedText></div>
                    <div style={styles.serviceFeature}>✓ <TranslatedText>Investment Research</TranslatedText></div>
                  </div>
                  <Link href="/investments" style={styles.serviceButton}>
                    <span style={styles.buttonIcon}>📈</span>
                    <TranslatedText>Explore Investments</TranslatedText>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Student Banking Solutions Section */}
        <section style={styles.studentBankingSection} id="student-banking" data-animate>
          <div style={styles.container}>
            <div style={{
              ...styles.sectionHeader,
              ...(isVisible['student-banking'] ? styles.fadeInUp : {})
            }}>
              <TranslatedText as="h2" style={styles.sectionTitle}>Student Banking Solutions</TranslatedText>
              <TranslatedText as="p" style={styles.sectionSubtitle}>
                Specialized banking services and financial education designed to support students throughout their academic journey
              </TranslatedText>
              <div style={styles.titleUnderline}></div>
            </div>

            <div style={styles.studentBankingGrid}>
              <div style={styles.studentBankingContent}>
                <h3 style={styles.studentBankingTitle}><TranslatedText>Banking Made Simple for Students</TranslatedText></h3>
                <p style={styles.studentBankingDescription}>
                  <TranslatedText>Start your financial journey with confidence. Our student banking solutions offer no-fee accounts, financial literacy resources, and tools designed specifically for students.</TranslatedText>
                </p>

                <div style={styles.studentBankingFeatures}>
                  <div style={styles.studentFeature}>
                    <span style={styles.studentFeatureIcon}>🎓</span>
                    <div>
                      <h4 style={styles.studentFeatureTitle}><TranslatedText>Student Checking Account</TranslatedText></h4>
                      <p style={styles.studentFeatureDesc}><TranslatedText>No monthly fees, free online banking, and mobile check deposit</TranslatedText></p>
                    </div>
                  </div>
                  <div style={styles.studentFeature}>
                    <span style={styles.studentFeatureIcon}>💡</span>
                    <div>
                      <h4 style={styles.studentFeatureTitle}><TranslatedText>Financial Education</TranslatedText></h4>
                      <p style={styles.studentFeatureDesc}><TranslatedText>Free workshops and resources to build financial literacy</TranslatedText></p>
                    </div>
                  </div>
                  <div style={styles.studentFeature}>
                    <span style={styles.studentFeatureIcon}>🏦</span>
                    <div>
                      <h4 style={styles.studentFeatureTitle}><TranslatedText>Student Savings Plans</TranslatedText></h4>
                      <p style={styles.studentFeatureDesc}><TranslatedText>High-yield savings accounts with goal-setting tools</TranslatedText></p>
                    </div>
                  </div>
                </div>

                <div style={styles.studentBankingActions}>
                  <Link href="/apply" style={styles.studentButtonPrimary}>
                    <span style={styles.buttonIcon}>🚀</span>
                    <TranslatedText>Open Student Account</TranslatedText>
                  </Link>
                  <Link href="/financial-education" style={styles.studentButtonSecondary}>
                    <span style={styles.buttonIcon}>📚</span>
                    <TranslatedText>Financial Resources</TranslatedText>
                  </Link>
                </div>
              </div>

              <div style={styles.studentBankingImageContainer}>
                <LocalizedImage
                  src="/images/Student_banking_services_ee1b5d89.png"
                  alt="Student Banking Services"
                  style={styles.studentBankingImage}
                  fallbackSrc="/images/fallback-student-banking-services.png"
                />
                <div style={styles.studentBankingBadge}>
                  <span style={styles.badgeIcon}>🎓</span>
                  <span><TranslatedText>Student Focused</TranslatedText></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Professional Banking Hall Discussion Section */}
        <section style={styles.consultationSection} id="consultation" data-animate>
          <div style={styles.container}>
            <div style={{
              ...styles.sectionHeader,
              ...(isVisible['consultation'] ? styles.fadeInUp : {})
            }}>
              <TranslatedText as="h2" style={styles.sectionTitle}>Professional Banking Consultation</TranslatedText>
              <TranslatedText as="p" style={styles.sectionSubtitle}>
                Experience world-class banking service with our dedicated professionals in modern banking facilities
              </TranslatedText>
              <div style={styles.titleUnderline}></div>
            </div>

            <div style={styles.consultationGrid}>
              <div style={styles.consultationImageSide}>
                <LocalizedImage
                  src="/images/Bank_hall_business_discussion_72f98bbe.png"
                  alt="Professional Banking Hall Discussion"
                  style={styles.consultationImage}
                  fallbackSrc="/images/fallback-bank-hall-business-discussion.png"
                />
              </div>
              <div style={styles.consultationContent}>
                <h3 style={styles.consultationTitle}><TranslatedText>Expert Financial Guidance</TranslatedText></h3>
                <p style={styles.consultationSubtitle}>
                  <TranslatedText>Meet with our certified banking professionals in our state-of-the-art facilities. Get personalized advice and solutions tailored to your financial goals.</TranslatedText>
                </p>
                <div style={styles.consultationFeatures}>
                  <div style={styles.consultationFeature}>
                    <span style={styles.consultationFeatureIcon}>👥</span>
                    <div>
                      <h4 style={styles.consultationFeatureTitle}><TranslatedText>Professional Banking Team</TranslatedText></h4>
                      <p style={styles.consultationFeatureDesc}><TranslatedText>Certified financial experts with decades of experience</TranslatedText></p>
                    </div>
                  </div>
                  <div style={styles.consultationFeature}>
                    <span style={styles.consultationFeatureIcon}>🏦</span>
                    <div>
                      <h4 style={styles.consultationFeatureTitle}><TranslatedText>Modern Banking Facilities</TranslatedText></h4>
                      <p style={styles.consultationFeatureDesc}><TranslatedText>Premium locations designed for your comfort and privacy</TranslatedText></p>
                    </div>
                  </div>
                  <div style={styles.consultationFeature}>
                    <span style={styles.consultationFeatureIcon}>🎯</span>
                    <div>
                      <h4 style={styles.consultationFeatureTitle}><TranslatedText>Personalized Solutions</TranslatedText></h4>
                      <p style={styles.consultationFeatureDesc}><TranslatedText>Custom financial strategies for your unique needs</TranslatedText></p>
                    </div>
                  </div>
                </div>
                <div style={styles.consultationActions}>
                  <Link href="/apply" style={styles.consultationButtonPrimary}>
                    <span style={styles.buttonIcon}>📅</span>
                    <TranslatedText>Schedule Meeting</TranslatedText>
                  </Link>
                  <Link href="/support" style={styles.consultationButtonSecondary}>
                    <span style={styles.buttonIcon}>💬</span>
                    <TranslatedText>Contact Expert</TranslatedText>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Banking Executive Team Section */}
        <section style={styles.executiveSection} id="executive-team" data-animate>
          <div style={styles.container}>
            <div style={styles.executiveGrid}>
              <div style={styles.executiveContent}>
                <h2 style={styles.executiveTitle}><TranslatedText>Leadership Excellence</TranslatedText></h2>
                <p style={styles.executiveSubtitle}>
                  <TranslatedText>Our experienced leadership team brings together decades of banking expertise to guide your financial journey with proven strategies and innovative solutions.</TranslatedText>
                </p>
                <div style={styles.executiveFeatures}>
                  <div style={styles.executiveFeature}>
                    <span style={styles.executiveFeatureIcon}>👨‍💼</span>
                    <div>
                      <h4 style={styles.executiveFeatureTitle}><TranslatedText>Executive Leadership</TranslatedText></h4>
                      <p style={styles.executiveFeatureDesc}><TranslatedText>Senior executives with proven track records in banking excellence</TranslatedText></p>
                    </div>
                  </div>
                  <div style={styles.executiveFeature}>
                    <span style={styles.executiveFeatureIcon}>📈</span>
                    <div>
                      <h4 style={styles.executiveFeatureTitle}><TranslatedText>Strategic Vision</TranslatedText></h4>
                      <p style={styles.executiveFeatureDesc}><TranslatedText>Forward-thinking approach to modern banking challenges</TranslatedText></p>
                    </div>
                  </div>
                  <div style={styles.executiveFeature}>
                    <span style={styles.executiveFeatureIcon}>🤝</span>
                    <div>
                      <h4 style={styles.executiveFeatureTitle}><TranslatedText>Client Commitment</TranslatedText></h4>
                      <p style={styles.executiveFeatureDesc}><TranslatedText>Dedicated to delivering exceptional customer experiences</TranslatedText></p>
                    </div>
                  </div>
                </div>
                <div style={styles.executiveActions}>
                  <Link href="/about" style={styles.executiveButtonPrimary}>
                    <span style={styles.buttonIcon}>👥</span>
                    <TranslatedText>Meet Our Team</TranslatedText>
                  </Link>
                  <Link href="/financial-advisory" style={styles.executiveButtonSecondary}>
                    <span style={styles.buttonIcon}>💼</span>
                    <TranslatedText>Advisory Services</TranslatedText>
                  </Link>
                </div>
              </div>
              <div style={styles.executiveImageSide}>
                <LocalizedImage
                  src="/images/Banking_executive_team_meeting_c758f3ec.png"
                  alt="Banking Executive Team Meeting"
                  style={styles.executiveImage}
                  fallbackSrc="/images/fallback-banking-executive-team-meeting.png"
                />
              </div>
            </div>
          </div>
        </section>



        {/* Account Types Discovery Section */}
        <section style={styles.accountTypesDiscovery} id="account-types-discovery" data-animate>
          <div style={styles.container}>
            <div style={{
              ...styles.sectionHeader,
              ...(isVisible['account-types-discovery'] ? styles.fadeInUp : {})
            }}>
              <TranslatedText as="h2" style={styles.sectionTitle}>Explore All Our Account Types</TranslatedText>
              <TranslatedText as="p" style={styles.sectionSubtitle}>
                Discover detailed information about all 23 account types we offer.
                Find comprehensive features, benefits, and eligibility requirements.
              </TranslatedText>
              <div style={styles.titleUnderline}></div>
            </div>

            <div style={styles.accountTypesPreview}>
              {[
                { icon: '💳', title: 'Personal Banking', desc: 'Checking, Savings, Student, Senior accounts and more', color: '#3b82f6' },
                { icon: '🏢', title: 'Business Banking', desc: 'Small Business, Corporate, and Professional accounts', color: '#10b981' },
                { icon: '📈', title: 'Investment Accounts', desc: 'Retirement, Investment, and Wealth Management options', color: '#f59e0b' },
                { icon: '🎯', title: 'Specialized Accounts', desc: 'HSA, Education, Trust, and International accounts', color: '#8b5cf6' }
              ].map((item, index) => (
                <div
                  key={index}
                  style={{
                    ...styles.previewCard,
                    ...(isVisible['account-types-discovery'] ? {
                      ...styles.slideInFromBottom,
                      animationDelay: `${index * 0.2}s`
                    } : {})
                  }}
                >
                  <div style={{...styles.previewIconContainer, backgroundColor: item.color}}>
                    <span style={styles.previewIcon}>{item.icon}</span>
                  </div>
                  <h3 style={styles.previewTitle}><TranslatedText>{item.title}</TranslatedText></h3>
                  <p style={styles.previewDesc}><TranslatedText>{item.desc}</TranslatedText></p>
                  <div style={{...styles.previewAccent, backgroundColor: item.color}}></div>
                </div>
              ))}
            </div>

            <div style={styles.accountTypesAction}>
              <Link href="/account-types" style={styles.exploreButton}>
                <span style={styles.buttonIcon}>🔍</span>
                <TranslatedText>Explore All 23 Account Types</TranslatedText>
              </Link>
              <p style={styles.actionNote}>
                <TranslatedText>Get detailed comparisons, features, and eligibility requirements</TranslatedText>
              </p>
            </div>
          </div>
        </section>

        {/* Mobile Banking Excellence Section */}
        <section style={styles.mobileBankingSection} id="mobile-banking" data-animate>
          <div style={styles.container}>
            <div style={{
              ...styles.sectionHeader,
              ...(isVisible['mobile-banking'] ? styles.fadeInUp : {})
            }}>
              <TranslatedText as="h2" style={styles.sectionTitle}>Award-Winning Mobile Banking</TranslatedText>
              <TranslatedText as="p" style={styles.sectionSubtitle}>
                Bank anywhere, anytime with our powerful mobile app featuring cutting-edge technology
              </TranslatedText>
              <div style={styles.titleUnderline}></div>
            </div>

            <div style={styles.mobileBankingGrid}>
              <div style={styles.mobileBankingImageContainer}>
                <LocalizedImage
                  src="/images/Mobile_banking_user_d80a1b31.png"
                  alt="Mobile Banking Excellence"
                  style={styles.mobileBankingImage}
                  fallbackSrc="/images/fallback-mobile-banking-user.png"
                />
                <div style={styles.mobileBankingBadge}>
                  <span style={styles.badgeIcon}>📱</span>
                  <span><TranslatedText>Mobile First</TranslatedText></span>
                </div>
              </div>

              <div style={styles.mobileBankingContent}>
                <h3 style={styles.mobileBankingTitle}><TranslatedText>Complete Control in Your Pocket</TranslatedText></h3>
                <p style={styles.mobileBankingDescription}>
                  <TranslatedText>Experience the future of banking with our award-winning mobile app. Manage all your accounts,
                  transfer funds, pay bills, and access financial insights - all from your smartphone.</TranslatedText>
                </p>

                <div style={styles.mobileBankingFeatures}>
                  <div style={styles.mobileBankingFeature}>
                    <span style={styles.mobileBankingFeatureIcon}>⚡</span>
                    <div>
                      <h4 style={styles.mobileBankingFeatureTitle}><TranslatedText>Instant Transfers</TranslatedText></h4>
                      <p style={styles.mobileBankingFeatureDesc}><TranslatedText>Send money in seconds with Zelle and instant transfers</TranslatedText></p>
                    </div>
                  </div>
                  <div style={styles.mobileBankingFeature}>
                    <span style={styles.mobileBankingFeatureIcon}>📸</span>
                    <div>
                      <h4 style={styles.mobileBankingFeatureTitle}><TranslatedText>Mobile Check Deposit</TranslatedText></h4>
                      <p style={styles.mobileBankingFeatureDesc}><TranslatedText>Deposit checks instantly by taking a photo</TranslatedText></p>
                    </div>
                  </div>
                  <div style={styles.mobileBankingFeature}>
                    <span style={styles.mobileBankingFeatureIcon}>🔔</span>
                    <div>
                      <h4 style={styles.mobileBankingFeatureTitle}><TranslatedText>Real-time Alerts</TranslatedText></h4>
                      <p style={styles.mobileBankingFeatureDesc}><TranslatedText>Stay informed with instant transaction notifications</TranslatedText></p>
                    </div>
                  </div>
                  <div style={styles.mobileBankingFeature}>
                    <span style={styles.mobileBankingFeatureIcon}>🔐</span>
                    <div>
                      <h4 style={styles.mobileBankingFeatureTitle}><TranslatedText>Biometric Security</TranslatedText></h4>
                      <p style={styles.mobileBankingFeatureDesc}><TranslatedText>Face ID and fingerprint authentication for secure access</TranslatedText></p>
                    </div>
                  </div>
                </div>

                <div style={styles.mobileBankingActions}>
                  <Link href="/apply" style={styles.mobileBankingButtonPrimary}>
                    <span style={styles.buttonIcon}>📲</span>
                    <TranslatedText>Download App</TranslatedText>
                  </Link>
                  <Link href="/account-types" style={styles.mobileBankingButtonSecondary}>
                    <span style={styles.buttonIcon}>ℹ️</span>
                    <TranslatedText>Learn More</TranslatedText>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ATM Services Section */}
        <section style={styles.atmSection} id="atm-services" data-animate>
          <div style={styles.container}>
            <div style={{
              ...styles.sectionHeader,
              ...(isVisible['atm-services'] ? styles.fadeInUp : {})
            }}>
              <TranslatedText as="h2" style={styles.sectionTitle}>Convenient ATM Access</TranslatedText>
              <TranslatedText as="p" style={styles.sectionSubtitle}>
                Access your money 24/7 with our extensive ATM network and advanced transaction capabilities
              </TranslatedText>
              <div style={styles.titleUnderline}></div>
            </div>

            <div style={styles.atmGrid}>
              <div style={styles.atmImageContainer}>
                <LocalizedImage
                  src="/images/Modern_bank_lobby_interior_27efc3bf.png"
                  alt="Modern Bank Lobby - ATM Services"
                  style={styles.atmImage}
                  fallbackSrc="/images/fallback-modern-bank-lobby-interior-2.png"
                />
                <div style={styles.atmBadge}>
                  <span style={styles.badgeIcon}>🏧</span>
                  <span><TranslatedText>24/7 Access</TranslatedText></span>
                </div>
              </div>

              <div style={styles.atmContent}>
                <h3 style={styles.atmTitle}><TranslatedText>Advanced ATM Services</TranslatedText></h3>
                <p style={styles.atmDescription}>
                  <TranslatedText>Experience modern banking with our state-of-the-art ATM network featuring advanced security,
                  multiple transaction types, and convenient locations nationwide.</TranslatedText>
                </p>

                <div style={styles.atmFeatures}>
                  <div style={styles.atmFeature}>
                    <span style={styles.atmFeatureIcon}>💰</span>
                    <div>
                      <h4 style={styles.atmFeatureTitle}><TranslatedText>Cash Withdrawals</TranslatedText></h4>
                      <p style={styles.atmFeatureDesc}><TranslatedText>Quick and secure cash access anytime</TranslatedText></p>
                    </div>
                  </div>
                  <div style={styles.atmFeature}>
                    <span style={styles.atmFeatureIcon}>📄</span>
                    <div>
                      <h4 style={styles.atmFeatureTitle}><TranslatedText>Balance Inquiries</TranslatedText></h4>
                      <p style={styles.atmFeatureDesc}><TranslatedText>Check your account balance instantly</TranslatedText></p>
                    </div>
                  </div>
                  <div style={styles.atmFeature}>
                    <span style={styles.atmFeatureIcon}>📱</span>
                    <div>
                      <h4 style={styles.atmFeatureTitle}><TranslatedText>Cardless Transactions</TranslatedText></h4>
                      <p style={styles.atmFeatureDesc}><TranslatedText>Access using your mobile app</TranslatedText></p>
                    </div>
                  </div>
                </div>

                <div style={styles.atmActions}>
                  <Link href="/atm" style={styles.atmButtonPrimary}>
                    <span style={styles.buttonIcon}>🗺️</span>
                    <TranslatedText>Find ATM Locations</TranslatedText>
                  </Link>
                  <Link href="/cards" style={styles.atmButtonSecondary}>
                    <span style={styles.buttonIcon}>💳</span>
                    <TranslatedText>Get Debit Card</TranslatedText>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Loan Approval Banner Section */}
        <section style={styles.loanBannerSection} id="loan-banner" data-animate>
          <div style={styles.container}>
            <div style={{
              ...styles.sectionHeader,
              ...(isVisible['loan-banner'] ? styles.fadeInUp : {})
            }}>
              <TranslatedText as="h2" style={styles.sectionTitle}>Fast Loan Approvals</TranslatedText>
              <TranslatedText as="p" style={styles.sectionSubtitle}>
                Get approved for loans quickly with our streamlined application process and competitive rates
              </TranslatedText>
              <div style={styles.titleUnderline}></div>
            </div>

            <div style={styles.loanBannerGrid}>
              <div style={styles.loanBannerContent}>
                <h3 style={styles.loanBannerTitle}><TranslatedText>Quick & Easy Loan Process</TranslatedText></h3>
                <p style={styles.loanBannerDescription}>
                  <TranslatedText>Experience fast loan approvals with our digital-first approach. Whether you need a personal loan,
                  auto financing, or a mortgage, we make the process simple and transparent.</TranslatedText>
                </p>

                <div style={styles.loanBannerFeatures}>
                  <div style={styles.loanBannerFeature}>
                    <span style={styles.loanBannerFeatureIcon}>⚡</span>
                    <div>
                      <h4 style={styles.loanBannerFeatureTitle}><TranslatedText>Fast Approval</TranslatedText></h4>
                      <p style={styles.loanBannerFeatureDesc}><TranslatedText>Get approved in as little as 24 hours</TranslatedText></p>
                    </div>
                  </div>
                  <div style={styles.loanBannerFeature}>
                    <span style={styles.loanBannerFeatureIcon}>💰</span>
                    <div>
                      <h4 style={styles.loanBannerFeatureTitle}><TranslatedText>Competitive Rates</TranslatedText></h4>
                      <p style={styles.loanBannerFeatureDesc}><TranslatedText>Best rates in the market</TranslatedText></p>
                    </div>
                  </div>
                  <div style={styles.loanBannerFeature}>
                    <span style={styles.loanBannerFeatureIcon}>📱</span>
                    <div>
                      <h4 style={styles.loanBannerFeatureTitle}><TranslatedText>Digital Process</TranslatedText></h4>
                      <p style={styles.loanBannerFeatureDesc}><TranslatedText>Apply online from anywhere</TranslatedText></p>
                    </div>
                  </div>
                </div>

                <div style={styles.loanBannerActions}>
                  <Link href="/loans" style={styles.loanBannerButtonPrimary}>
                    <span style={styles.buttonIcon}>🚀</span>
                    <TranslatedText>Apply for Loan</TranslatedText>
                  </Link>
                  <Link href="/calculators" style={styles.loanBannerButtonSecondary}>
                    <span style={styles.buttonIcon}>🧮</span>
                    <TranslatedText>Loan Calculator</TranslatedText>
                  </Link>
                </div>
              </div>

              <div style={styles.loanBannerImageContainer}>
                <LocalizedImage
                  src="/images/Loan_approval_celebration_a079ff82.png"
                  alt="Loan Approval Success"
                  style={styles.loanBannerImage}
                  fallbackSrc="/images/fallback-loan-approval-celebration.png"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <Suspense fallback={<div style={styles.loadingComponent}><TranslatedText>Loading testimonials...</TranslatedText></div>}>
          <TestimonialsSection />
        </Suspense>

        {/* Enhanced Final CTA */}
        <div id="final-cta" data-animate style={{
          ...(isVisible['final-cta'] ? styles.pulseGlow : {})
        }}>
          <Suspense fallback={<div style={styles.loadingComponent}><TranslatedText>Loading...</TranslatedText></div>}>
            <CTA
              title={user ? "Ready to Expand Your Banking?" : "Ready to Start Your Financial Journey?"}
              subtitle={user ?
                "Access premium banking services and explore all account options." :
                "Join over 500,000 customers who trust Oakline Bank. Open your account today."
              }
              buttonText={user ? "View Account Types" : "Open Account Now"}
              buttonLink={user ? "/account-types" : "/apply"}
              variant="primary"
            />
          </Suspense>
        </div>
  {/* Live Chat Component */}
      <LiveChat />

      <Footer />
    </div>
  );
}

const styles = {
  // Main Header Styles
  mainHeader: {
    backgroundColor: '#1A3E6F',
    borderBottom: '3px solid rgba(255, 200, 87, 0.3)',
    boxShadow: '0 2px 20px rgba(26, 62, 111, 0.3)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    width: '100%'
  },
  headerContainer: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0.75rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0'
  },
  topHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: '1.5rem',
    padding: '0.5rem 0'
  },
  authButtonsRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%'
  },
  logoAndBrandSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    textDecoration: 'none',
    flex: '0 0 auto',
    minWidth: 0,
    marginRight: 'auto',
    marginLeft: 0,
    paddingLeft: 0
  },
  headerLogo: {
    height: '71.68px',
    width: 'auto',
    transition: 'transform 0.3s ease'
  },
  brandTextSection: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '0.2rem'
  },
  bankName: {
    fontSize: '1.536rem',
    fontWeight: '800',
    color: 'white',
    lineHeight: '1.1',
    letterSpacing: '-0.01em',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  bankTagline: {
    fontSize: '0.6656rem',
    color: '#FFC857',
    fontWeight: '600',
    letterSpacing: '0.02em',
    opacity: 0.95
  },
  bankingPlusAndLanguageWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    justifyContent: 'center'
  },
  languageSelectorInline: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: 'auto'
  },
  scrollingWelcomeInline: {
    flex: '1 1 auto',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    padding: '0.6rem 1.5rem',
    position: 'relative',
    minWidth: '250px',
    maxWidth: '100%',
    margin: '0',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)'
  },
  bankingPlusRightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    flex: '0 0 auto'
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flex: 1,
    justifyContent: 'flex-end'
  },
  modernMenuButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 0.9rem',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    color: 'white'
  },
  hamburgerLines: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5px',
    width: '12px'
  },
  hamburgerLine: {
    width: '100%',
    height: '1.5px',
    backgroundColor: 'white',
    borderRadius: '1px',
    transition: 'all 0.3s ease'
  },
  menuText: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'white'
  },
  bankInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.25rem'
  },
  routingInfo: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#e2e8f0'
  },
  phoneInfo: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#059669'
  },
  enrollButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.8rem 1.5rem',
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
    transition: 'all 0.3s ease',
    border: 'none',
    cursor: 'pointer',
    backdropFilter: 'blur(10px)'
  },
  enrollButtonWhite: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.6rem 1rem',
    backgroundColor: 'white',
    color: '#1a365d',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '600',
    boxShadow: '0 3px 8px rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    minWidth: '100px',
    justifyContent: 'center'
  },

  // Sign Out Button Style
  signOutButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ffffff',
    border: '2px solid rgba(239, 68, 68, 0.4)',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    whiteSpace: 'nowrap'
  },

  // Banking+ Dropdown Styles
  bankingPlusContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  bankingPlusButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.5rem 0.8rem',
    backgroundColor: 'rgba(255, 200, 87, 0.15)',
    color: '#ffffff',
    border: '2px solid rgba(255, 200, 87, 0.4)',
    borderRadius: '10px',
    fontSize: '0.8rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    position: 'relative',
    overflow: 'hidden',
    backdropFilter: 'blur(10px)',
    minWidth: 'auto',
    whiteSpace: 'nowrap'
  },
  bankingPlusIconLines: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    width: '18px'
  },
  iconLine: {
    width: '100%',
    height: '2px',
    backgroundColor: '#ffffff',
    borderRadius: '1px',
    transition: 'all 0.3s ease'
  },
  bankingPlusText: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#ffffff'
  },
  bankingDropdown: {
    position: 'absolute',
    top: 'calc(100% + 0.75rem)',
    right: '1rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    border: '1px solid #e2e8eb',
    padding: '1rem',
    width: '600px',
    maxWidth: 'calc(100vw - 2rem)',
    zIndex: 10001,
    maxHeight: 'calc(100vh - 120px)',
    overflowY: 'auto',
    overflowX: 'hidden'
  },
  bankingDropdownHeader: {
    textAlign: 'center',
    marginBottom: '1rem',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky',
    top: '-1rem',
    backgroundColor: 'white',
    zIndex: 1,
    marginTop: '-1rem',
    marginLeft: '-1rem',
    marginRight: '-1rem',
    paddingLeft: '1rem',
    paddingRight: '1rem',
    paddingTop: '1rem'
  },
  bankingDropdownTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 0.5rem 0',
    letterSpacing: '-0.01em'
  },
  bankingDropdownSubtitle: {
    fontSize: '0.8rem',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.4'
  },
  bankingTwoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '1.5rem',
    marginBottom: '1rem'
  },
  bankingSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  dropdownSectionTitle: {
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: '#1A3E6F',
    margin: '0 0 0.5rem 0',
    padding: '0 0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  dropdownDivider: {
    height: '1px',
    backgroundColor: '#e2e8f0',
    margin: '0.75rem 0',
    width: '100%'
  },
  dropdownLink: {
    display: 'block',
    padding: '0.75rem 1rem',
    color: '#374151',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.9rem',
    transition: 'all 0.2s'
  },
  bankingSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky',
    top: '75px',
    backgroundColor: 'white',
    zIndex: 1,
    marginLeft: '-1rem',
    marginRight: '-1rem',
    paddingLeft: '1rem',
    paddingRight: '1rem'
  },
  bankingSectionIcon: {
    fontSize: '1.1rem'
  },
  bankingSectionTitle: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
    letterSpacing: '-0.005em'
  },
  bankingFeaturesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  bankingFeatureItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
    padding: '0.75rem',
    borderRadius: '8px',
    backgroundColor: 'white',
    border: 'none',
    textDecoration: 'none',
    color: '#1e293b',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    minHeight: '52px'
  },
  bankingFeatureIcon: {
    fontSize: '1rem',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    flexShrink: 0
  },
  bankingFeatureContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem'
  },
  bankingFeatureName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: '1.3'
  },
  bankingFeatureDesc: {
    fontSize: '0.75rem',
    color: '#64748b',
    lineHeight: '1.3',
    fontWeight: '400'
  },
  bankingFeatureArrow: {
    fontSize: '0.9rem',
    fontWeight: '400',
    flexShrink: 0,
    color: '#94a3b8',
    transition: 'all 0.2s ease',
    transform: 'translateX(0)',
    opacity: 0.7
  },
  bankingDropdownFooter: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid #e2e8f0',
    marginTop: '1rem',
    position: 'sticky',
    bottom: '-1rem',
    backgroundColor: 'white',
    marginLeft: '-1rem',
    marginRight: '-1rem',
    paddingLeft: '1rem',
    paddingRight: '1rem',
    paddingBottom: '1rem',
    marginBottom: '-1rem'
  },
  viewAllServicesButton: {
    display: 'block',
    width: '100%',
    padding: '0.75rem 1.25rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)',
    cursor: 'pointer',
    textAlign: 'center'
  },
  viewAllServicesButtonSecondary: {
    display: 'block',
    width: '100%',
    padding: '0.75rem 1.25rem',
    backgroundColor: 'transparent',
    color: '#1e40af',
    textDecoration: 'none',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    border: '2px solid #1e40af',
    cursor: 'pointer',
    textAlign: 'center'
  },
  viewAllServicesButtonEnroll: {
    display: 'block',
    width: '100%',
    padding: '0.75rem 1.25rem',
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.4)',
    cursor: 'pointer',
    textAlign: 'center',
    marginBottom: '0.5rem'
  },

  navigationDropdown: {
    position: 'relative',
    zIndex: 10
  },
  dropdownButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: 'white',
    border: '2px solid #1a365d',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1a365d',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  menuIcon: {
    fontSize: '1.1rem'
  },
  dropdownArrow: {
    fontSize: '0.8rem',
    transition: 'transform 0.3s ease'
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  featuresDropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 0.5rem)',
    left: 0,
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(26, 54, 93, 0.2)',
    border: '2px solid #e2e8f0',
    padding: '2rem',
    minWidth: '400px',
    maxWidth: '90vw',
    zIndex: 1000,
    animation: 'dropdownSlideIn 0.3s ease-out'
  },
  bankingDropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 0.5rem)',
    right: '0',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 15px 35px rgba(30, 58, 138, 0.2)',
    border: '2px solid #e2e8f0',
    padding: '1.25rem',
    width: '380px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    overflowY: 'auto',
    zIndex: 9999,
    animation: 'dropdownSlideIn 0.3s ease-out'
  },
  bankingDropdownMenuCentered: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 15px 30px rgba(26, 54, 93, 0.2)',
    border: '2px solid #059669',
    padding: '1.5rem',
    minWidth: '420px',
    maxWidth: '85vw',
    maxHeight: '70vh',
    overflowY: 'auto',
    zIndex: 10000,
    animation: 'dropdownSlideIn 0.4s ease-out',
    backdropFilter: 'blur(15px)',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)'
  },
  dropdownBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9999
  },
  bankingDropdownGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '1.5rem'
  },
  bankingDropdownSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  bankingDropdownSectionTitle: {
    fontSize: '0.9rem',
    fontWeight: '800',
    color: '#1a365d',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '0.5rem'
  },
  bankingDropdownLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.875rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'white',
    border: 'none',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    minHeight: '56px'
  },
  bankingDropdownIcon: {
    fontSize: '1.3rem',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    color: 'white',
    borderRadius: '8px',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(14, 165, 233, 0.3)'
  },
  bankingDropdownTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: '0.2rem'
  },
  bankingDropdownDesc: {
    fontSize: '0.8rem',
    color: '#64748b',
    fontWeight: '500'
  },
  accountTypesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    maxHeight: '400px',
    overflowY: 'auto',
    marginBottom: '0.5rem',
    paddingRight: '0.5rem'
  },
  viewAllAccountsLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.8rem',
    borderRadius: '8px',
    backgroundColor: '#f0f9ff',
    border: '2px solid #0ea5e9',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  },
  bankingDropdownCTA: {
    display: 'flex',
    gap: '0.75rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e2e8f0',
    flexWrap: 'wrap'
  },
  bankingDropdownButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '700',
    transition: 'all 0.2s ease',
    border: 'none',
    minWidth: '120px',
    boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
  },
  bankingDropdownSecondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem 1.5rem',
    background: 'transparent',
    color: '#1a365d',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '700',
    border: '2px solid #1a365d',
    transition: 'all 0.2s ease',
    minWidth: '120px'
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem'
  },
  dropdownSection: {
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '1rem'
  },
  dropdownSectionTitle: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '2px solid #e2e8f0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.2rem',
    padding: '1.2rem 1.5rem',
    color: '#1e293b',
    textDecoration: 'none',
    fontSize: '1.05rem',
    fontWeight: '600',
    borderRadius: '12px',
    transition: 'all 0.3s ease',
    margin: '0.4rem 0',
    border: '1.5px solid #e2e8f0',
    backgroundColor: '#ffffff'
  },
  dropdownItemIcon: {
    fontSize: '1.2rem',
    width: '24px',
    textAlign: 'center'
  },
  authButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  loginButton: {
    padding: '0.6rem 1.2rem',
    backgroundColor: 'transparent',
    border: '2px solid #059669',
    color: '#059669',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.3s ease'
  },
  applyButton: {
    padding: '0.6rem 1.2rem',
    backgroundColor: 'white',
    color: '#1a365d',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(26, 54, 93, 0.2)',
    border: '2px solid #1a365d',
    transition: 'all 0.3s ease'
  },
  dashboardButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.2rem',
    backgroundColor: 'white',
    color: '#1a365d',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(26, 54, 93, 0.2)',
    border: '2px solid #1a365d',
    transition: 'all 0.3s ease'
  },
  menuButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.2rem',
    backgroundColor: 'white',
    color: '#1a365d',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(26, 54, 93, 0.2)',
    border: '2px solid #1a365d',
    transition: 'all 0.3s ease'
  },
  buttonIcon: {
    fontSize: '1rem'
  },
  topBarContent: {
    maxWidth: '1400px',
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 1.5rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  announcement: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flexGrow: 1,
    flexWrap: 'wrap'
  },
  announcementIcon: {
    fontSize: '1.5rem',
    marginRight: '0.5rem',
    color: '#059669' // Primary accent color
  },
  announcementText: {
    fontWeight: '500',
    color: '#94a3b8', // Slightly muted text
    flexShrink: 0
  },
  announcementLink: {
    color: '#059669',
    textDecoration: 'none',
    fontWeight: '700',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    transition: 'all 0.3s ease',
    marginLeft: 'auto' // Pushes the link to the right
  },
  topBarLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem'
  },
  topBarLink: {
    color: '#94a3b8',
    textDecoration: 'none',
    fontWeight: '600',
    transition: 'color 0.3s ease',
    position: 'relative'
  },
  phoneNumber: {
    fontWeight: '700',
    color: '#059669', // Primary accent color for phone number
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },

  // Loading Screen Styles
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  loadingSpinner: {
    textAlign: 'center',
    maxWidth: '400px',
    padding: '2rem'
  },
  spinner: {
    width: '80px',
    height: '80px',
    border: '8px solid rgba(255,255,255,0.2)',
    borderTop: '8px solid #ffffff',
    borderRadius: '50%',
    animation: 'spin 1.2s linear infinite',
    marginBottom: '2rem',
    margin: '0 auto 2rem'
  },
  loadingContent: {
    textAlign: 'center'
  },
  loadingTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '1rem',
    animation: 'fadeInUp 1s ease-out'
  },
  loadingText: {
    fontSize: '1.1rem',
    opacity: 0.9,
    marginBottom: '2rem',
    animation: 'fadeInUp 1s ease-out 0.3s both'
  },
  loadingProgress: {
    width: '100%',
    height: '4px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '2px',
    overflow: 'hidden',
    animation: 'fadeInUp 1s ease-out 0.6s both'
  },
  progressBar: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
    borderRadius: '2px',
    animation: 'progressSlide 2s ease-in-out infinite'
  },

  // Main Container
  pageContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    width: '100%',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },

  // Professional Banking Hero Section
  heroSection: {
    position: 'relative',
    height: 'clamp(400px, 56vh, 560px)',
    overflow: 'hidden',
    width: '100%',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    padding: '2rem 1rem',
    border: 'none'
  },
  heroParallax: {
    position: 'relative',
    width: '100%',
    height: '100%',
    perspective: '1000px'
  },
  heroSlide: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    transition: 'opacity 0.8s ease-in-out, transform 0.8s ease-in-out',
    overflow: 'hidden',
  },
  heroImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden'
  },
  heroImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    transition: 'all 1.2s ease-in-out',
    transform: 'scale(1.05)',
    animation: 'heroImageFloat 20s ease-in-out infinite',
    filter: 'grayscale(5%) brightness(1.3) contrast(1.1) opacity(0.9)'
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.3) 100%)',
    zIndex: 1
  },
  heroContent: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    color: 'white',
    maxWidth: '95%',
    width: '100%',
    padding: '0 1rem',
    zIndex: 10,
    transition: 'all 1s ease-out'
  },
  heroAnimated: {
    animation: 'heroContentSlideUp 1.2s ease-out'
  },
  heroIconContainer: {
    marginBottom: '1.5rem'
  },
  heroIcon: {
    fontSize: 'clamp(3rem, 6vw, 4.5rem)',
    display: 'inline-block',
    filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))',
    animation: 'heroIconBounce 2s ease-in-out infinite'
  },
  heroTitle: {
    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
    fontWeight: '900',
    marginBottom: '1rem',
    textShadow: '2px 4px 8px rgba(0,0,0,0.5)',
    lineHeight: '1.1',
    letterSpacing: '-0.02em'
  },
  heroSubtitle: {
    fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
    marginBottom: '2rem',
    opacity: 0.95,
    maxWidth: '600px',
    margin: '0 auto 2rem',
    fontWeight: '400',
    lineHeight: '1.5',
    textShadow: '1px 2px 4px rgba(0,0,0,0.3)'
  },
  heroActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: '1.5rem'
  },
  primaryButton: {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    color: 'white',
    border: '2px solid white',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },



  heroButtons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: '1rem'
  },
  heroButton: {
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    color: 'white',
    textDecoration: 'none',
    padding: 'clamp(1rem, 2vw, 1.3rem) clamp(1.5rem, 4vw, 2.5rem)',
    borderRadius: '12px',
    fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
    fontWeight: '700',
    boxShadow: '0 8px 24px rgba(14, 165, 233, 0.4)',
    transition: 'all 0.3s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    border: 'none',
    transform: 'translateY(0)',
    animation: 'buttonPulse 2s ease-in-out infinite'
  },

  // Slide Indicators
  slideIndicators: {
    position: 'absolute',
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '12px',
    zIndex: 15
  },
  indicator: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: '2px solid white',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.4s ease',
    backdropFilter: 'blur(5px)'
  },
  indicatorActive: {
    backgroundColor: 'white',
    transform: 'scale(1.4)',
    boxShadow: '0 0 20px rgba(255,255,255,0.8)'
  },

  // Enhanced Features Showcase
  featuresShowcase: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#f1f5f9',
    width: '100%',
    position: 'relative'
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 1rem',
    width: '100%'
  },
  sectionHeader: {
    textAlign: 'center',
    marginBottom: 'clamp(2rem, 5vw, 4rem)',
    transition: 'all 0.8s ease-out'
  },
  staggeredFadeIn: {
    animation: 'staggeredFadeIn 1s ease-out'
  },
  sectionTitle: {
    fontSize: 'clamp(2rem, 4vw, 3rem)',
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: '1rem',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '-0.02em'
  },
  sectionSubtitle: {
    fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
    color: '#64748b',
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: '1.6',
    fontWeight: '400'
  },
  titleUnderline: {
    width: '80px',
    height: '4px',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)',
    margin: '1.5rem auto 0',
    borderRadius: '2px',
    animation: 'underlineExpand 1s ease-out 0.5s both'
  },

  // Feature Showcase Content
  featureShowcaseContainer: {
    marginBottom: '3rem'
  },
  featureContent: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
    gap: 'clamp(2rem, 4vw, 4rem)',
    alignItems: 'center'
  },
  featureImageContainer: {
    position: 'relative',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
    transition: 'all 0.8s ease-out',
    transform: 'translateX(-100px)',
    opacity: 0
  },
  slideInFromLeft: {
    animation: 'slideInFromLeft 1s ease-out forwards'
  },
  featureImage: {
    width: '100%',
    height: '240px',
    objectFit: 'cover',
    transition: 'transform 0.5s ease'
  },
  featureImageOverlay: {
    position: 'absolute',
    top: '20px',
    right: '20px'
  },
  featureBadge: {
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    color: 'white',
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '700',
    boxShadow: '0 6px 16px rgba(14, 165, 233, 0.4)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backdropFilter: 'blur(10px)'
  },
  badgeIcon: {
    fontSize: '1rem'
  },
  featureInfo: {
    padding: '1rem',
    transition: 'all 0.8s ease-out',
    transform: 'translateX(100px)',
    opacity: 0
  },
  slideInFromRight: {
    animation: 'slideInFromRight 1s ease-out forwards'
  },
  featureTitle: {
    fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: '1.5rem',
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '-0.01em'
  },
  featureDescription: {
    fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
    color: '#64748b',
    marginBottom: '2rem',
    lineHeight: '1.7',
    fontWeight: '400'
  },
  featuresList: {
    marginBottom: '2.5rem'
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
    fontSize: '1rem',
    color: '#374151',
    opacity: 0,
    transform: 'translateX(-20px)'
  },
  bounceInLeft: {
    animation: 'bounceInLeft 0.6s ease-out forwards'
  },
  featureIcon: {
    backgroundColor: '#10b981',
    color: 'white',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    boxShadow: '0 4px 8px rgba(16, 185, 129, 0.3)'
  },
  featureText: {
    fontWeight: '600'
  },
  featureActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  featureButton: {
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: 'white',
    textDecoration: 'none',
    padding: '1rem 1.8rem',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    display: 'inline-block',
    boxShadow: '0 6px 16px rgba(4, 120, 87, 0.4)',
    transform: 'translateY(0)'
  },
  featureButtonSecondary: {
    backgroundColor: 'transparent',
    color: '#059669',
    textDecoration: 'none',
    padding: '1rem 1.8rem',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '700',
    border: '2px solid #059669',
    transition: 'all 0.3s ease',
    display: 'inline-block'
  },

  // Feature Indicators
  featureIndicators: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '2.5rem'
  },
  featureIndicator: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    border: '2px solid #0ea5e9',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  featureIndicatorActive: {
    backgroundColor: '#0ea5e9',
    transform: 'scale(1.4)'
  },

  // Account Types Banner Section
  accountTypesBanner: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    background: '#ffffff',
    width: '100%',
    position: 'relative'
  },
  loginPrompt: {
    marginTop: '1rem',
    display: 'block'
  },
  loginLink: {
    color: '#059669',
    textDecoration: 'none',
    fontWeight: '700',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    transition: 'all 0.3s ease',
    display: 'inline-block',
    marginTop: '0.5rem'
  },

  // Account Banner Container
  accountBannerContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))',
    gap: '3rem',
    alignItems: 'center',
    marginTop: '3rem'
  },
  accountBannerImage: {
    position: 'relative',
    borderRadius: '24px',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    padding: '2.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 15px 40px rgba(30, 64, 175, 0.2)'
  },
  bannerImage: {
    width: '90%',
    height: 'auto',
    maxHeight: '300px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))',
    transition: 'transform 0.3s ease'
  },
  bannerImageFallback: {
    position: 'absolute',
    top: '25px',
    right: '25px',
    bottom: '25px',
    left: '25px',
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    border: '2px dashed #0ea5e9'
  },
  fallbackContent: {
    textAlign: 'center'
  },
  fallbackIcon: {
    fontSize: '3rem',
    color: '#0ea5e9',
    marginBottom: '1rem'
  },
  fallbackTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '0.5rem'
  },
  fallbackText: {
    fontSize: '1rem',
    color: '#64748b',
    lineHeight: '1.4'
  },
  accountBannerContent: {
    padding: '1rem'
  },
  accountHighlights: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2.5rem'
  },
  highlightItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  highlightIcon: {
    fontSize: '1.8rem',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
    color: 'white',
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
  },
  highlightTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  highlightDesc: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  accountBannerActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  viewAllAccountsButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(30, 64, 175, 0.4)'
  },
  applyNowButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    backgroundColor: '#059669',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(5, 150, 105, 0.4)'
  },
  signInButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: '#1e293b',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    border: '2px solid #1e293b',
    transition: 'all 0.3s ease'
  },

  // Professional Banking Section
  professionalFeaturesSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    width: '100%',
    position: 'relative'
  },

  // Professional Services Section
  professionalServicesSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    background: '#ffffff',
    width: '100%'
  },
  professionalServicesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 500px), 1fr))',
    gap: '3rem',
    marginTop: '3rem'
  },
  professionalServiceCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    border: '2px solid #e2e8f0',
    transition: 'all 0.4s ease',
    position: 'relative'
  },
  serviceImageContainer: {
    position: 'relative',
    height: '280px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: '20px'
  },
  serviceImage: {
    width: '90%',
    height: 'auto',
    maxHeight: '250px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))'
  },
  serviceBadge: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(255,255,255,0.95)',
    color: '#1e40af',
    padding: '10px 16px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  },
  serviceContent: {
    padding: '2.5rem'
  },
  serviceTitle: {
    fontSize: 'clamp(1.5rem, 3vw, 1.8rem)',
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  serviceDescription: {
    fontSize: '1.1rem',
    color: '#64748b',
    lineHeight: '1.6',
    marginBottom: '2rem'
  },
  serviceFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '2rem'
  },
  serviceFeature: {
    color: '#059669',
    fontSize: '0.95rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  serviceButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(30, 64, 175, 0.4)'
  },

  // Student Banking Section
  studentBankingSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#f8fafc',
    width: '100%'
  },
  studentBankingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
    gap: '3rem',
    alignItems: 'center',
    marginTop: '3rem'
  },
  studentBankingContent: {
    padding: '1rem'
  },
  studentBankingTitle: {
    fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: '1.5rem',
    letterSpacing: '-0.01em'
  },
  studentBankingDescription: {
    fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
    color: '#64748b',
    marginBottom: '2rem',
    lineHeight: '1.7',
    fontWeight: '400'
  },
  studentBankingFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2.5rem'
  },
  studentFeature: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  studentFeatureIcon: {
    fontSize: '1.5rem',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
    color: 'white',
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
  },
  studentFeatureTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  studentFeatureDesc: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  studentBankingActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  studentButtonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(139, 92, 246, 0.4)'
  },
  studentButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: '#8b5cf6',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    border: '2px solid #8b5cf6',
    transition: 'all 0.3s ease'
  },
  studentBankingImageContainer: {
    position: 'relative',
    borderRadius: '20px',
    overflow: 'hidden',
    padding: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 15px 40px rgba(0, 0, 0, 0.1)'
  },
  studentBankingImage: {
    width: '90%',
    height: 'auto',
    maxHeight: '350px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))'
  },
  studentBankingBadge: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(255,255,255,0.95)',
    color: '#8b5cf6',
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '700',
    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))',
    gap: '2rem',
    marginBottom: '4rem'
  },
  professionalFeatureCard: {
    backgroundColor: 'white',
    padding: '2.5rem',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 8px 25px rgba(26, 54, 93, 0.08)',
    border: '2px solid #e2e8f0',
    transition: 'all 0.4s ease',
    position: 'relative',
    overflow: 'hidden'
  },
  featureIconBadge: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
    position: 'relative',
    boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
  },
  featureIconLarge: {
    fontSize: '2.2rem',
    color: 'white'
  },
  professionalFeatureTitle: {
    fontSize: '1.4rem',
    fontWeight: '800',
    color: '#1a365d',
    marginBottom: '1rem',
    letterSpacing: '-0.01em'
  },
  professionalFeatureDesc: {
    fontSize: '1rem',
    color: '#64748b',
    lineHeight: '1.6',
    marginBottom: '1.5rem'
  },
  featureMetric: {
    display: 'inline-block',
    padding: '0.8rem 1.5rem',
    borderRadius: '25px',
    border: '2px solid',
    backgroundColor: 'rgba(255,255,255,0.8)',
    backdropFilter: 'blur(10px)'
  },
  metricText: {
    fontSize: '1rem',
    fontWeight: '800',
    letterSpacing: '0.5px'
  },

  // Enrollment Section
  enrollmentSection: {
    textAlign: 'center'
  },
  enrollmentCard: {
    backgroundColor: '#f8fafc',
    padding: 'clamp(2.5rem, 5vw, 4rem)',
    borderRadius: '24px',
    maxWidth: '800px',
    margin: '0 auto',
    border: '2px solid #e2e8f0',
    boxShadow: '0 10px 30px rgba(26, 54, 93, 0.1)'
  },
  enrollmentTitle: {
    fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
    fontWeight: '900',
    color: '#1a365d',
    marginBottom: '1rem',
    letterSpacing: '-0.02em'
  },
  enrollmentSubtitle: {
    fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
    color: '#64748b',
    marginBottom: '2.5rem',
    lineHeight: '1.6'
  },
  enrollmentButtons: {
    display: 'flex',
    gap: '1.5rem',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  enrollmentButtonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: 'clamp(1rem, 2.5vw, 1.3rem) clamp(1.5rem, 4vw, 2.5rem)',
    background: 'linear-gradient(135deg, #1e40af 0%, #0ea5e9 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: 'clamp(1rem, 2.2vw, 1.1rem)',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 20px rgba(30, 64, 175, 0.3)'
  },
  enrollmentButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: 'clamp(1rem, 2.5vw, 1.3rem) clamp(1.5rem, 4vw, 2.5rem)',
    backgroundColor: 'transparent',
    color: '#1a365d',
    textDecoration: 'none',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: 'clamp(1rem, 2.2vw, 1.1rem)',
    border: '2px solid #1a365d',
    transition: 'all 0.3s ease'
  },

  // Features Dropdown Styles
  featuresDropdown: {
    position: 'relative',
    display: 'inline-block'
  },
  featuresDropdownButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 1.8rem',
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    color: '#1a365d',
    border: '2px solid #059669',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(5, 150, 105, 0.15)',
    position: 'relative',
    overflow: 'hidden'
  },
  featuresDropdownMenu: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'white',
    borderRadius: '20px',
    boxShadow: '0 25px 50px rgba(26, 54, 93, 0.25)',
    border: '2px solid #059669',
    padding: '2.5rem',
    minWidth: '520px',
    maxWidth: '90vw',
    zIndex: 1000,
    animation: 'dropdownSlideIn 0.4s ease-out',
    backdropFilter: 'blur(20px)',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)'
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  featureDropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.2rem',
    padding: '1.2rem',
    borderRadius: '12px',
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden'
  },
  featureDropdownIcon: {
    fontSize: '1.6rem',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: 'white',
    borderRadius: '50%',
    flexShrink: 0
  },
  featureDropdownTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: '0.25rem'
  },
  featureDropdownDesc: {
    fontSize: '0.85rem',
    color: '#059669',
    fontWeight: '600'
  },
  dropdownCTA: {
    textAlign: 'center',
    paddingTop: '1.5rem',
    borderTop: '1px solid #e2e8f0'
  },
  dropdownButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '700',
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
    transition: 'all 0.3s ease'
  },
  dropdownArrow: {
    fontSize: '0.8rem',
    transition: 'transform 0.3s ease'
  },

  // White Button Styles for Header
  enrollButtonWhite: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.6rem 1rem',
    backgroundColor: 'white',
    color: '#1a365d',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '600',
    boxShadow: '0 3px 8px rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    minWidth: '100px',
    justifyContent: 'center'
  },
  loginButtonWhite: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.7rem 1.2rem',
    backgroundColor: 'white',
    color: '#1a365d',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    cursor: 'pointer'
  },
  applyButtonWhite: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.7rem 1.2rem',
    backgroundColor: 'white',
    color: '#1a365d',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)'
  },
  dashboardButtonWhite: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.7rem 1.2rem',
    backgroundColor: 'white',
    color: '#1a365d',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)'
  },
  menuButtonWhite: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.7rem 1.2rem',
    backgroundColor: 'white',
    color: '#1a365d',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)'
  },
  logoutButtonWhite: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.7rem 1.2rem',
    backgroundColor: 'white',
    color: '#1a365d',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(255, 255, 255, 0.2)',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    cursor: 'pointer'
  },

  // New Banking Image Section
  newBankingImageSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#ffffff',
    width: '100%'
  },
  newBankingImageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))',
    gap: '3rem',
    alignItems: 'center',
    marginTop: '3rem'
  },
  newBankingImageContainer: {
    position: 'relative',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 15px 40px rgba(30, 64, 175, 0.2)'
  },
  newBankingImage: {
    width: '100%',
    height: '400px',
    objectFit: 'contain',
    objectPosition: 'center',
    transition: 'transform 0.3s ease'
  },
  newBankingImageContent: {
    padding: '1rem'
  },
  newBankingImageTitle: {
    fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: '1.5rem',
    letterSpacing: '-0.01em'
  },
  newBankingImageDescription: {
    fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
    color: '#64748b',
    marginBottom: '2rem',
    lineHeight: '1.7',
    fontWeight: '400'
  },
  newBankingImageFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '2.5rem'
  },
  newBankingImageFeature: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '1rem',
    color: '#1e293b',
    fontWeight: '500'
  },
  newBankingImageFeatureIcon: {
    fontSize: '1.2rem',
    color: '#059669',
    fontWeight: 'bold'
  },
  newBankingImageActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  newBankingImageButtonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(5, 150, 105, 0.4)'
  },
  newBankingImageButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: '#059669',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    border: '2px solid #059669',
    transition: 'all 0.3s ease'
  },

  // Professional Banking Cards Section
  professionalCardsSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#f8fafc',
    width: '100%'
  },
  professionalCardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))',
    gap: '3rem',
    alignItems: 'center',
    marginTop: '3rem'
  },
  professionalCardsImageContainer: {
    position: 'relative',
    borderRadius: '24px',
    overflow: 'hidden',
    padding: '2.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 15px 40px rgba(30, 64, 175, 0.2)'
  },
  professionalCardsImage: {
    width: '100%',
    height: 'auto',
    maxHeight: '400px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))'
  },
  professionalCardsBadge: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(255,255,255,0.95)',
    color: '#1e40af',
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '700',
    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  professionalCardsContent: {
    padding: '1rem'
  },
  professionalCardsTitle: {
    fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: '1.5rem',
    letterSpacing: '-0.01em'
  },
  professionalCardsDescription: {
    fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
    color: '#64748b',
    marginBottom: '2rem',
    lineHeight: '1.7',
    fontWeight: '400'
  },
  professionalCardsFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2.5rem'
  },
  professionalCardsFeature: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  professionalCardsFeatureIcon: {
    fontSize: '1.5rem',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)'
  },
  professionalCardsFeatureTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  professionalCardsFeatureDesc: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  professionalCardsActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  professionalCardsButtonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(30, 64, 175, 0.4)'
  },
  professionalCardsButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: '#1e40af',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    border: '2px solid #1e40af',
    transition: 'all 0.3s ease'
  },

  // Debit Card Showcase Section
  debitCardShowcase: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#ffffff',
    width: '100%',
    position: 'relative'
  },
  debitCardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 500px), 1fr))',
    gap: '3rem',
    marginBottom: '4rem'
  },
  debitCardItem: {
    backgroundColor: '#f8fafc',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    border: '2px solid #e2e8f0',
    transition: 'all 0.4s ease',
    position: 'relative'
  },
  debitCardImageContainer: {
    position: 'relative',
    height: '224px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
  },
  debitCardImage: {
    width: '90%',
    height: 'auto',
    maxHeight: '192px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))',
    transition: 'transform 0.3s ease'
  },
  debitCardBadge: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(255,255,255,0.95)',
    color: '#1e40af',
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '700',
    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  debitCardContent: {
    padding: '2.5rem'
  },
  debitCardTitle: {
    fontSize: 'clamp(1.5rem, 3vw, 1.8rem)',
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: '1rem',
    letterSpacing: '-0.01em'
  },
  debitCardDescription: {
    fontSize: '1.1rem',
    color: '#64748b',
    lineHeight: '1.6',
    marginBottom: '2rem'
  },
  debitCardFeatures: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginBottom: '2rem'
  },
  featureTag: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '600',
    border: '1px solid #bae6fd'
  },
  debitCardButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(30, 64, 175, 0.4)'
  },
  debitCardCTA: {
    textAlign: 'center',
    backgroundColor: '#f1f5f9',
    padding: 'clamp(3rem, 6vw, 4rem)',
    borderRadius: '20px',
    border: '2px solid #e2e8f0'
  },
  debitCardCTATitle: {
    fontSize: 'clamp(1.8rem, 4vw, 2.2rem)',
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  debitCardCTASubtitle: {
    fontSize: '1.1rem',
    color: '#64748b',
    marginBottom: '2.5rem',
    maxWidth: '600px',
    margin: '0 auto 2.5rem'
  },
  debitCardCTAButtons: {
    display: 'flex',
    gap: '1.5rem',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  debitCardCTAPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: 'clamp(1rem, 2.5vw, 1.3rem) clamp(1.5rem, 4vw, 2.5rem)',
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: 'clamp(1rem, 2.2vw, 1.1rem)',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(5, 150, 105, 0.4)'
  },
  debitCardCTASecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: 'clamp(1rem, 2.5vw, 1.3rem) clamp(1.5rem, 4vw, 2.5rem)',
    backgroundColor: 'transparent',
    color: '#1e293b',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: 'clamp(1rem, 2.2vw, 1.1rem)',
    fontWeight: '700',
    border: '2px solid #1e293b',
    transition: 'all 0.3s ease'
  },



  // Professional Banking Consultation Section
  consultationSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: 'white',
    width: '100%'
  },

  // Banking Executive Team Section
  executiveSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#f8fafc',
    width: '100%'
  },
  executiveGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
    gap: '3rem',
    alignItems: 'center'
  },
  executiveContent: {
    padding: '1rem'
  },
  executiveTitle: {
    fontSize: 'clamp(2rem, 4vw, 2.5rem)',
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: '1rem',
    letterSpacing: '-0.01em'
  },
  executiveSubtitle: {
    fontSize: '1.1rem',
    color: '#64748b',
    marginBottom: '2rem',
    lineHeight: '1.6'
  },
  executiveFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2.5rem'
  },
  executiveFeature: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  executiveFeatureIcon: {
    fontSize: '1.5rem',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)'
  },
  executiveFeatureTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  executiveFeatureDesc: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  executiveActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  executiveButtonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(30, 64, 175, 0.4)'
  },
  executiveButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: '#1e40af',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    border: '2px solid #1e40af',
    transition: 'all 0.3s ease'
  },
  executiveImageSide: {
    position: 'relative',
    borderRadius: '20px',
    overflow: 'hidden',
    padding: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 15px 40px rgba(0, 0, 0, 0.1)'
  },
  executiveImage: {
    width: '100%',
    height: 'auto',
    maxHeight: '400px',
    objectFit: 'cover',
    borderRadius: '12px',
    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))'
  },
  consultationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
    gap: '3rem',
    alignItems: 'center'
  },
  consultationImageSide: {
    position: 'relative',
    borderRadius: '20px',
    overflow: 'hidden',
    padding: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 15px 40px rgba(0, 0, 0, 0.1)'
  },
  consultationImage: {
    width: '90%',
    height: 'auto',
    maxHeight: '350px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))'
  },
  consultationContent: {
    padding: '1rem'
  },
  consultationTitle: {
    fontSize: 'clamp(2rem, 4vw, 2.5rem)',
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: '1rem',
    letterSpacing: '-0.01em'
  },
  consultationSubtitle: {
    fontSize: '1.1rem',
    color: '#64748b',
    marginBottom: '2rem',
    lineHeight: '1.6'
  },
  consultationFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2.5rem'
  },
  consultationFeature: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  consultationFeatureIcon: {
    fontSize: '1.5rem',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
    color: 'white',
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
  },
  consultationFeatureTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  consultationFeatureDesc: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  consultationActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  consultationButtonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(5, 150, 105, 0.4)'
  },
  consultationButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: '#059669',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    border: '2px solid #059669',
    transition: 'all 0.3s ease'
  },

  // Scrolling Welcome Message Styles
  scrollingWelcomeContainer: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '20px',
    padding: '0.5rem 1rem',
    position: 'relative',
    width: '100%'
  },
  languageSelectorWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: '200px'
  },
  bankingPlusRowContainer: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%'
  },
  scrollingWelcomeText: {
    whiteSpace: 'nowrap',
    animation: 'scrollWelcome 30s linear infinite',
    color: '#e2e8f0',
    fontSize: '0.9rem',
    fontWeight: '500',
    letterSpacing: '0.5px'
  },

  // Mobile Navigation Row Styles
  mobileNavigationRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '15px',
    margin: '0 1rem',
    flexWrap: 'wrap'
  },
  mobileNavigationDropdown: {
    position: 'relative',
    zIndex: 10
  },
  modernDropdownButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.7rem 1.2rem',
    background: 'white',
    border: '2px solid white',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    color: '#1A3E6F',
    fontSize: '0.9rem',
    fontWeight: '600',
    minWidth: '120px',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(255,255,255,0.3)'
  },
  modernDropdownText: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#1A3E6F'
  },
  downloadDropdownButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.7rem 1.2rem',
    background: 'white',
    border: '2px solid white',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    color: '#1A3E6F',
    fontSize: '0.9rem',
    fontWeight: '600',
    minWidth: '140px',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(255,255,255,0.3)'
  },
  downloadDropdownMenu: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 15px 30px rgba(26, 54, 93, 0.2)',
    border: '2px solid #059669',
    padding: '1.5rem',
    minWidth: '320px',
    maxWidth: '85vw',
    maxHeight: '70vh',
    overflowY: 'auto',
    zIndex: 10000,
    animation: 'dropdownSlideIn 0.4s ease-out',
    backdropFilter: 'blur(15px)',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)'
  },
  downloadOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.875rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'white',
    border: 'none',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    marginBottom: '0.5rem'
  },
  downloadIcon: {
    fontSize: '1.3rem',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    color: 'white',
    borderRadius: '8px',
    flexShrink: 0
  },
  downloadTitle: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.2rem'
  },
  downloadDesc: {
    fontSize: '0.8rem',
    color: '#64748b',
    fontWeight: '400'
  },
  mobileMenuButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.5rem 0.8rem',
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    color: '#1A3E6F',
    fontSize: '0.8rem',
    fontWeight: '400',
    minWidth: '80px',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  mobileHamburgerLines: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    width: '10px'
  },
  mobileHamburgerLine: {
    width: '100%',
    height: '1.5px',
    backgroundColor: '#1A3E6F',
    borderRadius: '1px',
    transition: 'all 0.3s ease'
  },
  mobileMenuText: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#1A3E6F'
  },

  // Professional Dropdown Styles
  professionalDropdownHeader: {
    textAlign: 'center',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #e2e8f0',
    marginBottom: '1.5rem'
  },
  professionalDropdownTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem',
    letterSpacing: '-0.01em'
  },
  professionalDropdownSubtitle: {
    fontSize: '0.95rem',
    color: '#64748b',
    fontWeight: '400',
    lineHeight: '1.4'
  },
  professionalDropdownGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '1.5rem'
  },
  professionalDropdownSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  professionalSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.5rem'
  },
  professionalSectionIcon: {
    width: '32px',
    height: '32px',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#475569',
    flexShrink: 0
  },
  professionalSectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
    letterSpacing: '-0.005em'
  },
  professionalLinksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  professionalDropdownLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.875rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'white',
    border: 'none',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    minHeight: '56px'
  },
  professionalLinkContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    flex: 1
  },
  professionalLinkTitle: {
    fontSize: '0.95rem',
    fontWeight: '400',
    color: '#1e293b',
    lineHeight: '1.3'
  },
  professionalLinkDesc: {
    fontSize: '0.825rem',
    color: '#64748b',
    fontWeight: '400',
    lineHeight: '1.3'
  },
  professionalLinkArrow: {
    fontSize: '1rem',
    color: '#94a3b8',
    fontWeight: '400',
    transition: 'all 0.2s ease',
    transform: 'translateX(0)',
    opacity: 0.7
  },
  professionalDropdownFooter: {
    paddingTop: '1.5rem',
    borderTop: '1px solid #e2e8f0'
  },
  professionalFooterContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  professionalFooterText: {
    textAlign: 'center'
  },
  professionalFooterTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 0.25rem 0'
  },
  professionalFooterDesc: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.4'
  },
  professionalFooterActions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center'
  },
  professionalPrimaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem 1.5rem',
    background: '#1e40af',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    border: 'none',
    minWidth: '120px',
    boxShadow: '0 1px 3px rgba(30, 64, 175, 0.3)'
  },
  professionalSecondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem 1.5rem',
    background: 'transparent',
    color: '#374151',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    border: '1px solid #d1d5db',
    transition: 'all 0.2s ease',
    minWidth: '120px'
  },

  // Loading Component for Suspense
  loadingComponent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100px',
    fontSize: '1.2rem',
    color: '#64748b',
    fontWeight: '500'
  },

  // Request Enrollment Link Section
  requestEnrollmentSection: {
    padding: 'clamp(3rem, 6vw, 4rem) 0',
    backgroundColor: '#f8fafc',
    width: '100%'
  },
  requestEnrollmentCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: 'clamp(2rem, 4vw, 2.5rem)',
    maxWidth: '600px',
    margin: '0 auto',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
    textAlign: 'center'
  },
  requestEnrollmentIcon: {
    fontSize: '2.5rem',
    marginBottom: '1rem'
  },
  requestEnrollmentTitle: {
    fontSize: 'clamp(1.4rem, 3vw, 1.75rem)',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.75rem'
  },
  requestEnrollmentDescription: {
    fontSize: '0.95rem',
    color: '#64748b',
    marginBottom: '1.5rem',
    lineHeight: '1.5'
  },
  requestEnrollmentForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1.5rem'
  },
  requestEnrollmentInput: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '0.95rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    outline: 'none'
  },
  requestEnrollmentButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 20px rgba(30, 64, 175, 0.3)',
    width: '100%',
    maxWidth: '100%'
  },
  requestEnrollmentMessage: {
    fontSize: '0.9rem',
    fontWeight: '600',
    minHeight: '1.25rem',
    lineHeight: '1.4'
  },
  requestEnrollmentHelp: {
    backgroundColor: '#f8fafc',
    padding: '1rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  requestEnrollmentHelpText: {
    fontSize: '0.85rem',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.4'
  },
  requestEnrollmentHelpLink: {
    color: '#1e40af',
    textDecoration: 'none',
    fontWeight: '600'
  },

  // Account Card styles
  accountCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    border: '2px solid #e2e8f0',
    transition:'all 0.3s ease',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
  },
  accountIconContainer: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    color: 'white',
    fontSize: '1.8rem',
    boxShadow: '0 6px 20px rgba(14, 165, 233, 0.3)'
  },
  accountIcon: {
    position: 'relative',
    top: '2px'
  },
  accountTitle: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  accountRate: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#059669',
    marginBottom: '1rem'
  },
  accountDesc: {
    fontSize: '0.9rem',
    color: '#64748b',
    lineHeight: '1.5',
    flexGrow: 1,
    marginBottom: '1rem'
  },
  accountCardButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.8rem 1.5rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    marginTop: 'auto',
    boxShadow: '0 6px 20px rgba(30, 64, 175, 0.3)'
  },

  // Account Types Discovery Section
  accountTypesDiscovery: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#f8fafc',
    width: '100%'
  },
  accountTypesPreview: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
    gap: '2rem',
    marginTop: '3rem',
    marginBottom: '3rem'
  },
  previewCard: {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: '2.5rem',
    border: '2px solid #e2e8f0',
    transition: 'all 0.4s ease',
    cursor: 'pointer',
    textAlign: 'center',
    boxShadow: '0 8px 25px rgba(0,0,0,0.05)',
    position: 'relative',
    overflow: 'hidden'
  },
  previewIconContainer: {
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: 'white',
    fontSize: '2rem',
    boxShadow: '0 8px 20px rgba(5, 150, 105, 0.3)'
  },
  previewIcon: {
    position: 'relative',
    top: '3px'
  },
  previewTitle: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.75rem'
  },
  previewDesc: {
    fontSize: '1rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  previewAccent: {
    position: 'absolute',
    bottom: '-2px',
    left: '-2px',
    right: '-2px',
    height: '10px',
    borderBottomLeftRadius: '18px',
    borderBottomRightRadius: '18px'
  },
  accountTypesAction: {
    textAlign: 'center'
  },
  exploreButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap:'0.8rem',
    padding: '1.1rem 2.2rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #0ea5e9 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(30, 64, 175, 0.3)',
    border: 'none',
    cursor: 'pointer'
  },
  actionNote: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginTop: '1rem',
    lineHeight: '1.5'
  },

  // Modern Banking Facility Section
  facilitySection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#ffffff',
    width: '100%',
    position: 'relative'
  },
  facilityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))',
    gap: '3rem',
    alignItems: 'center',
    marginTop: '3rem'
  },
  facilityImageContainer: {
    position: 'relative',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 15px 40px rgba(30, 64, 175, 0.2)'
  },
  facilityImage: {
    width: '100%',
    height: '400px',
    objectFit: 'cover',
    transition: 'transform 0.3s ease'
  },
  facilityOverlay: {
    position: 'absolute',
    top: '20px',
    right: '20px'
  },
  facilityBadge: {
    background: 'rgba(255,255,255,0.95)',
    color: '#1e40af',
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '700',
    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backdropFilter: 'blur(10px)'
  },
  facilityBadgeIcon: {
    fontSize: '1rem'
  },
  facilityContent: {
    padding: '1rem'
  },
  facilityTitle: {
    fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: '1.5rem',
    letterSpacing: '-0.01em'
  },
  facilityDescription: {
    fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
    color: '#64748b',
    marginBottom: '2rem',
    lineHeight: '1.7',
    fontWeight: '400'
  },
  facilityFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2.5rem'
  },
  facilityFeature: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  facilityFeatureIcon: {
    fontSize: '1.5rem',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
    color: 'white',
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
  },
  facilityFeatureTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  facilityFeatureDesc: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  facilityActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  facilityButtonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(5, 150, 105, 0.4)'
  },
  facilityButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: '#059669',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    border: '2px solid #059669',
    transition: 'all 0.3s ease'
  },

  // Mobile Banking Excellence Section
  mobileBankingSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#f8fafc',
    width: '100%'
  },
  mobileBankingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
    gap: '3rem',
    alignItems: 'center',
    marginTop: '3rem'
  },
  mobileBankingImageContainer: {
    position: 'relative',
    borderRadius: '20px',
    overflow: 'hidden',
    padding: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 15px 40px rgba(0, 0, 0, 0.1)'
  },
  mobileBankingImage: {
    width: '90%',
    height: 'auto',
    maxHeight: '400px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))'
  },
  mobileBankingBadge: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(255,255,255,0.95)',
    color: '#1e40af',
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '700',
    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backdropFilter: 'blur(10px)'
  },
  mobileBankingContent: {
    padding: '1rem'
  },
  mobileBankingTitle: {
    fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: '1.5rem',
    letterSpacing: '-0.01em'
  },
  mobileBankingDescription: {
    fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
    color: '#64748b',
    marginBottom: '2rem',
    lineHeight: '1.7',
    fontWeight: '400'
  },
  mobileBankingFeatures: {display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2.5rem'
  },
  mobileBankingFeature: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  mobileBankingFeatureIcon: {
    fontSize: '1.5rem',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)'
  },
  mobileBankingFeatureTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  mobileBankingFeatureDesc: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  mobileBankingActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  mobileBankingButtonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(30, 64, 175, 0.4)'
  },
  mobileBankingButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: '#1e40af',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    border: '2px solid #1e40af',
    transition: 'all 0.3s ease'
  },

  // ATM Services Section Styles
  atmSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#ffffff',
    width: '100%'
  },
  atmGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
    gap: '3rem',
    alignItems: 'center',
    marginTop: '3rem'
  },
  atmImageContainer: {
    position: 'relative',
    borderRadius: '20px',
    overflow: 'hidden',
    padding: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 15px 40px rgba(0, 0, 0, 0.1)'
  },
  atmImage: {
    width: '90%',
    height: 'auto',
    maxHeight: '350px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))'
  },
  atmBadge: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(255,255,255,0.95)',
    color: '#1e40af',
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '700',
    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backdropFilter: 'blur(10px)'
  },
  atmContent: {
    padding: '1rem'
  },
  atmTitle: {
    fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: '1.5rem',
    letterSpacing: '-0.01em'
  },
  atmDescription: {
    fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
    color: '#64748b',
    marginBottom: '2rem',
    lineHeight: '1.7',
    fontWeight: '400'
  },
  atmFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2.5rem'
  },
  atmFeature: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  atmFeatureIcon: {
    fontSize: '1.5rem',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
    color: 'white',
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
  },
  atmFeatureTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  atmFeatureDesc: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  atmActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  atmButtonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(5, 150, 105, 0.4)'
  },
  atmButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: '#059669',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    border: '2px solid #059669',
    transition: 'all 0.3s ease'
  },

  // Loan Approval Banner Section
  loanBannerSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#ffffff',
    width: '100%'
  },
  loanBannerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
    gap: '3rem',
    alignItems: 'center',
    marginTop: '3rem'
  },
  loanBannerContent: {
    padding: '1rem'
  },
  loanBannerTitle: {
    fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: '1.5rem',
    letterSpacing: '-0.01em'
  },
  loanBannerDescription: {
    fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
    color: '#64748b',
    marginBottom: '2rem',
    lineHeight: '1.7',
    fontWeight: '400'
  },
  loanBannerFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2.5rem'
  },
  loanBannerFeature: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  loanBannerFeatureIcon: {
    fontSize: '1.5rem',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
    color: 'white',
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
  },
  loanBannerFeatureTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  loanBannerFeatureDesc: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  loanBannerActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  loanBannerButtonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(5, 150, 105, 0.4)'
  },
  loanBannerButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: '#059669',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    border: '2px solid #059669',
    transition: 'all 0.3s ease'
  },
  loanBannerImageContainer: {
    position: 'relative',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 15px 40px rgba(30, 64, 175, 0.2)'
  },
  loanBannerImage: {
    width: '100%',
    height: '400px',
    objectFit: 'cover',
    transition: 'transform 0.3s ease'
  },
  loanBannerBadge: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(255,255,255,0.95)',
    color: '#059669',
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '700',
    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backdropFilter: 'blur(10px)'
  },

  // CTA Button Styles
  ctaButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1.15rem 2.3rem',
    backgroundColor: '#1e40af',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '1.27rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px20px rgba(30, 64, 175, 0.3)'
  },
  ctaButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1.15rem 2.3rem',
    backgroundColor: 'transparent',
    color: '#1e40af',    textDecoration: 'none',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '1.27rem',
    border: '2px solid #1e40af',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  },
  ctaIcon: {
    fontSize: '1.2rem'
  },

  // Pulse Glow animation style for CTA
  pulseGlow: {
    animation: 'pulseGlow 2s infinite ease-in-out'
  },

  // Testimonials Section Styles
  testimonialsSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#ffffff',
    width: '100%'
  },

  // Loan Approval Section Styles
  loanApprovalSection: {
    padding: 'clamp(4rem, 8vw, 6rem) 0',
    backgroundColor: '#f8fafc',
    width: '100%'
  },
};

// Add CSS animations to the document
if (typeof document !== 'undefined') {
  const existingOaklineStyles = document.querySelector('#oakline-home-styles');
  if (!existingOaklineStyles) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'oakline-home-styles';
    styleSheet.textContent = `
    /* Dropdown positioning fix */
    .dropdown-container {
      position: relative;
      z-index: 9999;
    }

    .dropdown-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 9998;
    }

    .dropdown-menu {
      position: fixed;
      top: 80px;
      right: 1rem;
      z-index: 9999;
      animation: dropdownSlideIn 0.3s ease-out;
    }

    @keyframes dropdownSlideIn {
      0% {
        opacity: 0;
        transform: translateY(-10px) scale(0.95);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Image fallback styles */
    .image-fallback {
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
    :root {
      /* Professional Banking Color Palette */
      --navy-blue: #1e40af;
      --navy-blue-light: #3b82f6;
      --navy-blue-dark: #1e3a8a;
      --banking-blue: #0ea5e9;
      --banking-blue-light: #38bdf8;
      --banking-blue-dark: #0284c7;
      --banking-gold: #d97706;
      --banking-gold-light: #f59e0b;
      --banking-gold-dark: #92400e;
      --pure-white: #ffffff;
      --off-white: #f8fafc;
      --neutral-gray: #64748b;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes progressSlide {
      0% { transform: translateX(-100%); }
      50% { transform: translateX(0%); }
      100% { transform: translateX(100%); }
    }

    @keyframes heroImageFloat {
      0%, 100% { transform: scale(1.05) translateY(0px); }
      50% { transform: scale(1.08) translateY(-10px); }
    }

    @keyframes heroContentSlideUp {
      0% { transform: translate(-50%, -30%) scale(0.9); opacity: 0; }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }

    @keyframes heroIconBounce {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-10px) rotate(5deg); }
    }

    @keyframes routingCardGlow {
      0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.3); }
      50% { box-shadow: 0 0 30px rgba(255,255,255,0.5); }
    }

    @keyframes buttonPulse {
      0%, 100% { transform: translateY(0px) scale(1); }
      50% { transform: translateY(-2px) scale(1.02); }
    }

    @keyframes staggeredFadeIn {
      0% { opacity: 0; transform: translateY(30px); }
      100% { opacity: 1; transform: translateY(0); }
    }

    @keyframes underlineExpand {
      0% { width: 0; }
      100% { width: 80px; }
    }

    @keyframes slideInFromLeft {
      0% { transform: translateX(-100px); opacity: 0; }
      60% { transform: translateX(5px); opacity: 0.8; }
      100% { transform: translateX(0); opacity: 1; }
    }

    @keyframes slideInFromRight {
      0% { transform: translateX(100px); opacity: 0; }
      60% { transform: translateX(-5px); opacity: 0.8; }
      100% { transform: translateX(0); opacity: 1; }
    }

    @keyframes slideInFromBottom {
      0% { transform: translateY(50px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }

    @keyframes bounceInLeft {
      0% { transform: translateX(-20px); opacity: 0; }
      60% { transform: translateX(5px); opacity: 0.8; }
      100% { transform: translateX(0); opacity: 1; }
    }
    @keyframes flipInY {
      0% { transform: scale(0.8) rotateY(90deg); opacity: 0; }
      50% { transform: scale(0.9) rotateY(0deg); opacity: 0.5; }
      100% { transform: scale(1) rotateY(0deg); opacity: 1; }
    }

    @keyframes fadeInUp {
      0% { transform: translateY(30px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }

    @keyframes zoomIn {
      0% { transform: scale(0.8); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    @keyframes pulseGlow {
      0%, 100% { transform: scale(1); filter: brightness(1); }
      50% { transform: scale(1.02); filter: brightness(1.1); }
    }

    /* Scrolling Welcome Animation */
    @keyframes scrollWelcome {
      0% { transform: translateX(100%); }
      100% { transform: translateX(-100%); }
    }

    /* Hover Effects */
    .featureDropdownItem:hover {
      background-color: #f8fafc !important;
      color: #1e40af !important;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);
    }

    /* Professional Dropdown Hover Effects */
    .professionalDropdownLink:hover {
      background-color: #f8fafc !important;
      border-color: #e2e8f0 !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
    }

    .professionalDropdownLink:hover .professionalLinkArrow {
      transform: translateX(4px) !important;
      opacity: 1 !important;
      color: #1e40af !important;
    }

    /* Banking+ Button Hover Effect */
    button[style*="bankingPlusButton"]:hover,
    .bankingPlusButton:hover {
      background-color: rgba(255, 200, 87, 0.25) !important;
      border-color: rgba(255, 200, 87, 0.6) !important;
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 12px rgba(255, 200, 87, 0.3) !important;
    }

    /* Banking+ Dropdown Hover Effects - Match Dashboard Style */
    a[style*="bankingFeatureItem"]:hover,
    .bankingFeatureItem:hover {
      background-color: #f8fafc !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
    }

    a[style*="bankingFeatureItem"]:hover .bankingFeatureArrow,
    .bankingFeatureItem:hover .bankingFeatureArrow {
      transform: translateX(4px) !important;
      opacity: 1 !important;
      color: #1e40af !important;
    }

    /* Logo Hover Effect */
    a[href="/"] img:hover {
      transform: scale(1.05) !important;
    }

    .professionalPrimaryButton:hover {
      background-color: #1d4ed8 !important;
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 12px rgba(30, 64, 175, 0.4) !important;
    }

    .professionalSecondaryButton:hover {
      background-color: #f9fafb !important;
      border-color: #9ca3af !important;
      color: #1f2937 !important;
    }

    /* Download dropdown hover effects */
    a[style*="downloadOption"]:hover {
      background-color: #f8fafc !important;
      transform: translateY(-2px) !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
    }

    /* Professional cards hover effects */
    .professionalCardsButtonPrimary:hover {
      transform: translateY(-3px) !important;
      box-shadow: 0 15px 35px rgba(30, 64, 175, 0.6) !important;
    }

    .professionalCardsButtonSecondary:hover {
      background-color: rgba(30, 64, 175, 0.1) !important;
      transform: translateY(-3px) !important;
    }

    /* Mobile dropdown positioning */
    @media (max-width: 768px) {
      .dropdownMenu {
        position: fixed !important;
        top: 140px !important;
        left: 1rem !important;
        right: 1rem !important;
        min-width: auto !important;
        max-width: none !important;
        max-height: 70vh !important;
        overflow-y: auto !important;
      }

      .dropdownGrid {
        grid-template-columns: 1fr !important;
        gap: 1rem !important;
      }

      .top-header-responsive {
        justify-content: flex-start !important;
        flex-wrap: wrap !important;
        gap: 0 !important;
        padding: 0.5rem 0 !important;
        position: relative !important;
        align-items: flex-start !important;
      }

      .top-header-responsive a[href="/"] {
        flex: 0 0 auto !important;
        max-width: 45% !important;
        justify-content: flex-start !important;
        order: 1 !important;
        margin-left: 0 !important;
        padding-left: 0 !important;
      }

      .top-header-responsive a[href="/"] img {
        height: 70px !important;
        width: auto !important;
      }

      .top-header-responsive a[href="/"] > div > div:first-child {
        font-size: 1.5rem !important;
        font-weight: 700 !important;
      }

      .top-header-responsive a[href="/"] > div > div:last-child {
        font-size: 0.7rem !important;
        font-weight: 500 !important;
      }

      .scrolling-welcome-inline {
        display: block !important;
        flex: 0 0 100% !important;
        margin: 0.5rem 0 0 0 !important;
        padding: 0.6rem 1rem !important;
        min-width: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
        order: 4 !important;
        overflow: hidden !important;
      }

      .scrolling-welcome-inline > div {
        font-size: 0.9rem !important;
        font-weight: 500 !important;
        animation: scrollWelcome 35s linear infinite !important;
      }

      .banking-plus-right-section {
        flex: 0 0 auto !important;
        gap: 0.2rem !important;
        justify-content: flex-end !important;
        order: 3 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-end !important;
        position: absolute !important;
        right: 0 !important;
        top: 0.3rem !important;
        flex-wrap: nowrap !important;
      }

      .banking-plus-container {
        flex: 0 0 auto !important;
        display: none !important;
        justify-content: center !important;
        order: 2 !important;
      }

      .language-selector-inline {
        transform: scale(0.7) !important;
        flex: 0 0 auto !important;
        position: relative !important;
        right: auto !important;
        top: auto !important;
        order: 1 !important;
        margin-right: 0 !important;
        margin-bottom: 0.1rem !important;
      }

      .sign-out-button {
        order: 2 !important;
        margin-top: 0 !important;
        font-size: 0.55rem !important;
        padding: 0.15rem 0.35rem !important;
        transform: scale(0.9) !important;
      }

      .mobile-banking-plus-inline {
        display: flex !important;
        position: absolute !important;
        left: 45% !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        margin-left: 0 !important;
        order: 2 !important;
      }

      .mobile-banking-plus-inline button {
        padding: 0.3rem 0.5rem !important;
        font-size: 0.65rem !important;
        min-width: auto !important;
        gap: 0.2rem !important;
      }

      .mobile-banking-plus-inline button span {
        font-size: 0.6rem !important;
      }

      .mobile-banking-plus-inline button > div {
        width: 10px !important;
        height: 8px !important;
      }

      .mobile-banking-plus-inline button > div > div {
        height: 1.5px !important;
      }

      .banking-dropdown {
        width: min(360px, 92vw) !important;
        right: 1rem !important;
        left: auto !important;
      }
    }

    @media (max-width: 480px) {
      .top-header-responsive a[href="/"] img {
        height: 76.8px !important;
      }

      .top-header-responsive a[href="/"] > div > div:first-child {
        font-size: 1.6rem !important;
      }

      .top-header-responsive a[href="/"] > div > div:last-child {
        font-size: 0.704rem !important;
      }

      .banking-plus-right-section {
        gap: 0.35rem !important;
      }

      button[style*="bankingPlusButton"] {
        padding: 0.4rem 0.6rem !important;
        font-size: 0.75rem !important;
        gap: 0.3rem !important;
        min-width: auto !important;
      }

      .banking-plus-container {
        max-width: 110px !important;
      }
    }

    .accountCard:hover {
      transform: translateY(-8px) scale(1.02);
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
    }

    .previewCard:hover {
      transform: translateY(-10px);
      box-shadow: 0 25px 50px rgba(0,0,0,0.15);
    }

    .heroButton:hover {
      transform: translateY(-3px);
      box-shadow: 0 15px 35px rgba(4, 120, 87, 0.6);
    }

    /* Request Enrollment Button Hover */
    button[style*="requestEnrollmentButton"]:hover,
    .requestEnrollmentButton:hover {
      transform: translateY(-3px) !important;
      box-shadow: 0 15px 35px rgba(30, 64, 175, 0.6) !important;
    }

    /* Request Enrollment Input Focus */
    input[style*="requestEnrollmentInput"]:focus,
    .requestEnrollmentInput:focus {
      border-color: #1e40af !important;
      box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1) !important;
    }

    .secondaryButton:hover {
      background-color: rgba(255,255,255,0.2);
      transform: translateY(-3px);
    }

    .featureImage:hover {
      transform: scale(1.05);
    }

    .exploreButton:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 40px rgba(4, 120, 87, 0.6);
    }

    .topBarLink:hover {
      color: #ffffff; /* Lighten color on hover */
    }

    .announcementLink:hover {
      background-color: rgba(5, 150, 105, 0.2);
    }

    /* New section hover effects */
    .facilityImage:hover {
      transform: scale(1.05);
    }

    .executiveImage:hover {
      transform: scale(1.02);
    }

    .facilityButtonPrimary:hover, .executiveButtonPrimary:hover {
      transform: translateY(-3px);
      box-shadow: 0 15px 35px rgba(5, 150, 105, 0.6);
    }

    .facilityButtonSecondary:hover, .executiveButtonSecondary:hover {
      background-color: rgba(5, 150, 105, 0.1);
      transform: translateY(-3px);
    }
  `;
    document.head.appendChild(styleSheet);
  }

  // Add hover effects for Banking+ dropdown
  const bankingDropdownStyles = document.createElement('style');
  bankingDropdownStyles.id = 'banking-dropdown-styles';
  bankingDropdownStyles.textContent = `
    a[style*="bankingFeatureItem"]:hover,
    div[style*="bankingFeatureItem"]:hover {
      background-color: #f3f4f6 !important;
      transform: translateX(3px);
    }

    a[style*="bankingFeatureItem"]:hover .bankingFeatureArrow,
    .bankingFeatureItem:hover .bankingFeatureArrow {
      transform: translateX(3px) !important;
      opacity: 1 !important;
    }
  `;
  if (!document.querySelector('#banking-dropdown-styles')) {
    document.head.appendChild(bankingDropdownStyles);
  }
}
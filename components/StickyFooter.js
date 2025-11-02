
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';

export default function StickyFooter() {
  const { user, loading } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [showFeatures, setShowFeatures] = useState(false);
  const router = useRouter();

  // Hide footer on certain pages
  useEffect(() => {
    const handleRouteChange = () => {
      const currentPath = router.pathname;
      const hiddenPaths = ['/signup', '/reset-password', '/verify-email', '/enroll'];
      setIsVisible(!hiddenPaths.some(path => currentPath.startsWith(path)));
    };

    handleRouteChange();
    
    const handleRouteChangeComplete = () => handleRouteChange();
    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [router]);

  const handleSignOut = async () => {
    try {
      const { supabase } = await import('../lib/supabaseClient');
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleFeatureClick = () => {
    setShowFeatures(!showFeatures);
  };

  if (!isVisible || loading) return null;

  // Define navigation links based on user authentication status
  const navigation = user ? [
    { name: 'Home', href: '/', icon: '🏠', gradient: 'from-blue-500 to-blue-600' },
    { name: 'Dashboard', href: '/dashboard', icon: '📊', gradient: 'from-green-500 to-green-600' },
    { name: 'Transfer', href: '/transfer', icon: '💸', gradient: 'from-purple-500 to-purple-600' },
    { name: 'Menu', href: '/main-menu', icon: '☰', gradient: 'from-gray-500 to-gray-600' }
  ] : [
    { name: 'Home', href: '/', icon: '🏠', gradient: 'from-blue-500 to-blue-600' },
    { name: 'Open Account', href: '/apply', icon: '📝', gradient: 'from-green-500 to-green-600' },
    { name: 'Sign In', href: '/sign-in', icon: '🔑', gradient: 'from-indigo-500 to-indigo-600' },
    { name: 'About', href: '/about', icon: 'ℹ️', gradient: 'from-teal-500 to-teal-600' }
  ];

  // Premium income-generating features for dropdown - organized by category
  const premiumFeatures = [
    // Investment & Wealth
    { name: 'Investment Portfolio', href: '/investments', icon: '📈', desc: 'High-yield investments', color: '#10B981', category: 'Investment & Wealth' },
    { name: 'Wealth Management', href: '/investments', icon: '💎', desc: 'Private banking', color: '#8B5CF6', category: 'Investment & Wealth' },
    { name: 'Crypto Trading', href: '/crypto', icon: '₿', desc: 'Digital asset trading', color: '#F59E0B', category: 'Investment & Wealth' },
    { name: 'Financial Advisory', href: '/financial-advisory', icon: '🎯', desc: 'Expert consultation', color: '#06B6D4', category: 'Investment & Wealth' },
    
    // Lending & Credit
    { name: 'Premium Loans', href: '/loans', icon: '🏠', desc: 'Competitive rates', color: '#3B82F6', category: 'Lending & Credit' },
    { name: 'Mortgage Services', href: '/loans', icon: '🏡', desc: 'Home financing', color: '#059669', category: 'Lending & Credit' },
    { name: 'Auto Loans', href: '/loans', icon: '🚗', desc: 'Vehicle financing', color: '#DC2626', category: 'Lending & Credit' },
    { name: 'Credit Cards', href: '/cards', icon: '💳', desc: 'Premium rewards', color: '#7C3AED', category: 'Lending & Credit' },
    
    // Business Solutions
    { name: 'Business Banking', href: '/account-types', icon: '🏢', desc: 'Commercial services', color: '#EF4444', category: 'Business Solutions' },
    { name: 'Merchant Services', href: '/bill-pay', icon: '💼', desc: 'Payment processing', color: '#0EA5E9', category: 'Business Solutions' },
    { name: 'Business Loans', href: '/loans', icon: '📊', desc: 'Growth financing', color: '#F97316', category: 'Business Solutions' },
    { name: 'Payroll Services', href: '/account-types', icon: '💰', desc: 'Employee payments', color: '#14B8A6', category: 'Business Solutions' },
    
    // Global Banking
    { name: 'International Banking', href: '/internationalization', icon: '🌍', desc: 'Global services', color: '#84CC16', category: 'Global Banking' },
    { name: 'Currency Exchange', href: '/internationalization', icon: '💱', desc: 'Forex trading', color: '#06B6D4', category: 'Global Banking' },
    { name: 'Wire Transfers', href: '/transfer', icon: '🌐', desc: 'Global transfers', color: '#8B5CF6', category: 'Global Banking' },
    
    // Premium Services
    { name: 'Trust Services', href: '/about', icon: '🛡️', desc: 'Estate planning', color: '#F97316', category: 'Premium Services' },
    { name: 'Concierge Banking', href: '/support', icon: '👔', desc: '24/7 VIP support', color: '#6366F1', category: 'Premium Services' },
    { name: 'Insurance Products', href: '/about', icon: '🏥', desc: 'Protection plans', color: '#EC4899', category: 'Premium Services' },
    
    // Digital Banking
    { name: 'Mobile Deposit', href: '/deposit-real', icon: '📱', desc: 'Check deposits', color: '#10B981', category: 'Digital Banking' },
    { name: 'Bill Pay', href: '/bill-pay', icon: '🧾', desc: 'Auto payments', color: '#F59E0B', category: 'Digital Banking' },
    { name: 'Zelle Transfers', href: '/zelle', icon: '⚡', desc: 'Instant transfers', color: '#8B5CF6', category: 'Digital Banking' },
    { name: 'Account Alerts', href: '/notifications', icon: '🔔', desc: 'Real-time updates', color: '#EF4444', category: 'Digital Banking' },
    
    // Specialized Accounts
    { name: 'All Account Types', href: '/account-types', icon: '🏦', desc: '23+ account options', color: '#1E40AF', category: 'Specialized Accounts' },
    { name: 'Retirement Planning', href: '/retirement-planning', icon: '🏖️', desc: 'IRA & 401(k)', color: '#059669', category: 'Specialized Accounts' },
    { name: 'Student Accounts', href: '/account-types', icon: '🎓', desc: 'Education banking', color: '#0EA5E9', category: 'Specialized Accounts' },
    { name: 'Senior Banking', href: '/account-types', icon: '👴', desc: 'Age 55+ benefits', color: '#DC2626', category: 'Specialized Accounts' }
  ];

  return (
    <div style={styles.stickyFooter} className="sticky-footer">
      <div style={styles.footerContainer}>
        <div style={styles.footerContent}>
          {/* Navigation Buttons */}
          <div style={styles.navigationSection}>
            {navigation.slice(0, 2).map((navItem) => (
              <Link
                key={navItem.name}
                href={navItem.href}
                style={{
                  ...styles.navButton,
                  background: getGradientColors(navItem.gradient),
                  textDecoration: 'none'
                }}
              >
                <span style={styles.navIcon}>{navItem.icon}</span>
                <span style={styles.navText}>{navItem.name}</span>
              </Link>
            ))}
            
            {/* Features Dropdown Button - Centered */}
            <div style={styles.featuresContainer}>
              <button
                onClick={handleFeatureClick}
                style={styles.featuresButton}
              >
                <span style={styles.navIcon}>💰</span>
                <span style={styles.navText}>Banking+</span>
              </button>
              
              {showFeatures && (
                <>
                  <div style={styles.backdrop} onClick={() => setShowFeatures(false)}></div>
                  <div style={styles.featuresDropdown}>
                    <div style={styles.dropdownHeader}>
                      <h4 style={styles.dropdownTitle}>Banking+ Premium Services</h4>
                      <p style={styles.dropdownSubtitle}>Complete suite of professional banking solutions</p>
                      <div style={styles.statsRow}>
                        <div style={styles.statItem}>
                          <span style={styles.statNumber}>26+</span>
                          <span style={styles.statLabel}>Services</span>
                        </div>
                        <div style={styles.statItem}>
                          <span style={styles.statNumber}>24/7</span>
                          <span style={styles.statLabel}>Support</span>
                        </div>
                        <div style={styles.statItem}>
                          <span style={styles.statNumber}>500K+</span>
                          <span style={styles.statLabel}>Customers</span>
                        </div>
                      </div>
                    </div>
                    
                    <div style={styles.categorizedFeaturesContainer}>
                      {['Investment & Wealth', 'Lending & Credit', 'Business Solutions', 'Global Banking', 'Premium Services', 'Digital Banking', 'Specialized Accounts'].map((category) => {
                        const categoryFeatures = premiumFeatures.filter(f => f.category === category);
                        if (categoryFeatures.length === 0) return null;
                        
                        return (
                          <div key={category} style={styles.featureCategory}>
                            <h5 style={styles.categoryTitle}>{category}</h5>
                            <div style={styles.featuresGrid}>
                              {categoryFeatures.map((feature) => (
                                <button
                                  key={feature.name}
                                  onClick={() => {
                                    setShowFeatures(false);
                                    router.push(feature.href);
                                  }}
                                  style={styles.featureItem}
                                >
                                  <div style={{
                                    ...styles.featureIcon,
                                    backgroundColor: `${feature.color}15`,
                                    border: `1px solid ${feature.color}30`
                                  }}>
                                    {feature.icon}
                                  </div>
                                  <div style={styles.featureContent}>
                                    <div style={styles.featureName}>{feature.name}</div>
                                    <div style={styles.featureDesc}>{feature.desc}</div>
                                  </div>
                                  <div style={{ ...styles.featureArrow, color: feature.color }}>→</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div style={styles.dropdownFooter}>
                      <button 
                        onClick={() => {
                          setShowFeatures(false);
                          router.push("/main-menu");
                        }}
                        style={styles.viewAllButton}
                      >
                        View All Banking Services
                      </button>
                      <button 
                        onClick={() => {
                          setShowFeatures(false);
                          router.push("/support");
                        }}
                        style={styles.contactSupportButton}
                      >
                        Contact Support
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {navigation.slice(2).map((navItem) => (
              <Link
                key={navItem.name}
                href={navItem.href}
                style={{
                  ...styles.navButton,
                  background: getGradientColors(navItem.gradient),
                  textDecoration: 'none'
                }}
              >
                <span style={styles.navIcon}>{navItem.icon}</span>
                <span style={styles.navText}>{navItem.name}</span>
              </Link>
            ))}

            {/* Sign Out Button for Authenticated Users */}
            {user && (
              <button
                onClick={handleSignOut}
                style={{
                  ...styles.navButton,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb'
                }}
              >
                <span style={styles.navIcon}>🔐</span>
                <span style={styles.navText}>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get gradient colors for white theme
function getGradientColors(gradientClass) {
  return '#ffffff';
}

const styles = {
  stickyFooter: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    color: '#1e293b',
    padding: '0.75rem 1rem',
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
    backdropFilter: 'blur(10px)',
    zIndex: 1000,
    borderTop: '2px solid #e5e7eb',
    minHeight: '70px',
    display: 'flex',
    alignItems: 'center'
  },
  footerContainer: {
    width: '100%',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  footerContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  navigationSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
    gap: '0.5rem',
    flexWrap: 'nowrap',
    position: 'relative'
  },
  navButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem 0.5rem',
    color: '#374151',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    backgroundImage: 'none',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
    minHeight: '60px',
    flex: 1,
    maxWidth: '80px',
    minWidth: '60px',
    position: 'relative',
    overflow: 'hidden'
  },
  featuresContainer: {
    position: 'relative',
    flex: 1,
    maxWidth: '80px'
  },
  featuresButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem 0.5rem',
    backgroundColor: '#ffffff',
    backgroundImage: 'none',
    color: '#374151',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
    minHeight: '60px',
    width: '100%',
    position: 'relative',
    overflow: 'hidden'
  },
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 998,
    backdropFilter: 'blur(4px)'
  },
  featuresDropdown: {
    position: 'fixed',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'white',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    border: '1px solid #e2e8f0',
    padding: '1.5rem',
    minWidth: '420px',
    maxWidth: '92vw',
    zIndex: 999,
    maxHeight: '75vh',
    overflowY: 'auto'
  },
  dropdownHeader: {
    textAlign: 'center',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #e2e8f0'
  },
  dropdownTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 0.5rem 0'
  },
  dropdownSubtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0
  },
  featuresGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1.5rem'
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    borderRadius: '12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    textDecoration: 'none',
    color: '#1e293b',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left'
  },
  featureIcon: {
    fontSize: '1.25rem',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '10px',
    flexShrink: 0
  },
  featureContent: {
    flex: 1
  },
  featureName: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.25rem'
  },
  featureDesc: {
    fontSize: '0.75rem',
    color: '#64748b'
  },
  featureArrow: {
    fontSize: '1rem',
    fontWeight: 'bold'
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'space-around',
    gap: '1rem',
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px'
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem'
  },
  statNumber: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1e40af'
  },
  statLabel: {
    fontSize: '0.7rem',
    color: '#64748b',
    fontWeight: '500'
  },
  categorizedFeaturesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '1.5rem'
  },
  featureCategory: {
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '1rem'
  },
  categoryTitle: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  dropdownFooter: {
    display: 'flex',
    gap: '0.75rem',
    paddingTop: '1rem',
    borderTop: '2px solid #e2e8f0'
  },
  viewAllButton: {
    flex: 1,
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'center'
  },
  contactSupportButton: {
    flex: 1,
    padding: '0.75rem 1.5rem',
    background: 'white',
    color: '#1e40af',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    border: '2px solid #1e40af',
    cursor: 'pointer',
    textAlign: 'center'
  },
  navIcon: {
    fontSize: '1.25rem',
    marginBottom: '0.25rem'
  },
  navText: {
    fontSize: '0.7rem',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: '1',
    color: 'inherit'
  }
};

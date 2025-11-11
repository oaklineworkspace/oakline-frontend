
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

export default function AccountTypes() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [accountTypes, setAccountTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAccountTypes();
  }, []);

  const fetchAccountTypes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('account_types')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching account types:', error);
        setError('Failed to load account types. Please try again later.');
        return;
      }

      setAccountTypes(data || []);
    } catch (err) {
      console.error('Error:', err);
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  

  // Extract unique categories from fetched account types
  const categories = ['all', ...new Set(accountTypes.map(account => account.category))];

  const filteredAccounts = accountTypes.filter(account => {
    const matchesCategory = selectedCategory === 'all' || account.category === selectedCategory;
    const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <Head>
        <title>Account Types - Oakline Bank</title>
        <meta name="description" content="Explore all 23 account types offered by Oakline Bank. Find the perfect account for your banking needs." />
      </Head>
      
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link href="/" style={styles.logoContainer}>
              <img src="/images/logo-primary.png.jpg" alt="Oakline Bank" style={styles.logo} />
              <span style={styles.brandName}>Oakline Bank</span>
            </Link>
            <Link href="/" style={styles.backButton}>← Back to Home</Link>
          </div>
        </header>

        {/* Hero Section */}
        <section style={styles.heroSection}>
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>All 23 Account Types</h1>
            <p style={styles.heroSubtitle}>
              Discover the perfect banking solution tailored to your unique needs. 
              From personal checking to wealth management, we have an account for everyone.
            </p>
          </div>
        </section>

        {/* Search and Filter */}
        <section style={styles.filterSection}>
          <div style={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            <span style={styles.searchIcon}>🔍</span>
          </div>
          
          <div style={styles.categoryFilter}>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                style={{
                  ...styles.categoryButton,
                  ...(selectedCategory === category ? styles.activeCategoryButton : {})
                }}
              >
                {category === 'all' ? 'All Accounts' : category}
              </button>
            ))}
          </div>
        </section>

        {/* Account Grid */}
        <section style={styles.accountsSection}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
              <p style={{ fontSize: '1.2rem' }}>Loading account types...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#dc2626' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
              <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>{error}</p>
              <button 
                onClick={fetchAccountTypes}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#1e40af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Try Again
              </button>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
              <p style={{ fontSize: '1.2rem' }}>No account types found matching your criteria.</p>
            </div>
          ) : (
            <div style={styles.accountsGrid}>
              {filteredAccounts.map(account => {
                const minDeposit = parseFloat(account.min_deposit || 0);
                const features = account.features || [];
                const benefits = account.benefits || [];
                
                return (
                  <div key={account.id} style={styles.accountCard}>
                    <div style={styles.accountHeader}>
                      <span style={styles.accountIcon}>{account.icon || '💳'}</span>
                      <div>
                        <h3 style={styles.accountName}>{account.name}</h3>
                        <span style={styles.accountCategory}>{account.category || 'Banking'}</span>
                      </div>
                      <span style={styles.accountRate}>{account.rate || 'N/A'}</span>
                    </div>
                    
                    <p style={styles.accountDescription}>{account.description || 'A premium banking account designed for your needs.'}</p>
                    
                    <div style={styles.accountDetails}>
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Minimum Deposit:</span>
                        <span style={styles.detailValue}>
                          ${minDeposit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Rate:</span>
                        <span style={styles.detailValue}>{account.rate || 'N/A'}</span>
                      </div>
                      {account.monthly_fee !== undefined && (
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Monthly Fee:</span>
                          <span style={styles.detailValue}>
                            ${parseFloat(account.monthly_fee || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      {account.min_balance !== undefined && (
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Min Balance:</span>
                          <span style={styles.detailValue}>
                            ${parseFloat(account.min_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>

                    {features.length > 0 && (
                      <div style={styles.featuresSection}>
                        <h4 style={styles.featuresTitle}>Key Features</h4>
                        <ul style={styles.featuresList}>
                          {features.slice(0, 5).map((feature, idx) => (
                            <li key={idx} style={styles.featureItem}>{feature}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {benefits.length > 0 && (
                      <div style={styles.benefitsSection}>
                        <h4 style={styles.benefitsTitle}>Benefits</h4>
                        <div style={styles.benefitsList}>
                          {benefits.slice(0, 4).map((benefit, idx) => (
                            <span key={idx} style={styles.benefitTag}>{benefit}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {account.eligibility && (
                      <div style={styles.eligibilitySection}>
                        <h4 style={styles.eligibilityTitle}>Eligibility</h4>
                        <p style={styles.eligibilityText}>{account.eligibility}</p>
                      </div>
                    )}

                    <Link href="/apply" style={styles.applyButton}>
                      Apply Now
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Call to Action */}
        <section style={styles.ctaSection}>
          <div style={styles.ctaContent}>
            <h2 style={styles.ctaTitle}>Ready to Open Your Account?</h2>
            <p style={styles.ctaSubtitle}>
              Our banking specialists are here to help you choose the perfect account for your needs.
            </p>
            <div style={styles.ctaButtons}>
              <Link href="/apply" style={styles.primaryButton}>Start Application</Link>
              <Link href="/support" style={styles.secondaryButton}>Speak with a Banker</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    backgroundColor: '#1a365d',
    padding: '1rem 0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    textDecoration: 'none'
  },
  logo: {
    height: '40px',
    width: 'auto'
  },
  brandName: {
    color: 'white',
    fontSize: '1.5rem',
    fontWeight: 'bold'
  },
  backButton: {
    color: 'white',
    textDecoration: 'none',
    padding: '0.5rem 1rem',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '6px',
    transition: 'all 0.2s'
  },
  heroSection: {
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    padding: '4rem 2rem',
    textAlign: 'center',
    color: 'white',
    position: 'relative'
  },
  heroContent: {
    maxWidth: '800px',
    margin: '0 auto'
  },
  heroTitle: {
    fontSize: 'clamp(2rem, 4vw, 3rem)',
    fontWeight: 'bold',
    marginBottom: '1rem'
  },
  heroSubtitle: {
    fontSize: 'clamp(1rem, 2vw, 1.2rem)',
    opacity: 0.9,
    lineHeight: '1.6'
  },
  filterSection: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  searchContainer: {
    position: 'relative',
    maxWidth: '400px',
    margin: '0 auto'
  },
  searchInput: {
    width: '100%',
    padding: '1rem 1rem 1rem 3rem',
    fontSize: '1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    outline: 'none',
    transition: 'all 0.2s'
  },
  searchIcon: {
    position: 'absolute',
    left: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '1.2rem',
    color: '#64748b'
  },
  categoryFilter: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  categoryButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  activeCategoryButton: {
    backgroundColor: '#1e40af',
    color: 'white',
    borderColor: '#1e40af'
  },
  accountsSection: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem 4rem'
  },
  accountsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '2rem'
  },
  accountCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
    border: '2px solid #e2e8f0',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'visible',
    margin: '1rem 0',
    zIndex: 1
  },
  accountHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    marginBottom: '1rem'
  },
  accountIcon: {
    fontSize: '2rem',
    padding: '0.5rem',
    backgroundColor: '#f8fafc',
    borderRadius: '10px'
  },
  accountName: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 0.25rem 0'
  },
  accountCategory: {
    fontSize: '0.85rem',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px'
  },
  accountRate: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#059669',
    marginLeft: 'auto'
  },
  accountDescription: {
    color: '#374151',
    lineHeight: '1.7',
    marginBottom: '1.5rem',
    fontSize: '1rem',
    fontWeight: '400'
  },
  accountDetails: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginBottom: '1.5rem',
    padding: '1.5rem',
    backgroundColor: '#f1f5f9',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  detailLabel: {
    fontSize: '0.85rem',
    color: '#64748b',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: '0.95rem',
    color: '#1e293b',
    fontWeight: '600'
  },
  featuresSection: {
    marginBottom: '1.5rem'
  },
  featuresTitle: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '0.75rem'
  },
  featuresList: {
    margin: 0,
    paddingLeft: '1rem'
  },
  featureItem: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginBottom: '0.5rem'
  },
  benefitsSection: {
    marginBottom: '1.5rem'
  },
  benefitsTitle: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '0.75rem'
  },
  benefitsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  benefitTag: {
    fontSize: '0.8rem',
    color: '#059669',
    backgroundColor: '#dcfce7',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px'
  },
  eligibilitySection: {
    marginBottom: '2rem'
  },
  eligibilityTitle: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  eligibilityText: {
    fontSize: '0.9rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  applyButton: {
    display: 'block',
    width: '100%',
    textAlign: 'center',
    padding: '1.25rem',
    backgroundColor: '#1A3E6F',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '1.1rem',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(26, 62, 111, 0.3)',
    border: 'none',
    cursor: 'pointer'
  },
  ctaSection: {
    backgroundColor: '#1a365d',
    padding: '4rem 2rem',
    textAlign: 'center',
    color: 'white'
  },
  ctaContent: {
    maxWidth: '800px',
    margin: '0 auto'
  },
  ctaTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '1rem'
  },
  ctaSubtitle: {
    fontSize: '1.1rem',
    opacity: 0.9,
    marginBottom: '2rem'
  },
  ctaButtons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  primaryButton: {
    padding: '1rem 2rem',
    backgroundColor: '#059669',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  secondaryButton: {
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: 'white',
    textDecoration: 'none',
    border: '2px solid white',
    borderRadius: '8px',
    fontWeight: '600',
    transition: 'all 0.2s'
  }
};

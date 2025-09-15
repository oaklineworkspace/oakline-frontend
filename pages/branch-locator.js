
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';

export default function BranchLocator() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('all');
  const [branches, setBranches] = useState([]);
  const [filteredBranches, setFilteredBranches] = useState([]);

  const branchData = [
    {
      id: 1,
      name: 'Oakline Bank - Downtown Manhattan',
      address: '250 Broadway, New York, NY 10007',
      phone: '(212) 555-0150',
      hours: {
        monday: '9:00 AM - 6:00 PM',
        tuesday: '9:00 AM - 6:00 PM',
        wednesday: '9:00 AM - 6:00 PM',
        thursday: '9:00 AM - 6:00 PM',
        friday: '9:00 AM - 6:00 PM',
        saturday: '9:00 AM - 4:00 PM',
        sunday: 'Closed'
      },
      services: ['Full Service Branch', 'ATM', 'Safe Deposit Boxes', 'Notary Services', 'Investment Services'],
      manager: 'Sarah Johnson',
      state: 'NY',
      city: 'New York',
      featured: true
    },
    {
      id: 2,
      name: 'Oakline Bank - Beverly Hills',
      address: '9500 Wilshire Blvd, Beverly Hills, CA 90212',
      phone: '(310) 555-0200',
      hours: {
        monday: '9:00 AM - 5:00 PM',
        tuesday: '9:00 AM - 5:00 PM',
        wednesday: '9:00 AM - 5:00 PM',
        thursday: '9:00 AM - 5:00 PM',
        friday: '9:00 AM - 5:00 PM',
        saturday: '10:00 AM - 3:00 PM',
        sunday: 'Closed'
      },
      services: ['Full Service Branch', 'ATM', 'Private Banking', 'Wealth Management', 'Business Services'],
      manager: 'Michael Chen',
      state: 'CA',
      city: 'Beverly Hills',
      featured: true
    },
    {
      id: 3,
      name: 'Oakline Bank - Downtown Chicago',
      address: '135 S LaSalle St, Chicago, IL 60603',
      phone: '(312) 555-0300',
      hours: {
        monday: '8:30 AM - 5:30 PM',
        tuesday: '8:30 AM - 5:30 PM',
        wednesday: '8:30 AM - 5:30 PM',
        thursday: '8:30 AM - 5:30 PM',
        friday: '8:30 AM - 5:30 PM',
        saturday: '9:00 AM - 2:00 PM',
        sunday: 'Closed'
      },
      services: ['Full Service Branch', 'ATM', 'Business Banking', 'Commercial Lending', 'Treasury Services'],
      manager: 'David Rodriguez',
      state: 'IL',
      city: 'Chicago',
      featured: false
    },
    {
      id: 4,
      name: 'Oakline Bank - Miami Beach',
      address: '1701 Collins Ave, Miami Beach, FL 33139',
      phone: '(305) 555-0400',
      hours: {
        monday: '9:00 AM - 5:00 PM',
        tuesday: '9:00 AM - 5:00 PM',
        wednesday: '9:00 AM - 5:00 PM',
        thursday: '9:00 AM - 5:00 PM',
        friday: '9:00 AM - 5:00 PM',
        saturday: '9:00 AM - 3:00 PM',
        sunday: 'Closed'
      },
      services: ['Full Service Branch', 'ATM', 'International Banking', 'Safe Deposit Boxes', 'Mortgage Services'],
      manager: 'Maria Gonzalez',
      state: 'FL',
      city: 'Miami Beach',
      featured: false
    },
    {
      id: 5,
      name: 'Oakline Bank - Austin Downtown',
      address: '200 Congress Ave, Austin, TX 78701',
      phone: '(512) 555-0500',
      hours: {
        monday: '9:00 AM - 6:00 PM',
        tuesday: '9:00 AM - 6:00 PM',
        wednesday: '9:00 AM - 6:00 PM',
        thursday: '9:00 AM - 6:00 PM',
        friday: '9:00 AM - 6:00 PM',
        saturday: '9:00 AM - 4:00 PM',
        sunday: '12:00 PM - 4:00 PM'
      },
      services: ['Full Service Branch', 'ATM', 'Business Banking', 'Student Services', 'Financial Advisory'],
      manager: 'Jennifer Wilson',
      state: 'TX',
      city: 'Austin',
      featured: true
    },
    {
      id: 6,
      name: 'Oakline Bank - Seattle Waterfront',
      address: '1400 Western Ave, Seattle, WA 98101',
      phone: '(206) 555-0600',
      hours: {
        monday: '8:30 AM - 5:30 PM',
        tuesday: '8:30 AM - 5:30 PM',
        wednesday: '8:30 AM - 5:30 PM',
        thursday: '8:30 AM - 5:30 PM',
        friday: '8:30 AM - 5:30 PM',
        saturday: '10:00 AM - 3:00 PM',
        sunday: 'Closed'
      },
      services: ['Full Service Branch', 'ATM', 'Tech Business Banking', 'Investment Services', 'Green Banking'],
      manager: 'Robert Kim',
      state: 'WA',
      city: 'Seattle',
      featured: false
    },
    {
      id: 7,
      name: 'Oakline Bank - Boston Financial District',
      address: '100 Federal St, Boston, MA 02110',
      phone: '(617) 555-0700',
      hours: {
        monday: '8:00 AM - 6:00 PM',
        tuesday: '8:00 AM - 6:00 PM',
        wednesday: '8:00 AM - 6:00 PM',
        thursday: '8:00 AM - 6:00 PM',
        friday: '8:00 AM - 6:00 PM',
        saturday: '9:00 AM - 3:00 PM',
        sunday: 'Closed'
      },
      services: ['Full Service Branch', 'ATM', 'Private Banking', 'Estate Planning', 'Trust Services'],
      manager: 'Patricia Thompson',
      state: 'MA',
      city: 'Boston',
      featured: false
    },
    {
      id: 8,
      name: 'Oakline Bank - Denver Tech Center',
      address: '7900 E Union Ave, Denver, CO 80237',
      phone: '(303) 555-0800',
      hours: {
        monday: '9:00 AM - 5:00 PM',
        tuesday: '9:00 AM - 5:00 PM',
        wednesday: '9:00 AM - 5:00 PM',
        thursday: '9:00 AM - 5:00 PM',
        friday: '9:00 AM - 5:00 PM',
        saturday: '9:00 AM - 2:00 PM',
        sunday: 'Closed'
      },
      services: ['Full Service Branch', 'ATM', 'Business Banking', 'SBA Lending', 'Cash Management'],
      manager: 'Thomas Anderson',
      state: 'CO',
      city: 'Denver',
      featured: false
    }
  ];

  const states = [...new Set(branchData.map(branch => branch.state))].sort();

  useEffect(() => {
    setBranches(branchData);
    setFilteredBranches(branchData);
  }, []);

  useEffect(() => {
    let filtered = branches;

    if (selectedState !== 'all') {
      filtered = filtered.filter(branch => branch.state === selectedState);
    }

    if (searchQuery) {
      filtered = filtered.filter(branch =>
        branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredBranches(filtered);
  }, [searchQuery, selectedState, branches]);

  return (
    <>
      <Head>
        <title>Branch Locator - Oakline Bank</title>
        <meta name="description" content="Find Oakline Bank branches and ATMs near you. Get location details, hours, and services available at each branch." />
      </Head>

      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link href="/" style={styles.logoContainer}>
              <img src="/images/logo-primary.png" alt="Oakline Bank" style={styles.logo} />
              <span style={styles.brandName}>Oakline Bank</span>
            </Link>
            <Link href="/" style={styles.backButton}>← Back to Home</Link>
          </div>
        </header>

        {/* Hero Section */}
        <section style={styles.heroSection}>
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>Find a Branch or ATM</h1>
            <p style={styles.heroSubtitle}>
              Locate the nearest Oakline Bank branch or ATM with our convenient branch locator.
            </p>
          </div>
        </section>

        {/* Search Section */}
        <section style={styles.searchSection}>
          <div style={styles.searchContainer}>
            <div style={styles.searchInputContainer}>
              <input
                type="text"
                placeholder="Search by city, address, or branch name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
              <button style={styles.searchButton}>🔍</button>
            </div>
            
            <div style={styles.filterContainer}>
              <label style={styles.filterLabel}>Filter by State:</label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="all">All States</option>
                {states.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Map Placeholder */}
        <section style={styles.mapSection}>
          <div style={styles.mapPlaceholder}>
            <div style={styles.mapContent}>
              <h3 style={styles.mapTitle}>Interactive Branch Map</h3>
              <p style={styles.mapSubtitle}>
                Our interactive map shows all {filteredBranches.length} branch{filteredBranches.length !== 1 ? 'es' : ''} and ATM locations
              </p>
              <div style={styles.mapStats}>
                <div style={styles.mapStat}>
                  <div style={styles.statIcon}>🏦</div>
                  <div style={styles.statNumber}>{filteredBranches.length}</div>
                  <div style={styles.statLabel}>Branches</div>
                </div>
                <div style={styles.mapStat}>
                  <div style={styles.statIcon}>🏧</div>
                  <div style={styles.statNumber}>55,000+</div>
                  <div style={styles.statLabel}>ATMs</div>
                </div>
                <div style={styles.mapStat}>
                  <div style={styles.statIcon}>🌍</div>
                  <div style={styles.statNumber}>{states.length}</div>
                  <div style={styles.statLabel}>States</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Branch Results */}
        <main style={styles.main}>
          <div style={styles.resultsHeader}>
            <h2 style={styles.resultsTitle}>
              {filteredBranches.length} Branch{filteredBranches.length !== 1 ? 'es' : ''} Found
            </h2>
            {selectedState !== 'all' && (
              <div style={styles.activeFilter}>
                Showing results for: <strong>{selectedState}</strong>
                <button onClick={() => setSelectedState('all')} style={styles.clearFilter}>✕</button>
              </div>
            )}
          </div>

          <div style={styles.branchGrid}>
            {filteredBranches.map(branch => (
              <div key={branch.id} style={styles.branchCard}>
                <div style={styles.branchHeader}>
                  <h3 style={styles.branchName}>{branch.name}</h3>
                  {branch.featured && <div style={styles.featuredBadge}>Featured</div>}
                </div>
                
                <div style={styles.branchDetails}>
                  <div style={styles.branchInfo}>
                    <div style={styles.infoItem}>
                      <span style={styles.infoIcon}>📍</span>
                      <span style={styles.infoText}>{branch.address}</span>
                    </div>
                    
                    <div style={styles.infoItem}>
                      <span style={styles.infoIcon}>📞</span>
                      <span style={styles.infoText}>{branch.phone}</span>
                    </div>
                    
                    <div style={styles.infoItem}>
                      <span style={styles.infoIcon}>👤</span>
                      <span style={styles.infoText}>Manager: {branch.manager}</span>
                    </div>
                  </div>

                  <div style={styles.servicesSection}>
                    <h4 style={styles.servicesTitle}>Services Available</h4>
                    <div style={styles.servicesTags}>
                      {branch.services.map((service, index) => (
                        <span key={index} style={styles.serviceTag}>{service}</span>
                      ))}
                    </div>
                  </div>

                  <div style={styles.hoursSection}>
                    <h4 style={styles.hoursTitle}>Hours of Operation</h4>
                    <div style={styles.hoursList}>
                      {Object.entries(branch.hours).map(([day, hours]) => (
                        <div key={day} style={styles.hoursItem}>
                          <span style={styles.dayName}>{day.charAt(0).toUpperCase() + day.slice(1)}:</span>
                          <span style={styles.hoursTime}>{hours}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={styles.branchActions}>
                    <button style={styles.directionsButton}>Get Directions</button>
                    <button style={styles.callButton}>Call Branch</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredBranches.length === 0 && (
            <div style={styles.noResults}>
              <div style={styles.noResultsIcon}>🔍</div>
              <h3 style={styles.noResultsTitle}>No Branches Found</h3>
              <p style={styles.noResultsText}>
                Try adjusting your search criteria or clearing the filters.
              </p>
              <button onClick={() => {setSearchQuery(''); setSelectedState('all');}} style={styles.clearFiltersButton}>
                Clear All Filters
              </button>
            </div>
          )}
        </main>

        {/* ATM Network Info */}
        <section style={styles.atmSection}>
          <div style={styles.atmContainer}>
            <h2 style={styles.atmTitle}>Access Over 55,000 Fee-Free ATMs</h2>
            <p style={styles.atmSubtitle}>
              Use our extensive ATM network across the country without paying fees.
            </p>
            <div style={styles.atmFeatures}>
              <div style={styles.atmFeature}>
                <div style={styles.atmFeatureIcon}>🏧</div>
                <h3 style={styles.atmFeatureTitle}>Fee-Free Access</h3>
                <p style={styles.atmFeatureDesc}>No fees at any Oakline Bank ATM or partner network ATMs</p>
              </div>
              <div style={styles.atmFeature}>
                <div style={styles.atmFeatureIcon}>📱</div>
                <h3 style={styles.atmFeatureTitle}>Mobile ATM Locator</h3>
                <p style={styles.atmFeatureDesc}>Find the nearest ATM using our mobile banking app</p>
              </div>
              <div style={styles.atmFeature}>
                <div style={styles.atmFeatureIcon}>⏰</div>
                <h3 style={styles.atmFeatureTitle}>24/7 Access</h3>
                <p style={styles.atmFeatureDesc}>Access your money anytime, day or night</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section style={styles.contactSection}>
          <div style={styles.contactCard}>
            <h2 style={styles.contactTitle}>Need Help Finding a Location?</h2>
            <p style={styles.contactSubtitle}>
              Our customer service team is here to help you find the perfect banking location.
            </p>
            <div style={styles.contactOptions}>
              <div style={styles.contactOption}>
                <div style={styles.contactIcon}>📞</div>
                <div>
                  <h3 style={styles.contactOptionTitle}>Call Customer Service</h3>
                  <p style={styles.contactOptionDesc}>1-800-OAKLINE</p>
                </div>
              </div>
              <div style={styles.contactOption}>
                <div style={styles.contactIcon}>💬</div>
                <div>
                  <h3 style={styles.contactOptionTitle}>Live Chat Support</h3>
                  <p style={styles.contactOptionDesc}>Available 24/7</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={styles.footer}>
          <div style={styles.footerContent}>
            <p style={styles.footerText}>
              © 2024 Oakline Bank. All rights reserved. Member FDIC. Equal Housing Lender.
            </p>
          </div>
        </footer>
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
    background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
    padding: '4rem 2rem',
    textAlign: 'center',
    color: 'white'
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
  searchSection: {
    padding: '2rem',
    backgroundColor: 'white',
    borderBottom: '1px solid #e2e8f0'
  },
  searchContainer: {
    maxWidth: '800px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  searchInputContainer: {
    display: 'flex',
    gap: '1rem'
  },
  searchInput: {
    flex: 1,
    padding: '1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '1rem'
  },
  searchButton: {
    padding: '1rem 1.5rem',
    backgroundColor: '#1a365d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem'
  },
  filterContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  filterLabel: {
    fontWeight: '600',
    color: '#374151'
  },
  filterSelect: {
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '1rem',
    backgroundColor: 'white'
  },
  mapSection: {
    padding: '3rem 2rem',
    backgroundColor: '#f1f5f9'
  },
  mapPlaceholder: {
    maxWidth: '1200px',
    margin: '0 auto',
    height: '300px',
    backgroundColor: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
    color: 'white'
  },
  mapContent: {
    textAlign: 'center'
  },
  mapTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '1rem'
  },
  mapSubtitle: {
    fontSize: '1.1rem',
    opacity: 0.9,
    marginBottom: '2rem'
  },
  mapStats: {
    display: 'flex',
    gap: '3rem',
    justifyContent: 'center'
  },
  mapStat: {
    textAlign: 'center'
  },
  statIcon: {
    fontSize: '2rem',
    marginBottom: '0.5rem'
  },
  statNumber: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '0.25rem'
  },
  statLabel: {
    fontSize: '0.9rem',
    opacity: 0.8
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem'
  },
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  resultsTitle: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    color: '#1a365d'
  },
  activeFilter: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    borderRadius: '20px',
    fontSize: '0.9rem'
  },
  clearFilter: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#0369a1',
    cursor: 'pointer',
    fontWeight: 'bold',
    padding: '0 0.25rem'
  },
  branchGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '2rem'
  },
  branchCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  branchHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem 1.5rem 1rem',
    borderBottom: '1px solid #e2e8f0'
  },
  branchName: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
    color: '#1a365d',
    margin: 0
  },
  featuredBadge: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '0.25rem 0.75rem',
    borderRadius: '15px',
    fontSize: '0.8rem',
    fontWeight: '600'
  },
  branchDetails: {
    padding: '1.5rem'
  },
  branchInfo: {
    marginBottom: '1.5rem'
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.75rem'
  },
  infoIcon: {
    fontSize: '1.1rem',
    width: '20px'
  },
  infoText: {
    color: '#374151',
    fontSize: '0.95rem'
  },
  servicesSection: {
    marginBottom: '1.5rem'
  },
  servicesTitle: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '0.75rem'
  },
  servicesTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  serviceTag: {
    backgroundColor: '#f1f5f9',
    color: '#1a365d',
    padding: '0.25rem 0.75rem',
    borderRadius: '15px',
    fontSize: '0.8rem',
    fontWeight: '500'
  },
  hoursSection: {
    marginBottom: '1.5rem'
  },
  hoursTitle: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '0.75rem'
  },
  hoursList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.25rem'
  },
  hoursItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem'
  },
  dayName: {
    fontWeight: '600',
    color: '#374151'
  },
  hoursTime: {
    color: '#64748b'
  },
  branchActions: {
    display: 'flex',
    gap: '1rem'
  },
  directionsButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#1a365d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  callButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: 'transparent',
    color: '#1a365d',
    border: '2px solid #1a365d',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  noResults: {
    textAlign: 'center',
    padding: '4rem 2rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  noResultsIcon: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },
  noResultsTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '1rem'
  },
  noResultsText: {
    color: '#64748b',
    marginBottom: '2rem'
  },
  clearFiltersButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#1a365d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  atmSection: {
    padding: '4rem 2rem',
    backgroundColor: '#1a365d',
    color: 'white'
  },
  atmContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    textAlign: 'center'
  },
  atmTitle: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    marginBottom: '1rem'
  },
  atmSubtitle: {
    fontSize: '1.2rem',
    opacity: 0.9,
    marginBottom: '3rem'
  },
  atmFeatures: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem'
  },
  atmFeature: {
    textAlign: 'center'
  },
  atmFeatureIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },
  atmFeatureTitle: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
    marginBottom: '0.75rem'
  },
  atmFeatureDesc: {
    opacity: 0.9,
    lineHeight: '1.5'
  },
  contactSection: {
    padding: '3rem 2rem',
    backgroundColor: '#f8fafc'
  },
  contactCard: {
    maxWidth: '800px',
    margin: '0 auto',
    textAlign: 'center',
    backgroundColor: 'white',
    padding: '3rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  contactTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '1rem'
  },
  contactSubtitle: {
    color: '#64748b',
    marginBottom: '2rem'
  },
  contactOptions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '2rem'
  },
  contactOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  contactIcon: {
    fontSize: '2rem',
    backgroundColor: '#f1f5f9',
    padding: '1rem',
    borderRadius: '50%',
    width: '60px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  contactOptionTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '0.25rem'
  },
  contactOptionDesc: {
    color: '#64748b',
    fontSize: '0.95rem'
  },
  footer: {
    backgroundColor: '#1a365d',
    color: 'white',
    padding: '2rem',
    textAlign: 'center'
  },
  footerContent: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  footerText: {
    color: '#cbd5e0',
    fontSize: '0.9rem'
  }
};

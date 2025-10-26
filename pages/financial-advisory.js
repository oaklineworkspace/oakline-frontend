
import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';

export default function FinancialAdvisory() {
  const { user } = useAuth();
  const [selectedService, setSelectedService] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingData, setBookingData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    preferredDate: '',
    preferredTime: '',
    message: ''
  });

  const advisoryServices = [
    {
      id: 'wealth-management',
      title: 'Wealth Management',
      icon: '💎',
      description: 'Comprehensive wealth planning and portfolio management for high-net-worth individuals',
      features: [
        'Personalized investment strategies',
        'Asset allocation optimization',
        'Tax-efficient investing',
        'Estate planning coordination',
        'Regular portfolio reviews'
      ],
      minAssets: '$500,000',
      fee: '0.75% - 1.25% AUM'
    },
    {
      id: 'retirement-planning',
      title: 'Retirement Planning',
      icon: '🏖️',
      description: 'Strategic planning to ensure a comfortable and secure retirement',
      features: [
        '401(k) and IRA optimization',
        'Social Security planning',
        'Pension analysis',
        'Healthcare cost planning',
        'Income distribution strategies'
      ],
      minAssets: '$100,000',
      fee: 'Flat fee or hourly'
    },
    {
      id: 'investment-management',
      title: 'Investment Management',
      icon: '📈',
      description: 'Professional portfolio management tailored to your goals and risk tolerance',
      features: [
        'Diversified portfolio construction',
        'Active risk management',
        'Performance monitoring',
        'Rebalancing services',
        'Market insights and updates'
      ],
      minAssets: '$250,000',
      fee: '1.00% AUM'
    },
    {
      id: 'tax-planning',
      title: 'Tax Planning',
      icon: '📊',
      description: 'Strategic tax optimization to minimize liabilities and maximize after-tax returns',
      features: [
        'Tax-loss harvesting',
        'Charitable giving strategies',
        'Business tax planning',
        'Income tax optimization',
        'Capital gains management'
      ],
      minAssets: 'No minimum',
      fee: 'Hourly consultation'
    },
    {
      id: 'estate-planning',
      title: 'Estate Planning',
      icon: '🏛️',
      description: 'Comprehensive planning to protect and transfer your wealth efficiently',
      features: [
        'Will and trust creation',
        'Beneficiary planning',
        'Estate tax minimization',
        'Legacy planning',
        'Charitable planning'
      ],
      minAssets: '$1,000,000',
      fee: 'Project-based'
    },
    {
      id: 'business-advisory',
      title: 'Business Advisory',
      icon: '🏢',
      description: 'Financial guidance for business owners and entrepreneurs',
      features: [
        'Business succession planning',
        'Employee benefit programs',
        'Business valuation',
        'Exit strategy planning',
        'Growth financing advice'
      ],
      minAssets: 'No minimum',
      fee: 'Retainer or project-based'
    }
  ];

  const advisors = [
    {
      name: 'Robert Harrison, CFP®',
      title: 'Senior Wealth Advisor',
      specialty: 'Wealth Management & Estate Planning',
      experience: '25+ years',
      certifications: ['CFP®', 'CFA', 'CIMA'],
      image: '👨‍💼',
      bio: 'Robert specializes in comprehensive wealth management for high-net-worth families, with expertise in estate planning and tax optimization.'
    },
    {
      name: 'Jennifer Martinez, CFA',
      title: 'Investment Strategist',
      specialty: 'Portfolio Management & Investment Planning',
      experience: '18+ years',
      certifications: ['CFA', 'CAIA'],
      image: '👩‍💼',
      bio: 'Jennifer focuses on creating customized investment strategies and managing diversified portfolios for individuals and institutions.'
    },
    {
      name: 'David Chen, CFP®',
      title: 'Retirement Planning Specialist',
      specialty: 'Retirement & Tax Planning',
      experience: '15+ years',
      certifications: ['CFP®', 'ChFC'],
      image: '👨‍💼',
      bio: 'David helps clients plan for secure retirements through strategic tax planning and income distribution strategies.'
    },
    {
      name: 'Sarah Williams, CPA',
      title: 'Tax & Estate Advisor',
      specialty: 'Tax Optimization & Estate Planning',
      experience: '20+ years',
      certifications: ['CPA', 'CFP®', 'JD'],
      image: '👩‍💼',
      bio: 'Sarah provides comprehensive tax and estate planning services, helping clients minimize tax liabilities and preserve wealth.'
    }
  ];

  const handleBooking = (e) => {
    e.preventDefault();
    console.log('Booking submitted:', bookingData);
    alert('Thank you for your interest! One of our financial advisors will contact you within 24 hours to schedule your consultation.');
    setShowBookingForm(false);
    setBookingData({
      name: '',
      email: '',
      phone: '',
      service: '',
      preferredDate: '',
      preferredTime: '',
      message: ''
    });
  };

  return (
    <>
      <Head>
        <title>Financial Advisory Services - Oakline Bank</title>
        <meta name="description" content="Expert financial advisory services including wealth management, retirement planning, and investment strategies." />
      </Head>

      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link href="/" style={styles.logoContainer}>
              <img src="/images/logo-primary.png" alt="Oakline Bank" style={styles.logo} />
              <span style={styles.brandName}>Oakline Bank</span>
            </Link>
            <div style={styles.headerActions}>
              <Link href="/" style={styles.backButton}>← Back to Home</Link>
              {user && <Link href="/dashboard" style={styles.dashboardButton}>Dashboard</Link>}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section style={styles.heroSection}>
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>Financial Advisory Services</h1>
            <p style={styles.heroSubtitle}>
              Expert guidance to help you achieve your financial goals and secure your future
            </p>
            <button onClick={() => setShowBookingForm(true)} style={styles.ctaButton}>
              Schedule a Consultation
            </button>
          </div>
        </section>

        {/* Services Section */}
        <main style={styles.main}>
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Our Advisory Services</h2>
            <div style={styles.servicesGrid}>
              {advisoryServices.map((service) => (
                <div key={service.id} style={styles.serviceCard}>
                  <div style={styles.serviceIcon}>{service.icon}</div>
                  <h3 style={styles.serviceTitle}>{service.title}</h3>
                  <p style={styles.serviceDescription}>{service.description}</p>
                  <div style={styles.serviceFeatures}>
                    <h4 style={styles.featuresTitle}>What's Included:</h4>
                    <ul style={styles.featuresList}>
                      {service.features.map((feature, index) => (
                        <li key={index} style={styles.featureItem}>✓ {feature}</li>
                      ))}
                    </ul>
                  </div>
                  <div style={styles.serviceDetails}>
                    <div style={styles.serviceDetail}>
                      <span style={styles.detailLabel}>Minimum Assets:</span>
                      <span style={styles.detailValue}>{service.minAssets}</span>
                    </div>
                    <div style={styles.serviceDetail}>
                      <span style={styles.detailLabel}>Fee Structure:</span>
                      <span style={styles.detailValue}>{service.fee}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedService(service);
                      setBookingData(prev => ({ ...prev, service: service.title }));
                      setShowBookingForm(true);
                    }}
                    style={styles.learnMoreButton}
                  >
                    Book Consultation
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Advisors Section */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Meet Our Advisors</h2>
            <div style={styles.advisorsGrid}>
              {advisors.map((advisor, index) => (
                <div key={index} style={styles.advisorCard}>
                  <div style={styles.advisorImage}>{advisor.image}</div>
                  <h3 style={styles.advisorName}>{advisor.name}</h3>
                  <p style={styles.advisorTitle}>{advisor.title}</p>
                  <div style={styles.advisorInfo}>
                    <div style={styles.infoItem}>
                      <strong>Specialty:</strong> {advisor.specialty}
                    </div>
                    <div style={styles.infoItem}>
                      <strong>Experience:</strong> {advisor.experience}
                    </div>
                    <div style={styles.certifications}>
                      {advisor.certifications.map((cert, idx) => (
                        <span key={idx} style={styles.certBadge}>{cert}</span>
                      ))}
                    </div>
                  </div>
                  <p style={styles.advisorBio}>{advisor.bio}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Why Choose Us */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Why Choose Oakline Financial Advisors?</h2>
            <div style={styles.benefitsGrid}>
              <div style={styles.benefitCard}>
                <div style={styles.benefitIcon}>🎓</div>
                <h3 style={styles.benefitTitle}>Expert Team</h3>
                <p style={styles.benefitDesc}>Certified professionals with decades of combined experience</p>
              </div>
              <div style={styles.benefitCard}>
                <div style={styles.benefitIcon}>🎯</div>
                <h3 style={styles.benefitTitle}>Personalized Approach</h3>
                <p style={styles.benefitDesc}>Customized strategies tailored to your unique goals</p>
              </div>
              <div style={styles.benefitCard}>
                <div style={styles.benefitIcon}>🔒</div>
                <h3 style={styles.benefitTitle}>Fiduciary Standard</h3>
                <p style={styles.benefitDesc}>We always act in your best interest</p>
              </div>
              <div style={styles.benefitCard}>
                <div style={styles.benefitIcon}>📊</div>
                <h3 style={styles.benefitTitle}>Comprehensive Service</h3>
                <p style={styles.benefitDesc}>Full-spectrum financial planning and management</p>
              </div>
            </div>
          </section>
        </main>

        {/* Booking Modal */}
        {showBookingForm && (
          <div style={styles.modal} onClick={() => setShowBookingForm(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Schedule a Consultation</h2>
                <button onClick={() => setShowBookingForm(false)} style={styles.closeButton}>✕</button>
              </div>
              <form onSubmit={handleBooking} style={styles.bookingForm}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Full Name *</label>
                  <input
                    type="text"
                    value={bookingData.name}
                    onChange={(e) => setBookingData({ ...bookingData, name: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email *</label>
                  <input
                    type="email"
                    value={bookingData.email}
                    onChange={(e) => setBookingData({ ...bookingData, email: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone *</label>
                  <input
                    type="tel"
                    value={bookingData.phone}
                    onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Service Interested In *</label>
                  <select
                    value={bookingData.service}
                    onChange={(e) => setBookingData({ ...bookingData, service: e.target.value })}
                    style={styles.select}
                    required
                  >
                    <option value="">Select a service</option>
                    {advisoryServices.map(service => (
                      <option key={service.id} value={service.title}>{service.title}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Preferred Date</label>
                    <input
                      type="date"
                      value={bookingData.preferredDate}
                      onChange={(e) => setBookingData({ ...bookingData, preferredDate: e.target.value })}
                      style={styles.input}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Preferred Time</label>
                    <select
                      value={bookingData.preferredTime}
                      onChange={(e) => setBookingData({ ...bookingData, preferredTime: e.target.value })}
                      style={styles.select}
                    >
                      <option value="">Select time</option>
                      <option value="9:00 AM">9:00 AM</option>
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="1:00 PM">1:00 PM</option>
                      <option value="2:00 PM">2:00 PM</option>
                      <option value="3:00 PM">3:00 PM</option>
                      <option value="4:00 PM">4:00 PM</option>
                    </select>
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Additional Information</label>
                  <textarea
                    value={bookingData.message}
                    onChange={(e) => setBookingData({ ...bookingData, message: e.target.value })}
                    style={styles.textarea}
                    rows="4"
                    placeholder="Tell us about your financial goals or any specific questions..."
                  />
                </div>
                <button type="submit" style={styles.submitButton}>
                  Request Consultation
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer style={styles.footer}>
          <p>© 2024 Oakline Bank. All rights reserved. Investment and advisory services provided by Oakline Financial Advisors, LLC.</p>
          <p style={styles.disclaimer}>
            Investment products are not FDIC insured, not bank guaranteed, and may lose value.
          </p>
        </footer>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc'
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '1rem 0',
    position: 'sticky',
    top: 0,
    zIndex: 100
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
    gap: '0.75rem',
    textDecoration: 'none'
  },
  logo: {
    height: '40px',
    width: 'auto'
  },
  brandName: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#1e3a8a'
  },
  headerActions: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center'
  },
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f1f5f9',
    color: '#334155',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  dashboardButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  heroSection: {
    background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
    padding: '4rem 2rem',
    textAlign: 'center',
    color: '#ffffff'
  },
  heroContent: {
    maxWidth: '800px',
    margin: '0 auto'
  },
  heroTitle: {
    fontSize: '3rem',
    fontWeight: 'bold',
    marginBottom: '1rem'
  },
  heroSubtitle: {
    fontSize: '1.25rem',
    marginBottom: '2rem',
    opacity: 0.9
  },
  ctaButton: {
    padding: '1rem 2rem',
    backgroundColor: '#ffffff',
    color: '#1e3a8a',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s'
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '3rem 2rem'
  },
  section: {
    marginBottom: '4rem'
  },
  sectionTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: '2rem',
    textAlign: 'center'
  },
  servicesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '2rem'
  },
  serviceCard: {
    backgroundColor: '#ffffff',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    transition: 'transform 0.3s'
  },
  serviceIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },
  serviceTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: '0.5rem'
  },
  serviceDescription: {
    color: '#64748b',
    marginBottom: '1.5rem',
    lineHeight: '1.6'
  },
  serviceFeatures: {
    marginBottom: '1.5rem'
  },
  featuresTitle: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: '0.5rem'
  },
  featuresList: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },
  featureItem: {
    color: '#64748b',
    padding: '0.25rem 0',
    fontSize: '0.9rem'
  },
  serviceDetails: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '1rem',
    marginBottom: '1rem'
  },
  serviceDetail: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    fontSize: '0.9rem'
  },
  detailLabel: {
    color: '#64748b',
    fontWeight: '500'
  },
  detailValue: {
    color: '#1e3a8a',
    fontWeight: 'bold'
  },
  learnMoreButton: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  advisorsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '2rem'
  },
  advisorCard: {
    backgroundColor: '#ffffff',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  advisorImage: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },
  advisorName: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: '0.25rem'
  },
  advisorTitle: {
    color: '#64748b',
    fontSize: '0.9rem',
    marginBottom: '1rem'
  },
  advisorInfo: {
    textAlign: 'left',
    marginBottom: '1rem'
  },
  infoItem: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginBottom: '0.5rem'
  },
  certifications: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    marginTop: '0.5rem'
  },
  certBadge: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#dbeafe',
    color: '#1e3a8a',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '600'
  },
  advisorBio: {
    fontSize: '0.9rem',
    color: '#64748b',
    lineHeight: '1.6',
    textAlign: 'left'
  },
  benefitsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem'
  },
  benefitCard: {
    backgroundColor: '#ffffff',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  benefitIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },
  benefitTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: '0.5rem'
  },
  benefitDesc: {
    color: '#64748b',
    lineHeight: '1.6'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem'
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid #e2e8f0'
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e3a8a'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#64748b'
  },
  bookingForm: {
    padding: '1.5rem'
  },
  formGroup: {
    marginBottom: '1.5rem'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem'
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#334155',
    fontWeight: '500',
    fontSize: '0.9rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '1rem'
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '1rem',
    backgroundColor: '#ffffff'
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '1rem',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  submitButton: {
    width: '100%',
    padding: '1rem',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  footer: {
    backgroundColor: '#1e293b',
    color: '#ffffff',
    padding: '2rem',
    textAlign: 'center'
  },
  disclaimer: {
    fontSize: '0.8rem',
    marginTop: '1rem',
    opacity: 0.7
  }
};

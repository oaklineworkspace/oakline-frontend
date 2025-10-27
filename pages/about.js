import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function About() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('company');
  const [bankDetails, setBankDetails] = useState(null);

  useEffect(() => {
    const fetchBankDetails = async () => {
      const { data, error } = await supabase
        .from('bank_details')
        .select('*')
        .limit(1)
        .single();

      if (!error && data) {
        setBankDetails(data);
      }
    };

    fetchBankDetails();
  }, []);

  return (
    <div style={styles.pageContainer}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContainer}>
          <Link href="/" style={styles.logoSection}>
            <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={styles.headerLogo} />
            <div style={styles.brandSection}>
              <span style={styles.bankName}>Oakline Bank</span>
              <span style={styles.bankTagline}>Trusted Banking Since 1995</span>
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
                <span style={styles.buttonIcon}>💼</span>
                Open Account
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={styles.heroSection}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>About Oakline Bank</h1>
          <p style={styles.heroSubtitle}>
            A Premier Financial Institution Committed to Excellence, Innovation, and Your Financial Success
          </p>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div style={styles.navigationTabs}>
        <div style={styles.container}>
          <div style={styles.tabsContainer}>
            {[
              { id: 'company', label: 'Our Company', icon: '🏦' },
              { id: 'mission', label: 'Mission & Values', icon: '🎯' },
              { id: 'leadership', label: 'Leadership', icon: '👥' },
              { id: 'awards', label: 'Awards', icon: '🏆' },
              { id: 'contact', label: 'Contact Us', icon: '📞' }
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
          {activeSection === 'company' && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Our Company</h2>
              <div style={styles.contentGrid}>
                <div style={styles.textContent}>
                  <p style={styles.paragraph}>
                    Established in 1995, Oakline Bank has evolved from a trusted community financial institution 
                    into a leading national bank recognized for innovation, security, and exceptional customer service. 
                    Our success is built on a foundation of integrity, cutting-edge technology, and unwavering commitment 
                    to our customers' financial wellbeing. We've grown to become one of America's most trusted financial 
                    institutions, maintaining an A+ rating from the Better Business Bureau and consistently ranking among 
                    the top banks for customer satisfaction.
                  </p>
                  <p style={styles.paragraph}>
                    With over 500,000 satisfied customers nationwide, we offer comprehensive financial solutions 
                    ranging from personal checking and savings accounts to sophisticated investment portfolios and 
                    business banking services. Our FDIC-insured accounts provide peace of mind while our digital-first 
                    approach ensures convenient, secure access to your finances 24/7. We leverage state-of-the-art 
                    encryption and multi-factor authentication to protect your assets, and our mobile app has been 
                    downloaded over 1 million times with a 4.8-star rating.
                  </p>
                  <p style={styles.paragraph}>
                    Beyond traditional banking, Oakline Bank is deeply invested in the communities we serve. We've 
                    contributed over $50 million to local charities, educational programs, and small business development 
                    initiatives. Our financial literacy programs have helped thousands of families achieve their dreams 
                    of homeownership, and our green banking initiatives support environmental sustainability. When you 
                    bank with Oakline, you're not just a customer—you're part of a family that cares about making a 
                    positive impact.
                  </p>
                  <div style={styles.statsList}>
                    <div style={styles.statItem}>
                      <span style={styles.statNumber}>500K+</span>
                      <span style={styles.statLabel}>Satisfied Customers</span>
                    </div>
                    <div style={styles.statItem}>
                      <span style={styles.statNumber}>$2.5B+</span>
                      <span style={styles.statLabel}>Assets Under Management</span>
                    </div>
                    <div style={styles.statItem}>
                      <span style={styles.statNumber}>150+</span>
                      <span style={styles.statLabel}>Branch Locations</span>
                    </div>
                  </div>
                </div>
                <div style={styles.imageContent}>
                  <img
                    src="/images/Modern_bank_lobby_interior_d535acc7.png"
                    alt="Modern Bank Lobby"
                    style={styles.contentImage}
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'mission' && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Mission & Values</h2>
              <div style={styles.valuesGrid}>
                <div style={styles.valueCard}>
                  <div style={styles.valueIcon}>🎯</div>
                  <h3 style={styles.valueTitle}>Our Mission</h3>
                  <p style={styles.valueText}>
                    To deliver exceptional financial services that empower individuals and businesses to achieve 
                    their goals through innovative solutions, personalized guidance, and steadfast commitment to 
                    integrity and excellence. We strive to be more than just a bank—we aim to be your trusted 
                    financial partner for life, providing expert advice, competitive rates, and unparalleled 
                    customer service that helps you build wealth and secure your financial future.
                  </p>
                </div>
                <div style={styles.valueCard}>
                  <div style={styles.valueIcon}>🔒</div>
                  <h3 style={styles.valueTitle}>Security First</h3>
                  <p style={styles.valueText}>
                    We prioritize the security of your financial information with bank-level
                    encryption and industry-leading cybersecurity measures.
                  </p>
                </div>
                <div style={styles.valueCard}>
                  <div style={styles.valueIcon}>🤝</div>
                  <h3 style={styles.valueTitle}>Customer Focus</h3>
                  <p style={styles.valueText}>
                    Every decision we make is centered around providing exceptional value and
                    service to our customers and communities.
                  </p>
                </div>
                <div style={styles.valueCard}>
                  <div style={styles.valueIcon}>💡</div>
                  <h3 style={styles.valueTitle}>Innovation</h3>
                  <p style={styles.valueText}>
                    We continuously invest in technology and processes to deliver modern,
                    convenient banking experiences.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'leadership' && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Leadership Team</h2>
              <div style={styles.leadershipGrid}>
                <div style={styles.leaderCard}>
                  <div style={styles.leaderImage}>
                    <span style={styles.leaderInitials}>JD</span>
                  </div>
                  <h3 style={styles.leaderName}>John Davis</h3>
                  <p style={styles.leaderTitle}>Chief Executive Officer</p>
                  <p style={styles.leaderBio}>
                    A seasoned banking executive with over 25 years of industry experience, John provides strategic 
                    leadership and drives innovation across all banking operations.
                  </p>
                </div>
                <div style={styles.leaderCard}>
                  <div style={styles.leaderImage}>
                    <span style={styles.leaderInitials}>SM</span>
                  </div>
                  <h3 style={styles.leaderName}>Sarah Martinez</h3>
                  <p style={styles.leaderTitle}>Chief Technology Officer</p>
                  <p style={styles.leaderBio}>
                    Leading our digital transformation initiatives, Sarah ensures world-class technology infrastructure 
                    and cybersecurity while delivering innovative banking solutions.
                  </p>
                </div>
                <div style={styles.leaderCard}>
                  <div style={styles.leaderImage}>
                    <span style={styles.leaderInitials}>MC</span>
                  </div>
                  <h3 style={styles.leaderName}>Michael Chen</h3>
                  <p style={styles.leaderTitle}>Chief Financial Officer</p>
                  <p style={styles.leaderBio}>
                    With expertise in financial management and regulatory compliance, Michael ensures operational 
                    excellence and maintains our institution's strong fiscal foundation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'awards' && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Awards & Recognition</h2>
              <div style={styles.awardsGrid}>
                <div style={styles.awardCard}>
                  <div style={styles.awardIcon}>🏆</div>
                  <h3 style={styles.awardTitle}>Best Digital Banking Experience</h3>
                  <p style={styles.awardYear}>2024</p>
                  <p style={styles.awardDescription}>
                    Recognized for our innovative mobile app and digital banking platform.
                  </p>
                </div>
                <div style={styles.awardCard}>
                  <div style={styles.awardIcon}>⭐</div>
                  <h3 style={styles.awardTitle}>Top Customer Service</h3>
                  <p style={styles.awardYear}>2023</p>
                  <p style={styles.awardDescription}>
                    Awarded for exceptional customer satisfaction and support excellence.
                  </p>
                </div>
                <div style={styles.awardCard}>
                  <div style={styles.awardIcon}>🛡️</div>
                  <h3 style={styles.awardTitle}>Cybersecurity Excellence</h3>
                  <p style={styles.awardYear}>2023</p>
                  <p style={styles.awardDescription}>
                    Honored for industry-leading security measures and fraud prevention.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'contact' && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Contact Us</h2>
              <div style={styles.contactSection}>
                <p style={styles.paragraph}>
                  Our dedicated team of banking professionals is committed to providing personalized service 
                  and expert financial guidance. Whether you prefer in-person consultation, phone support, or 
                  digital communication, we're here to assist you with all your banking needs. We offer extended 
                  support hours Monday through Saturday, with bilingual staff available to serve you in English 
                  and Spanish. Our average customer service response time is under 2 minutes, and we pride 
                  ourselves on resolving 95% of inquiries on the first contact.
                </p>
              </div>
              <div style={styles.contactSection}>
                <h3 style={styles.contactTitle}>Visit Our Branch</h3>
                <div style={styles.branchCard}>
                  <h4 style={styles.branchName}>
                    {bankDetails?.name || 'Oakline Bank'} – {bankDetails?.branch_name || 'Oklahoma City Branch'}
                  </h4>
                  <div style={styles.branchDetails}>
                    <div style={styles.branchItem}>
                      <div style={styles.branchIcon}>📍</div>
                      <div>
                        <div style={styles.branchLabel}>Address</div>
                        <div style={styles.branchValue}>
                          {bankDetails?.address || '12201 N. May Avenue, Oklahoma City, OK 73120'}
                        </div>
                      </div>
                    </div>
                    <div style={styles.branchItem}>
                      <div style={styles.branchIcon}>📞</div>
                      <div>
                        <div style={styles.branchLabel}>Phone / Text</div>
                        <a 
                          href={`tel:${bankDetails?.phone?.replace(/\s/g, '') || '+16366356122'}`} 
                          style={styles.branchLink}
                        >
                          {bankDetails?.phone || '+1 (636) 635-6122'}
                        </a>
                      </div>
                    </div>
                    <div style={styles.branchItem}>
                      <div style={styles.branchIcon}>✉️</div>
                      <div>
                        <div style={styles.branchLabel}>Email</div>
                        <a 
                          href={`mailto:${bankDetails?.email_contact || bankDetails?.email_info || 'contact-us@theoaklinebank.com'}`} 
                          style={styles.branchLink}
                        >
                          {bankDetails?.email_contact || bankDetails?.email_info || 'contact-us@theoaklinebank.com'}
                        </a>
                      </div>
                    </div>
                    <div style={styles.branchItem}>
                      <div style={styles.branchIcon}>🕒</div>
                      <div>
                        <div style={styles.branchLabel}>Business Hours</div>
                        <div style={styles.branchValue}>
                          Monday - Friday: 9:00 AM - 5:00 PM<br/>
                          Saturday: 9:00 AM - 1:00 PM<br/>
                          Sunday: Closed
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={styles.mapContainer}>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(bankDetails?.address || '12201 N. May Avenue, Oklahoma City, OK 73120')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.mapButton}
                    >
                      🗺️ View on Google Maps
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Call to Action */}
      <section style={styles.ctaSection}>
        <div style={styles.container}>
          <div style={styles.ctaContent}>
            <h2 style={styles.ctaTitle}>Begin Your Banking Journey with Oakline Bank</h2>
            <p style={styles.ctaSubtitle}>
              Join over 500,000 satisfied customers who trust us with their financial success. Experience the 
              difference of personalized service, innovative technology, and unwavering security.
            </p>
            <div style={styles.ctaButtons}>
              <Link href="/apply" style={styles.ctaButtonPrimary}>
                <span style={styles.buttonIcon}>💼</span>
                Open Account
              </Link>
              <Link href="/support" style={styles.ctaButtonSecondary}>
                <span style={styles.buttonIcon}>📞</span>
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const styles = {
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    backgroundColor: '#1A3E6F',
    borderBottom: '3px solid #FFC857',
    boxShadow: '0 4px 12px rgba(26, 62, 111, 0.2)',
    position: 'sticky',
    top: 0,
    zIndex: 1000
  },
  headerContainer: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '1rem 1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    textDecoration: 'none'
  },
  headerLogo: {
    height: '50px',
    width: 'auto'
  },
  brandSection: {
    display: 'flex',
    flexDirection: 'column'
  },
  bankName: {
    fontSize: '1.6rem',
    fontWeight: '800',
    color: 'white',
    lineHeight: '1'
  },
  bankTagline: {
    fontSize: '0.8rem',
    color: '#cbd5e1',
    fontWeight: '500'
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  headerButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.2rem',
    backgroundColor: 'white',
    color: '#1A3E6F',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.3s ease'
  },
  buttonIcon: {
    fontSize: '1rem'
  },
  heroSection: {
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    color: 'white',
    padding: '5rem 1rem',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden'
  },
  heroContent: {
    maxWidth: '800px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 2
  },
  heroTitle: {
    fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
    fontWeight: '900',
    marginBottom: '1rem',
    letterSpacing: '-0.02em',
    color: 'white'
  },
  heroSubtitle: {
    fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)',
    opacity: 0.95,
    lineHeight: '1.6',
    color: 'white'
  },
  navigationTabs: {
    backgroundColor: 'white',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky',
    top: '70px',
    zIndex: 999
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 1rem'
  },
  tabsContainer: {
    display: 'flex',
    gap: '0.5rem',
    padding: '1rem 0',
    overflowX: 'auto'
  },
  tabButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: 'transparent',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    whiteSpace: 'nowrap'
  },
  tabButtonActive: {
    backgroundColor: '#1A3E6F',
    color: 'white',
    borderColor: '#1A3E6F'
  },
  tabIcon: {
    fontSize: '1.1rem'
  },
  mainContent: {
    padding: '3rem 0',
    minHeight: '60vh'
  },
  section: {
    marginBottom: '3rem'
  },
  sectionTitle: {
    fontSize: 'clamp(2rem, 4vw, 2.5rem)',
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: '2rem',
    textAlign: 'center'
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '3rem',
    alignItems: 'center'
  },
  textContent: {
    padding: '1rem'
  },
  paragraph: {
    fontSize: '1.1rem',
    color: '#334155',
    lineHeight: '1.7',
    marginBottom: '1.5rem'
  },
  statsList: {
    display: 'flex',
    gap: '2rem',
    marginTop: '2rem',
    flexWrap: 'wrap'
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center'
  },
  statNumber: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#1A3E6F',
    marginBottom: '0.5rem'
  },
  statLabel: {
    fontSize: '0.9rem',
    color: '#334155',
    fontWeight: '600'
  },
  imageContent: {
    textAlign: 'center'
  },
  contentImage: {
    width: '100%',
    maxWidth: '500px',
    height: 'auto',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
  },
  valuesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '2rem'
  },
  valueCard: {
    backgroundColor: 'white',
    padding: '3rem',
    borderRadius: '20px',
    textAlign: 'center',
    boxShadow: '0 8px 25px rgba(0,0,0,0.12)',
    border: '2px solid #e2e8f0',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden'
  },
  valueIcon: {
    fontSize: '3rem',
    marginBottom: '1.5rem'
  },
  valueTitle: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  valueText: {
    fontSize: '1rem',
    color: '#334155',
    lineHeight: '1.6'
  },
  leadershipGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem'
  },
  leaderCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  leaderImage: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: '#1A3E6F',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem'
  },
  leaderInitials: {
    fontSize: '2rem',
    fontWeight: '700',
    color: 'white'
  },
  leaderName: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  leaderTitle: {
    fontSize: '1rem',
    color: '#1A3E6F',
    fontWeight: '600',
    marginBottom: '1rem'
  },
  leaderBio: {
    fontSize: '0.9rem',
    color: '#334155',
    lineHeight: '1.5'
  },
  awardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '2rem'
  },
  awardCard: {
    backgroundColor: 'white',
    padding: '2.5rem',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  awardIcon: {
    fontSize: '3rem',
    marginBottom: '1.5rem'
  },
  awardTitle: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  awardYear: {
    fontSize: '1rem',
    color: '#1A3E6F',
    fontWeight: '600',
    marginBottom: '1rem'
  },
  awardDescription: {
    fontSize: '0.9rem',
    color: '#334155',
    lineHeight: '1.5'
  },
  contactSection: {
    marginTop: '4rem',
    padding: '3rem',
    backgroundColor: '#f8fafc',
    borderRadius: '20px',
    border: '1px solid #e2e8f0'
  },
  contactTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1A3E6F',
    marginBottom: '2rem',
    textAlign: 'center'
  },
  branchCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2.5rem',
    border: '2px solid #FFC857',
    boxShadow: '0 4px 12px rgba(26, 62, 111, 0.1)'
  },
  branchName: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#1A3E6F',
    marginBottom: '2rem',
    textAlign: 'center',
    paddingBottom: '1rem',
    borderBottom: '2px solid #FFC857'
  },
  branchDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  branchItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    padding: '1.25rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    transition: 'all 0.3s ease'
  },
  branchIcon: {
    fontSize: '1.75rem',
    backgroundColor: '#FFC857',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  branchLabel: {
    fontSize: '0.875rem',
    color: '#64748b',
    marginBottom: '0.5rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  branchValue: {
    fontSize: '1rem',
    color: '#1e293b',
    fontWeight: '500',
    lineHeight: '1.6'
  },
  branchLink: {
    fontSize: '1rem',
    color: '#1A3E6F',
    fontWeight: '600',
    textDecoration: 'none',
    borderBottom: '2px solid transparent',
    transition: 'all 0.3s ease'
  },
  mapContainer: {
    textAlign: 'center',
    paddingTop: '1.5rem',
    borderTop: '1px solid #e2e8f0'
  },
  mapButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem 2rem',
    backgroundColor: '#1A3E6F',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    border: '2px solid #1A3E6F'
  },
  ctaSection: {
    backgroundColor: '#1A3E6F',
    color: 'white',
    padding: '4rem 1rem',
    textAlign: 'center'
  },
  ctaContent: {
    maxWidth: '800px',
    margin: '0 auto'
  },
  ctaTitle: {
    fontSize: 'clamp(2rem, 4vw, 2.5rem)',
    fontWeight: '800',
    marginBottom: '1rem',
    color: 'white'
  },
  ctaSubtitle: {
    fontSize: '1.2rem',
    opacity: 0.95,
    marginBottom: '2.5rem',
    lineHeight: '1.6',
    color: 'white'
  },
  ctaButtons: {
    display: 'flex',
    gap: '1.5rem',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  ctaButtonPrimary: {
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
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.4)'
  },
  ctaButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    border: '2px solid white',
    transition: 'all 0.3s ease'
  }
};
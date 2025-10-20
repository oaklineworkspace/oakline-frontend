
import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';

export default function FormsDocuments() {
  const [selectedCategory, setSelectedCategory] = useState('account');

  const documentCategories = {
    account: 'Account Forms',
    loan: 'Loan Applications',
    business: 'Business Banking',
    investment: 'Investment Forms',
    legal: 'Legal & Disclosures',
    tax: 'Tax Documents'
  };

  const documents = {
    account: [
      {
        title: 'Personal Account Application',
        description: 'Open a new checking or savings account',
        format: 'PDF',
        size: '2.1 MB',
        downloadUrl: '#',
        category: 'Application'
      },
      {
        title: 'Joint Account Agreement',
        description: 'Add or remove account holders',
        format: 'PDF',
        size: '1.8 MB',
        downloadUrl: '#',
        category: 'Agreement'
      },
      {
        title: 'Direct Deposit Form',
        description: 'Set up automatic payroll deposits',
        format: 'PDF',
        size: '0.9 MB',
        downloadUrl: '#',
        category: 'Service'
      },
      {
        title: 'Account Closure Request',
        description: 'Close your existing account',
        format: 'PDF',
        size: '1.2 MB',
        downloadUrl: '#',
        category: 'Service'
      },
      {
        title: 'Address Change Form',
        description: 'Update your contact information',
        format: 'PDF',
        size: '0.7 MB',
        downloadUrl: '#',
        category: 'Service'
      },
      {
        title: 'Debit Card Request',
        description: 'Order a new or replacement debit card',
        format: 'PDF',
        size: '1.1 MB',
        downloadUrl: '#',
        category: 'Service'
      }
    ],
    loan: [
      {
        title: 'Personal Loan Application',
        description: 'Apply for an unsecured personal loan',
        format: 'PDF',
        size: '3.2 MB',
        downloadUrl: '#',
        category: 'Application'
      },
      {
        title: 'Auto Loan Application',
        description: 'Finance your new or used vehicle',
        format: 'PDF',
        size: '2.8 MB',
        downloadUrl: '#',
        category: 'Application'
      },
      {
        title: 'Mortgage Pre-Approval Application',
        description: 'Get pre-approved for a home loan',
        format: 'PDF',
        size: '4.1 MB',
        downloadUrl: '#',
        category: 'Application'
      },
      {
        title: 'Home Equity Line of Credit (HELOC)',
        description: 'Access your home\'s equity',
        format: 'PDF',
        size: '3.5 MB',
        downloadUrl: '#',
        category: 'Application'
      },
      {
        title: 'Loan Modification Request',
        description: 'Request changes to existing loan terms',
        format: 'PDF',
        size: '2.3 MB',
        downloadUrl: '#',
        category: 'Service'
      },
      {
        title: 'Payment Holiday Request',
        description: 'Request temporary payment relief',
        format: 'PDF',
        size: '1.9 MB',
        downloadUrl: '#',
        category: 'Service'
      }
    ],
    business: [
      {
        title: 'Business Account Application',
        description: 'Open a business checking or savings account',
        format: 'PDF',
        size: '3.8 MB',
        downloadUrl: '#',
        category: 'Application'
      },
      {
        title: 'Business Loan Application',
        description: 'Apply for business financing',
        format: 'PDF',
        size: '4.5 MB',
        downloadUrl: '#',
        category: 'Application'
      },
      {
        title: 'Business Credit Card Application',
        description: 'Apply for a business credit card',
        format: 'PDF',
        size: '2.7 MB',
        downloadUrl: '#',
        category: 'Application'
      },
      {
        title: 'Corporate Resolution Form',
        description: 'Authorize banking relationships',
        format: 'PDF',
        size: '2.1 MB',
        downloadUrl: '#',
        category: 'Agreement'
      },
      {
        title: 'Merchant Services Application',
        description: 'Accept credit card payments',
        format: 'PDF',
        size: '3.3 MB',
        downloadUrl: '#',
        category: 'Application'
      },
      {
        title: 'Cash Management Services',
        description: 'Advanced business banking services',
        format: 'PDF',
        size: '2.9 MB',
        downloadUrl: '#',
        category: 'Service'
      }
    ],
    investment: [
      {
        title: 'Investment Account Application',
        description: 'Open a brokerage or investment account',
        format: 'PDF',
        size: '3.7 MB',
        downloadUrl: '#',
        category: 'Application'
      },
      {
        title: 'IRA Application (Traditional/Roth)',
        description: 'Start saving for retirement',
        format: 'PDF',
        size: '2.9 MB',
        downloadUrl: '#',
        category: 'Application'
      },
      {
        title: '401(k) Rollover Form',
        description: 'Transfer retirement savings',
        format: 'PDF',
        size: '2.4 MB',
        downloadUrl: '#',
        category: 'Service'
      },
      {
        title: 'Investment Risk Assessment',
        description: 'Determine your investment profile',
        format: 'PDF',
        size: '1.8 MB',
        downloadUrl: '#',
        category: 'Assessment'
      },
      {
        title: 'Beneficiary Designation Form',
        description: 'Name beneficiaries for your accounts',
        format: 'PDF',
        size: '1.5 MB',
        downloadUrl: '#',
        category: 'Service'
      },
      {
        title: 'Required Minimum Distribution (RMD) Form',
        description: 'Manage mandatory retirement withdrawals',
        format: 'PDF',
        size: '2.0 MB',
        downloadUrl: '#',
        category: 'Service'
      }
    ],
    legal: [
      {
        title: 'Account Terms and Conditions',
        description: 'Complete terms for all account types',
        format: 'PDF',
        size: '5.2 MB',
        downloadUrl: '#',
        category: 'Terms'
      },
      {
        title: 'Privacy Policy',
        description: 'How we protect your personal information',
        format: 'PDF',
        size: '1.9 MB',
        downloadUrl: '#',
        category: 'Privacy'
      },
      {
        title: 'Fee Schedule',
        description: 'Current fees for all banking services',
        format: 'PDF',
        size: '2.3 MB',
        downloadUrl: '#',
        category: 'Fees'
      },
      {
        title: 'Electronic Banking Agreement',
        description: 'Terms for online and mobile banking',
        format: 'PDF',
        size: '3.1 MB',
        downloadUrl: '#',
        category: 'Agreement'
      },
      {
        title: 'Funds Availability Policy',
        description: 'When deposited funds become available',
        format: 'PDF',
        size: '1.7 MB',
        downloadUrl: '#',
        category: 'Policy'
      },
      {
        title: 'Truth in Savings Disclosure',
        description: 'Interest rates and account terms',
        format: 'PDF',
        size: '2.8 MB',
        downloadUrl: '#',
        category: 'Disclosure'
      }
    ],
    tax: [
      {
        title: 'Form 1099-INT (Interest Income)',
        description: 'Annual interest income statement',
        format: 'PDF',
        size: '0.8 MB',
        downloadUrl: '#',
        category: 'Tax Form'
      },
      {
        title: 'Form 1099-DIV (Dividend Income)',
        description: 'Annual dividend income statement',
        format: 'PDF',
        size: '0.9 MB',
        downloadUrl: '#',
        category: 'Tax Form'
      },
      {
        title: 'Form 5498 (IRA Contributions)',
        description: 'IRA contribution and rollover information',
        format: 'PDF',
        size: '1.1 MB',
        downloadUrl: '#',
        category: 'Tax Form'
      },
      {
        title: 'Form 1098 (Mortgage Interest)',
        description: 'Mortgage interest paid statement',
        format: 'PDF',
        size: '1.0 MB',
        downloadUrl: '#',
        category: 'Tax Form'
      },
      {
        title: 'Tax Document Request Form',
        description: 'Request copies of previous year tax documents',
        format: 'PDF',
        size: '1.3 MB',
        downloadUrl: '#',
        category: 'Request'
      },
      {
        title: 'W-9 Form (Taxpayer Identification)',
        description: 'Provide taxpayer identification information',
        format: 'PDF',
        size: '0.7 MB',
        downloadUrl: '#',
        category: 'Form'
      }
    ]
  };

  const handleDownload = (documentTitle) => {
    // Simulate download
    alert(`Downloading: ${documentTitle}\n\nThis is a demo. In a real application, this would download the actual document.`);
  };

  return (
    <>
      <Head>
        <title>Forms & Documents - Oakline Bank</title>
        <meta name="description" content="Download banking forms, applications, and important documents from Oakline Bank." />
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
            <h1 style={styles.heroTitle}>Forms & Documents</h1>
            <p style={styles.heroSubtitle}>
              Access all the forms and documents you need for your banking needs in one convenient location.
            </p>
          </div>
        </section>

        {/* Main Content */}
        <main style={styles.main}>
          {/* Category Navigation */}
          <section style={styles.categorySection}>
            <div style={styles.categoryNav}>
              {Object.entries(documentCategories).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  style={{
                    ...styles.categoryButton,
                    ...(selectedCategory === key ? styles.activeCategoryButton : {})
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Documents Grid */}
          <section style={styles.documentsSection}>
            <h2 style={styles.sectionTitle}>{documentCategories[selectedCategory]}</h2>
            <div style={styles.documentsGrid}>
              {documents[selectedCategory]?.map((doc, index) => (
                <div key={index} style={styles.documentCard}>
                  <div style={styles.documentHeader}>
                    <div style={styles.documentIcon}>📄</div>
                    <div style={styles.documentMeta}>
                      <span style={styles.documentFormat}>{doc.format}</span>
                      <span style={styles.documentSize}>{doc.size}</span>
                    </div>
                  </div>
                  
                  <h3 style={styles.documentTitle}>{doc.title}</h3>
                  <p style={styles.documentDescription}>{doc.description}</p>
                  
                  <div style={styles.documentFooter}>
                    <span style={styles.documentCategory}>{doc.category}</span>
                    <button
                      onClick={() => handleDownload(doc.title)}
                      style={styles.downloadButton}
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Help Section */}
          <section style={styles.helpSection}>
            <div style={styles.helpContent}>
              <h2 style={styles.helpTitle}>Need Help with Forms?</h2>
              <p style={styles.helpDescription}>
                Our banking specialists are here to help you complete any forms or answer questions about required documents.
              </p>
              
              <div style={styles.helpOptions}>
                <div style={styles.helpOption}>
                  <div style={styles.helpIcon}>💬</div>
                  <h3 style={styles.helpOptionTitle}>Live Chat</h3>
                  <p style={styles.helpOptionDesc}>Get instant help with form completion</p>
                  <button style={styles.helpButton}>Start Chat</button>
                </div>
                
                <div style={styles.helpOption}>
                  <div style={styles.helpIcon}>📞</div>
                  <h3 style={styles.helpOptionTitle}>Phone Support</h3>
                  <p style={styles.helpOptionDesc}>Call us at 1-800-OAKLINE</p>
                  <button style={styles.helpButton}>Call Now</button>
                </div>
                
                <div style={styles.helpOption}>
                  <div style={styles.helpIcon}>🏢</div>
                  <h3 style={styles.helpOptionTitle}>Visit a Branch</h3>
                  <p style={styles.helpOptionDesc}>Get personalized assistance in person</p>
                  <Link href="/branch-locator" style={styles.helpButton}>Find Branch</Link>
                </div>
                
                <div style={styles.helpOption}>
                  <div style={styles.helpIcon}>📧</div>
                  <h3 style={styles.helpOptionTitle}>Email Support</h3>
                  <p style={styles.helpOptionDesc}>Send us your questions anytime</p>
                  <button style={styles.helpButton}>Email Us</button>
                </div>
              </div>
            </div>
          </section>

          {/* Document Tips */}
          <section style={styles.tipsSection}>
            <h2 style={styles.tipsTitle}>Document Tips & Requirements</h2>
            <div style={styles.tipsGrid}>
              <div style={styles.tipCard}>
                <h3 style={styles.tipTitle}>📋 Before You Start</h3>
                <ul style={styles.tipList}>
                  <li>Have your government-issued ID ready</li>
                  <li>Gather required financial documents</li>
                  <li>Ensure you have a valid email address</li>
                  <li>Know your Social Security Number</li>
                </ul>
              </div>
              
              <div style={styles.tipCard}>
                <h3 style={styles.tipTitle}>✍️ Filling Out Forms</h3>
                <ul style={styles.tipList}>
                  <li>Use blue or black ink for paper forms</li>
                  <li>Print clearly and legibly</li>
                  <li>Complete all required fields</li>
                  <li>Sign and date where indicated</li>
                </ul>
              </div>
              
              <div style={styles.tipCard}>
                <h3 style={styles.tipTitle}>📤 Submitting Documents</h3>
                <ul style={styles.tipList}>
                  <li>Submit documents within 30 days</li>
                  <li>Keep copies for your records</li>
                  <li>Use our secure online portal when possible</li>
                  <li>Follow up if you don\'t hear back in 5 business days</li>
                </ul>
              </div>
              
              <div style={styles.tipCard}>
                <h3 style={styles.tipTitle}>🔒 Security & Privacy</h3>
                <ul style={styles.tipList}>
                  <li>Never email sensitive information</li>
                  <li>Use our secure document upload</li>
                  <li>Shred documents with personal information</li>
                  <li>Verify website URLs before entering data</li>
                </ul>
              </div>
            </div>
          </section>
        </main>

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
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem'
  },
  categorySection: {
    padding: '2rem 0'
  },
  categoryNav: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  categoryButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'white',
    color: '#64748b',
    border: '2px solid #e2e8f0',
    borderRadius: '25px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  activeCategoryButton: {
    backgroundColor: '#1a365d',
    color: 'white',
    borderColor: '#1a365d'
  },
  documentsSection: {
    padding: '2rem 0'
  },
  sectionTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '2rem',
    textAlign: 'center'
  },
  documentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem'
  },
  documentCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    transition: 'all 0.3s ease'
  },
  documentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  documentIcon: {
    fontSize: '2rem'
  },
  documentMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.25rem'
  },
  documentFormat: {
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: '#059669',
    backgroundColor: '#dcfce7',
    padding: '0.25rem 0.5rem',
    borderRadius: '12px'
  },
  documentSize: {
    fontSize: '0.75rem',
    color: '#64748b'
  },
  documentTitle: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '0.5rem'
  },
  documentDescription: {
    color: '#64748b',
    lineHeight: '1.5',
    marginBottom: '1rem'
  },
  documentFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  documentCategory: {
    fontSize: '0.8rem',
    color: '#1a365d',
    backgroundColor: '#e2e8f0',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontWeight: '500'
  },
  downloadButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#1a365d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  helpSection: {
    padding: '3rem 0',
    backgroundColor: 'white',
    borderRadius: '12px',
    margin: '2rem 0'
  },
  helpContent: {
    padding: '2rem',
    textAlign: 'center'
  },
  helpTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '1rem'
  },
  helpDescription: {
    fontSize: '1.1rem',
    color: '#64748b',
    marginBottom: '2rem',
    maxWidth: '600px',
    margin: '0 auto 2rem'
  },
  helpOptions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem'
  },
  helpOption: {
    textAlign: 'center',
    padding: '1.5rem'
  },
  helpIcon: {
    fontSize: '2.5rem',
    marginBottom: '1rem'
  },
  helpOptionTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '0.5rem'
  },
  helpOptionDesc: {
    color: '#64748b',
    marginBottom: '1rem',
    fontSize: '0.9rem'
  },
  helpButton: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#1a365d',
    color: 'white',
    textDecoration: 'none',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  tipsSection: {
    padding: '3rem 0'
  },
  tipsTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1a365d',
    textAlign: 'center',
    marginBottom: '2rem'
  },
  tipsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem'
  },
  tipCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  tipTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '1rem'
  },
  tipList: {
    margin: 0,
    paddingLeft: '1rem'
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

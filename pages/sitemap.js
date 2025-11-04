
import Link from 'next/link';

export default function Sitemap() {
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#ffffff',
      padding: '2rem 0'
    },
    content: {
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '0 2rem'
    },
    header: {
      textAlign: 'center',
      marginBottom: '3rem'
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: 'bold',
      color: '#1e40af',
      marginBottom: '1rem'
    },
    subtitle: {
      color: '#94a3b8',
      fontSize: '1.1rem'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '2rem',
      marginBottom: '2rem'
    },
    section: {
      backgroundColor: 'rgba(30, 64, 175, 0.1)',
      padding: '1.5rem',
      borderRadius: '8px',
      border: '1px solid rgba(30, 64, 175, 0.3)'
    },
    sectionTitle: {
      fontSize: '1.3rem',
      fontWeight: 'bold',
      color: '#60a5fa',
      marginBottom: '1rem'
    },
    linkList: {
      listStyle: 'none',
      padding: 0,
      margin: 0
    },
    linkItem: {
      marginBottom: '0.5rem'
    },
    link: {
      color: '#e2e8f0',
      textDecoration: 'none',
      fontSize: '0.95rem',
      transition: 'color 0.2s',
      ':hover': {
        color: '#60a5fa'
      }
    },
    searchNote: {
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      padding: '1rem',
      borderRadius: '8px',
      border: '1px solid rgba(34, 197, 94, 0.3)',
      textAlign: 'center',
      marginTop: '2rem'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>Site Map</h1>
          <p style={styles.subtitle}>Quick navigation to all pages and services on Oakline Bank</p>
        </div>

        <div style={styles.grid}>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Main Pages</h2>
            <ul style={styles.linkList}>
              <li style={styles.linkItem}><Link href="/" style={styles.link}>Home</Link></li>
              <li style={styles.linkItem}><Link href="/about" style={styles.link}>About Us</Link></li>
              <li style={styles.linkItem}><Link href="/account-types" style={styles.link}>Account Types</Link></li>
              <li style={styles.linkItem}><Link href="/login" style={styles.link}>Login</Link></li>
              <li style={styles.linkItem}><Link href="/signup" style={styles.link}>Sign Up</Link></li>
              <li style={styles.linkItem}><Link href="/enroll" style={styles.link}>Enroll</Link></li>
              <li style={styles.linkItem}><Link href="/apply" style={styles.link}>Apply for Account</Link></li>
            </ul>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Banking Services</h2>
            <ul style={styles.linkList}>
              <li style={styles.linkItem}><Link href="/dashboard" style={styles.link}>Dashboard</Link></li>
              <li style={styles.linkItem}><Link href="/accounts" style={styles.link}>Accounts</Link></li>
              <li style={styles.linkItem}><Link href="/transfer" style={styles.link}>Transfer Funds</Link></li>
              <li style={styles.linkItem}><Link href="/deposit" style={styles.link}>Mobile Deposit</Link></li>
              <li style={styles.linkItem}><Link href="/withdrawal" style={styles.link}>Withdrawal</Link></li>
              <li style={styles.linkItem}><Link href="/bill-pay" style={styles.link}>Bill Pay</Link></li>
              <li style={styles.linkItem}><Link href="/transactions" style={styles.link}>Transaction History</Link></li>
            </ul>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Cards & Loans</h2>
            <ul style={styles.linkList}>
              <li style={styles.linkItem}><Link href="/cards" style={styles.link}>Credit & Debit Cards</Link></li>
              <li style={styles.linkItem}><Link href="/loans" style={styles.link}>Loans</Link></li>
              <li style={styles.linkItem}><Link href="/credit-report" style={styles.link}>Credit Report</Link></li>
            </ul>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Investment Services</h2>
            <ul style={styles.linkList}>
              <li style={styles.linkItem}><Link href="/investments" style={styles.link}>Investment Portfolio</Link></li>
              <li style={styles.linkItem}><Link href="/investment-details" style={styles.link}>Investment Details</Link></li>
              <li style={styles.linkItem}><Link href="/crypto" style={styles.link}>Cryptocurrency</Link></li>
              <li style={styles.linkItem}><Link href="/financial-advisory" style={styles.link}>Financial Advisory</Link></li>
            </ul>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Support & Resources</h2>
            <ul style={styles.linkList}>
              <li style={styles.linkItem}><Link href="/support" style={styles.link}>Customer Support</Link></li>
              <li style={styles.linkItem}><Link href="/faq" style={styles.link}>FAQ</Link></li>
              <li style={styles.linkItem}><Link href="/market-news" style={styles.link}>Market News</Link></li>
              <li style={styles.linkItem}><Link href="/financial-education" style={styles.link}>Financial Education</Link></li>
              <li style={styles.linkItem}><Link href="/calculators" style={styles.link}>Financial Calculators</Link></li>
              <li style={styles.linkItem}><Link href="/forms-documents" style={styles.link}>Forms & Documents</Link></li>
              <li style={styles.linkItem}><Link href="/current-rates" style={styles.link}>Current Rates</Link></li>
              <li style={styles.linkItem}><Link href="/branch-locator" style={styles.link}>Branch Locator</Link></li>
              <li style={styles.linkItem}><Link href="/rewards" style={styles.link}>Rewards Program</Link></li>
            </ul>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Account Management</h2>
            <ul style={styles.linkList}>
              <li style={styles.linkItem}><Link href="/profile" style={styles.link}>Profile</Link></li>
              <li style={styles.linkItem}><Link href="/security" style={styles.link}>Security Settings</Link></li>
              <li style={styles.linkItem}><Link href="/mfa-setup" style={styles.link}>Multi-Factor Authentication</Link></li>
              <li style={styles.linkItem}><Link href="/notifications" style={styles.link}>Notifications</Link></li>
              <li style={styles.linkItem}><Link href="/messages" style={styles.link}>Messages</Link></li>
              <li style={styles.linkItem}><Link href="/reset-password" style={styles.link}>Reset Password</Link></li>
              <li style={styles.linkItem}><Link href="/verify-email" style={styles.link}>Verify Email</Link></li>
            </ul>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Legal & Compliance</h2>
            <ul style={styles.linkList}>
              <li style={styles.linkItem}><Link href="/privacy" style={styles.link}>Privacy Policy</Link></li>
              <li style={styles.linkItem}><Link href="/terms" style={styles.link}>Terms of Service</Link></li>
              <li style={styles.linkItem}><Link href="/compliance" style={styles.link}>Compliance</Link></li>
              <li style={styles.linkItem}><Link href="/disclosures" style={styles.link}>Disclosures</Link></li>
              <li style={styles.linkItem}><Link href="/accessibility" style={styles.link}>Accessibility</Link></li>
            </ul>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Additional Tools</h2>
            <ul style={styles.linkList}>
              <li style={styles.linkItem}><Link href="/internationalization" style={styles.link}>Language Settings</Link></li>
              <li style={styles.linkItem}><Link href="/main-menu" style={styles.link}>Main Menu</Link></li>
            </ul>
          </div>

          </div>

        <div style={styles.searchNote}>
          <p style={{color: '#e2e8f0', margin: 0, fontSize: '0.95rem'}}>
            Can't find what you're looking for? Contact our customer support at 1-800-OAKLINE (625-5463) 
            or use our live chat feature for immediate assistance.
          </p>
        </div>
      </div>
    </div>
  );
}

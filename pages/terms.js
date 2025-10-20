
export default function Terms() {
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#ffffff',
      padding: '2rem 0'
    },
    content: {
      maxWidth: '800px',
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
    lastUpdated: {
      color: '#94a3b8',
      fontSize: '0.9rem'
    },
    section: {
      marginBottom: '2.5rem'
    },
    sectionTitle: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: '#3b82f6',
      marginBottom: '1rem'
    },
    text: {
      lineHeight: '1.7',
      color: '#e2e8f0',
      marginBottom: '1rem'
    },
    list: {
      paddingLeft: '1.5rem',
      marginBottom: '1rem'
    },
    listItem: {
      marginBottom: '0.5rem',
      color: '#e2e8f0'
    },
    important: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      padding: '1rem',
      borderRadius: '8px',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      marginBottom: '1rem'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>Terms of Service</h1>
          <p style={styles.lastUpdated}>Last Updated: January 2024</p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>1. Acceptance of Terms</h2>
          <p style={styles.text}>
            By accessing or using Oakline Bank services, you agree to be bound by these Terms of Service 
            and all applicable laws and regulations. If you do not agree with any of these terms, 
            you are prohibited from using our services.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>2. Account Opening and Eligibility</h2>
          <p style={styles.text}>To open an account with Oakline Bank, you must:</p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Be at least 18 years old</li>
            <li style={styles.listItem}>Be a U.S. citizen or legal resident</li>
            <li style={styles.listItem}>Provide accurate and complete information</li>
            <li style={styles.listItem}>Have a valid Social Security Number or ITIN</li>
            <li style={styles.listItem}>Pass identity verification and background checks</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>3. Account Terms and Conditions</h2>
          <p style={styles.text}>
            Your account is subject to the following terms:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Minimum opening deposits as specified for each account type</li>
            <li style={styles.listItem}>Monthly maintenance fees (may be waived based on balance or activity)</li>
            <li style={styles.listItem}>Transaction limits as outlined in your account agreement</li>
            <li style={styles.listItem}>Interest rates subject to change with notice</li>
            <li style={styles.listItem}>FDIC insurance up to $250,000 per depositor</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>4. Online and Mobile Banking</h2>
          <p style={styles.text}>
            Use of our digital services requires:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Secure login credentials that you must protect</li>
            <li style={styles.listItem}>Compatible device and internet connection</li>
            <li style={styles.listItem}>Acceptance of electronic communications</li>
            <li style={styles.listItem}>Compliance with security requirements</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>5. Prohibited Activities</h2>
          <div style={styles.important}>
            <p style={styles.text}>
              <strong>You may not use our services for:</strong>
            </p>
          </div>
          <ul style={styles.list}>
            <li style={styles.listItem}>Illegal activities or money laundering</li>
            <li style={styles.listItem}>Fraudulent transactions or identity theft</li>
            <li style={styles.listItem}>Unauthorized access to other accounts</li>
            <li style={styles.listItem}>Violation of sanctions or export controls</li>
            <li style={styles.listItem}>Gambling in prohibited jurisdictions</li>
            <li style={styles.listItem}>Adult entertainment services</li>
            <li style={styles.listItem}>Cryptocurrency mining or trading (where restricted)</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>6. Fees and Charges</h2>
          <p style={styles.text}>
            You agree to pay all applicable fees as outlined in our Fee Schedule, including:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Monthly maintenance fees</li>
            <li style={styles.listItem}>Overdraft and NSF fees</li>
            <li style={styles.listItem}>Wire transfer fees</li>
            <li style={styles.listItem}>ATM fees for out-of-network usage</li>
            <li style={styles.listItem}>Stop payment fees</li>
            <li style={styles.listItem}>Account closure fees (if applicable)</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>7. Liability and Disclaimers</h2>
          <p style={styles.text}>
            Oakline Bank's liability is limited as follows:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>We are not liable for indirect, incidental, or consequential damages</li>
            <li style={styles.listItem}>Our liability is limited to the amount of the disputed transaction</li>
            <li style={styles.listItem}>We are not responsible for third-party service failures</li>
            <li style={styles.listItem}>Market losses on investments are not covered</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>8. Privacy and Data Protection</h2>
          <p style={styles.text}>
            Your privacy is important to us. Please review our Privacy Policy to understand 
            how we collect, use, and protect your information.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>9. Account Closure</h2>
          <p style={styles.text}>
            Either party may close an account with proper notice. Reasons for closure may include:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Violation of these terms</li>
            <li style={styles.listItem}>Suspicious or fraudulent activity</li>
            <li style={styles.listItem}>Excessive overdrafts or returned items</li>
            <li style={styles.listItem}>Failure to provide required documentation</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>10. Dispute Resolution</h2>
          <p style={styles.text}>
            Any disputes will be resolved through binding arbitration in accordance with the 
            rules of the American Arbitration Association, unless prohibited by law.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>11. Changes to Terms</h2>
          <p style={styles.text}>
            We may modify these terms at any time with 30 days' notice. Continued use of our 
            services constitutes acceptance of the modified terms.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Contact Information</h2>
          <p style={styles.text}>
            For questions about these terms, contact us at:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Email: legal@oaklinebank.com</li>
            <li style={styles.listItem}>Phone: 1-800-OAKLINE (625-5463)</li>
            <li style={styles.listItem}>Mail: Legal Department, Oakline Bank, 123 Financial District, NY 10001</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

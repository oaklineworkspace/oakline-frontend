
export default function Privacy() {
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
    contactInfo: {
      backgroundColor: 'rgba(30, 64, 175, 0.1)',
      padding: '1.5rem',
      borderRadius: '8px',
      border: '1px solid rgba(30, 64, 175, 0.3)'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>Privacy Policy</h1>
          <p style={styles.lastUpdated}>Last Updated: January 2024</p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>1. Information We Collect</h2>
          <p style={styles.text}>
            We collect information you provide directly to us, such as when you create an account, 
            make transactions, or contact us for support. This includes:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Personal identification information (name, email, phone, address)</li>
            <li style={styles.listItem}>Financial information (account numbers, transaction history)</li>
            <li style={styles.listItem}>Government-issued identification numbers (SSN, driver's license)</li>
            <li style={styles.listItem}>Employment and income information</li>
            <li style={styles.listItem}>Device and usage information when you use our services</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>2. How We Use Your Information</h2>
          <p style={styles.text}>We use your information to:</p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Provide, maintain, and improve our banking services</li>
            <li style={styles.listItem}>Process transactions and send related information</li>
            <li style={styles.listItem}>Verify your identity and prevent fraud</li>
            <li style={styles.listItem}>Comply with legal and regulatory requirements</li>
            <li style={styles.listItem}>Communicate with you about your account and our services</li>
            <li style={styles.listItem}>Develop new products and services</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>3. Information Sharing</h2>
          <p style={styles.text}>
            We do not sell, trade, or rent your personal information. We may share your information in 
            limited circumstances:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>With your consent or at your direction</li>
            <li style={styles.listItem}>With service providers who assist us in operations</li>
            <li style={styles.listItem}>To comply with legal obligations or court orders</li>
            <li style={styles.listItem}>To protect our rights, safety, or property</li>
            <li style={styles.listItem}>In connection with business transfers or mergers</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>4. Data Security</h2>
          <p style={styles.text}>
            We implement comprehensive security measures to protect your information, including:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>256-bit SSL encryption for all data transmission</li>
            <li style={styles.listItem}>Multi-factor authentication options</li>
            <li style={styles.listItem}>Regular security audits and monitoring</li>
            <li style={styles.listItem}>Secure data centers with physical access controls</li>
            <li style={styles.listItem}>Employee training on data protection</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>5. Your Rights and Choices</h2>
          <p style={styles.text}>You have the right to:</p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Access and review your personal information</li>
            <li style={styles.listItem}>Request corrections to inaccurate information</li>
            <li style={styles.listItem}>Opt out of certain communications</li>
            <li style={styles.listItem}>Request deletion of your account (subject to legal requirements)</li>
            <li style={styles.listItem}>Receive a copy of your information in a portable format</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>6. Cookies and Tracking</h2>
          <p style={styles.text}>
            We use cookies and similar technologies to enhance your experience, analyze usage, 
            and provide personalized content. You can control cookie settings through your browser.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>7. Third-Party Services</h2>
          <p style={styles.text}>
            Our services may integrate with third-party providers for payment processing, 
            identity verification, and other functions. These providers have their own privacy 
            policies governing their use of your information.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>8. Children's Privacy</h2>
          <p style={styles.text}>
            Our services are not intended for children under 18. We do not knowingly collect 
            personal information from children under 18 without parental consent.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>9. Updates to This Policy</h2>
          <p style={styles.text}>
            We may update this privacy policy periodically. We will notify you of material 
            changes by email or through our website.
          </p>
        </div>

        <div style={styles.contactInfo}>
          <h2 style={styles.sectionTitle}>Contact Us</h2>
          <p style={styles.text}>
            If you have questions about this privacy policy or your personal information, contact us:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Email: privacy@oaklinebank.com</li>
            <li style={styles.listItem}>Phone: 1-800-OAKLINE (625-5463)</li>
            <li style={styles.listItem}>Mail: Privacy Officer, Oakline Bank, 123 Financial District, NY 10001</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

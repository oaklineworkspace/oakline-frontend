
export default function Compliance() {
  const styles = {
    container: { minHeight: '100vh', backgroundColor: '#0f172a', color: '#ffffff', padding: '2rem 0' },
    content: { maxWidth: '800px', margin: '0 auto', padding: '0 2rem' },
    header: { textAlign: 'center', marginBottom: '3rem' },
    title: { fontSize: '2.5rem', fontWeight: 'bold', color: '#1e40af', marginBottom: '1rem' },
    subtitle: { color: '#94a3b8', fontSize: '1.1rem' },
    section: { marginBottom: '2.5rem' },
    sectionTitle: { fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6', marginBottom: '1rem' },
    text: { lineHeight: '1.7', color: '#e2e8f0', marginBottom: '1rem' },
    list: { paddingLeft: '1.5rem', marginBottom: '1rem' },
    listItem: { marginBottom: '0.5rem', color: '#e2e8f0' },
    highlight: { backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.3)', marginBottom: '1rem' },
    complianceCard: { backgroundColor: 'rgba(30, 64, 175, 0.1)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(30, 64, 175, 0.3)', marginBottom: '1.5rem' },
    cardTitle: { fontSize: '1.2rem', fontWeight: 'bold', color: '#60a5fa', marginBottom: '0.5rem' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>Compliance & Regulatory Information</h1>
          <p style={styles.subtitle}>Oakline Bank's commitment to regulatory excellence and customer protection</p>
        </div>

        <div style={styles.highlight}>
          <p style={styles.text}>
            <strong>Oakline Bank</strong> is committed to maintaining the highest standards of regulatory 
            compliance and ethical banking practices. We operate under strict oversight to protect our 
            customers and maintain the integrity of the financial system.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Regulatory Oversight</h2>
          <div style={styles.complianceCard}>
            <h3 style={styles.cardTitle}>FDIC Insurance</h3>
            <p style={styles.text}>
              Member FDIC - All deposit accounts are insured up to $250,000 per depositor, per insured bank, 
              for each account ownership category. FDIC Certificate #34567.
            </p>
          </div>
          <div style={styles.complianceCard}>
            <h3 style={styles.cardTitle}>Federal Reserve System</h3>
            <p style={styles.text}>
              Oakline Bank is a member of the Federal Reserve System and subject to examination and 
              regulation by the Federal Reserve Bank.
            </p>
          </div>
          <div style={styles.complianceCard}>
            <h3 style={styles.cardTitle}>OCC Supervision</h3>
            <p style={styles.text}>
              As a national bank, we are chartered and regulated by the Office of the Comptroller 
              of the Currency (OCC), ensuring adherence to federal banking laws.
            </p>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Anti-Money Laundering (AML) & BSA</h2>
          <p style={styles.text}>
            Oakline Bank maintains a comprehensive AML program in compliance with the Bank Secrecy Act:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Customer Due Diligence (CDD) procedures for all new accounts</li>
            <li style={styles.listItem}>Enhanced Due Diligence (EDD) for high-risk customers</li>
            <li style={styles.listItem}>Suspicious Activity Report (SAR) filing when required</li>
            <li style={styles.listItem}>Currency Transaction Report (CTR) filing for transactions over $10,000</li>
            <li style={styles.listItem}>OFAC sanctions screening and monitoring</li>
            <li style={styles.listItem}>Regular employee training on AML requirements</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Consumer Protection</h2>
          <p style={styles.text}>We comply with all applicable consumer protection laws:</p>
          <ul style={styles.list}>
            <li style={styles.listItem}><strong>Truth in Lending Act (TILA):</strong> Clear disclosure of credit terms</li>
            <li style={styles.listItem}><strong>Fair Credit Reporting Act (FCRA):</strong> Proper use of credit reports</li>
            <li style={styles.listItem}><strong>Equal Credit Opportunity Act (ECOA):</strong> Fair lending practices</li>
            <li style={styles.listItem}><strong>Real Estate Settlement Procedures Act (RESPA):</strong> Mortgage transparency</li>
            <li style={styles.listItem}><strong>Fair Debt Collection Practices Act (FDCPA):</strong> Ethical collection practices</li>
            <li style={styles.listItem}><strong>Electronic Fund Transfer Act (EFTA):</strong> Electronic transaction rights</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Privacy & Data Protection</h2>
          <p style={styles.text}>
            We maintain strict compliance with privacy regulations:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Gramm-Leach-Bliley Act (GLBA) privacy requirements</li>
            <li style={styles.listItem}>California Consumer Privacy Act (CCPA) where applicable</li>
            <li style={styles.listItem}>PCI DSS compliance for payment card data</li>
            <li style={styles.listItem}>SOX compliance for financial reporting</li>
            <li style={styles.listItem}>Regular cybersecurity assessments and updates</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Fair Lending & CRA</h2>
          <div style={styles.complianceCard}>
            <h3 style={styles.cardTitle}>Community Reinvestment Act (CRA)</h3>
            <p style={styles.text}>
              Oakline Bank is committed to meeting the credit needs of our entire community, 
              including low- and moderate-income neighborhoods. Our CRA rating: Satisfactory.
            </p>
          </div>
          <div style={styles.complianceCard}>
            <h3 style={styles.cardTitle}>Fair Housing Act</h3>
            <p style={styles.text}>
              We provide equal housing opportunity and do not discriminate based on race, color, 
              religion, sex, handicap, familial status, or national origin.
            </p>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Investment Services Compliance</h2>
          <p style={styles.text}>
            Oakline Securities, LLC provides investment services under strict regulatory oversight:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>FINRA Member - Check our BrokerCheck record</li>
            <li style={styles.listItem}>SIPC Member - Securities investor protection</li>
            <li style={styles.listItem}>SEC oversight for investment advisory services</li>
            <li style={styles.listItem}>Suitability and best interest standards</li>
            <li style={styles.listItem}>Regular compliance examinations</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Reporting & Transparency</h2>
          <p style={styles.text}>
            We maintain transparency through regular reporting:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Quarterly Call Reports to regulators</li>
            <li style={styles.listItem}>Annual CRA Performance Evaluation</li>
            <li style={styles.listItem}>HMDA Data reporting and disclosure</li>
            <li style={styles.listItem}>Public availability of regulatory reports</li>
            <li style={styles.listItem}>Regular board and committee oversight</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Compliance Contact</h2>
          <div style={styles.complianceCard}>
            <p style={styles.text}>
              For compliance-related questions or to report concerns:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>Email: compliance@oaklinebank.com</li>
              <li style={styles.listItem}>Phone: 1-800-OAKLINE (625-5463)</li>
              <li style={styles.listItem}>Mail: Compliance Officer, Oakline Bank, 123 Financial District, NY 10001</li>
              <li style={styles.listItem}>Anonymous Hotline: 1-800-REPORT (737-6781)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

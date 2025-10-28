
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Terms() {
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
    },
    note: {
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      padding: '1rem',
      borderRadius: '8px',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      marginBottom: '1rem'
    },
    contactInfo: {
      backgroundColor: 'rgba(59, 130, 246, 0.05)',
      padding: '1.5rem',
      borderRadius: '8px',
      border: '1px solid rgba(59, 130, 246, 0.2)'
    },
    contactItem: {
      marginBottom: '0.75rem',
      color: '#e2e8f0'
    },
    strong: {
      color: '#60a5fa',
      fontWeight: '600'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>Terms of Service</h1>
          <p style={styles.lastUpdated}>Last Updated: January 2025</p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>1. Acceptance of Terms</h2>
          <p style={styles.text}>
            By accessing or using {bankDetails?.name || 'Oakline Bank'}'s digital or financial services, 
            including online banking, mobile banking, or cryptocurrency-related products ("Services"), 
            you agree to be bound by these Terms of Service ("Terms") and all applicable laws. 
            If you do not agree, you may not use our Services.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>2. Eligibility and Account Opening</h2>
          <p style={styles.text}>To open an account with {bankDetails?.name || 'Oakline Bank'}, you must:</p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Be at least 18 years old</li>
            <li style={styles.listItem}>Be a U.S. citizen or lawful resident</li>
            <li style={styles.listItem}>Provide accurate and complete personal information</li>
            <li style={styles.listItem}>Have a valid Social Security Number (SSN) or ITIN</li>
            <li style={styles.listItem}>Pass identity verification and compliance checks</li>
          </ul>
          <p style={styles.text}>
            {bankDetails?.name || 'Oakline Bank'} reserves the right to deny, suspend, or close any 
            account at its discretion and in accordance with applicable regulations.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>3. Account Terms and Conditions</h2>
          <p style={styles.text}>All accounts are subject to:</p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Minimum deposit requirements as specified for each account type</li>
            <li style={styles.listItem}>Monthly maintenance or service fees (may be waived based on account activity)</li>
            <li style={styles.listItem}>Transaction limits and restrictions per account type</li>
            <li style={styles.listItem}>Variable interest rates (subject to notice)</li>
            <li style={styles.listItem}>FDIC insurance up to $250,000 per depositor, per ownership category</li>
          </ul>
          <div style={styles.note}>
            <p style={styles.text}>
              <strong style={styles.strong}>Note:</strong> Cryptocurrency balances or assets held in 
              your {bankDetails?.name || 'Oakline Bank'} digital wallet are not FDIC-insured and are 
              subject to market risk and volatility.
            </p>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>4. Online, Mobile, and Crypto Banking</h2>
          <p style={styles.text}>
            By using {bankDetails?.name || 'Oakline Bank'}'s online or crypto features, you agree to:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Keep your credentials secure and confidential</li>
            <li style={styles.listItem}>Use trusted and secure devices</li>
            <li style={styles.listItem}>Accept digital delivery of communications and disclosures</li>
            <li style={styles.listItem}>Comply with two-factor or other security authentication processes</li>
          </ul>
          <p style={styles.text}>
            Crypto-related features are provided through regulated third-party custodians or exchanges. 
            All blockchain transactions are final and subject to network fees.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>5. Prohibited Activities</h2>
          <div style={styles.important}>
            <p style={styles.text}>
              <strong>You may not use {bankDetails?.name || 'Oakline Bank'}'s Services for:</strong>
            </p>
          </div>
          <ul style={styles.list}>
            <li style={styles.listItem}>Money laundering or fraud</li>
            <li style={styles.listItem}>Illegal or unauthorized transactions</li>
            <li style={styles.listItem}>Circumventing sanctions or export laws</li>
            <li style={styles.listItem}>Unlicensed crypto exchanges or mixers</li>
            <li style={styles.listItem}>Online gambling where restricted</li>
            <li style={styles.listItem}>Ponzi or pyramid schemes</li>
            <li style={styles.listItem}>Adult entertainment or escort services</li>
            <li style={styles.listItem}>Exploitation of software, systems, or APIs</li>
          </ul>
          <p style={styles.text}>
            Any such activity may lead to immediate account closure and possible legal action.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>6. Fees and Charges</h2>
          <p style={styles.text}>
            Applicable fees include, but are not limited to:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Monthly maintenance fees</li>
            <li style={styles.listItem}>Wire and transfer fees</li>
            <li style={styles.listItem}>Crypto trading and conversion fees</li>
            <li style={styles.listItem}>Overdraft and NSF fees</li>
            <li style={styles.listItem}>ATM and out-of-network usage fees</li>
            <li style={styles.listItem}>Account closure or inactivity fees</li>
          </ul>
          <p style={styles.text}>
            All fees are disclosed in your account dashboard and subject to periodic updates.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>7. Risk and Liability</h2>
          <ul style={styles.list}>
            <li style={styles.listItem}>{bankDetails?.name || 'Oakline Bank'} is not liable for indirect or consequential damages</li>
            <li style={styles.listItem}>Our liability is limited to the amount of the disputed transaction</li>
            <li style={styles.listItem}>We are not responsible for third-party service outages or blockchain network failures</li>
            <li style={styles.listItem}>Crypto transactions are irreversible and not covered by deposit insurance</li>
          </ul>
          <p style={styles.text}>
            By using crypto services, you acknowledge and accept market and custodial risks.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>8. Privacy and Data Protection</h2>
          <p style={styles.text}>
            We are committed to protecting your personal and financial information. 
            Please review our Privacy Policy (linked in your dashboard) for how {bankDetails?.name || 'Oakline Bank'} 
            collects, uses, and secures your data across both traditional and crypto services.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>9. Account Closure</h2>
          <p style={styles.text}>
            Your account may be closed by either party with proper notice. {bankDetails?.name || 'Oakline Bank'} 
            may immediately restrict or terminate access if:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>You violate these Terms</li>
            <li style={styles.listItem}>Suspicious or unauthorized activity is detected</li>
            <li style={styles.listItem}>Required identification or documentation is missing</li>
            <li style={styles.listItem}>Regulatory obligations require closure</li>
          </ul>
          <p style={styles.text}>
            All outstanding fees must be cleared prior to release of remaining funds.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>10. Dispute Resolution</h2>
          <p style={styles.text}>
            Any disputes arising from these Terms shall be settled by binding arbitration in accordance 
            with the rules of the American Arbitration Association (AAA), except where prohibited by law. 
            By accepting these Terms, you waive the right to a class action or jury trial.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>11. Changes to Terms</h2>
          <p style={styles.text}>
            {bankDetails?.name || 'Oakline Bank'} may amend these Terms at any time with 30 days' notice. 
            Continued use of our Services after notice constitutes acceptance of the new Terms.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>12. Contact Information</h2>
          <p style={styles.text}>
            For questions, disputes, or support, please contact us:
          </p>
          <div style={styles.contactInfo}>
            <div style={styles.contactItem}>
              <strong style={styles.strong}>Email:</strong> {bankDetails?.email_info || 'contact-us@theoaklinebank.com'}
            </div>
            <div style={styles.contactItem}>
              <strong style={styles.strong}>Phone:</strong> {bankDetails?.phone || '+1 (636) 635-6122'}
            </div>
            <div style={styles.contactItem}>
              <strong style={styles.strong}>Address:</strong> {bankDetails?.address || '12201 N. May Avenue, Oklahoma City, OK 73120'}
            </div>
            <div style={styles.contactItem}>
              <strong style={styles.strong}>Business Hours:</strong> {bankDetails?.hours || 'Mon-Fri 9AM-5PM, Sat 9AM-1PM'}
            </div>
            {bankDetails?.routing_number && (
              <div style={styles.contactItem}>
                <strong style={styles.strong}>Routing Number:</strong> {bankDetails.routing_number}
              </div>
            )}
            {bankDetails?.swift_code && (
              <div style={styles.contactItem}>
                <strong style={styles.strong}>SWIFT Code:</strong> {bankDetails.swift_code}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

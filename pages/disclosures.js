
export default function Disclosures() {
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
    subtitle: {
      color: '#94a3b8',
      fontSize: '1.1rem'
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
    disclosureBox: {
      backgroundColor: 'rgba(30, 64, 175, 0.1)',
      padding: '1.5rem',
      borderRadius: '8px',
      border: '1px solid rgba(30, 64, 175, 0.3)',
      marginBottom: '1.5rem'
    },
    warning: {
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      padding: '1rem',
      borderRadius: '8px',
      border: '1px solid rgba(245, 158, 11, 0.3)',
      marginBottom: '1rem'
    },
    rateTable: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '1rem'
    },
    tableHeader: {
      backgroundColor: 'rgba(30, 64, 175, 0.2)',
      padding: '0.75rem',
      border: '1px solid rgba(30, 64, 175, 0.3)',
      textAlign: 'left'
    },
    tableCell: {
      padding: '0.75rem',
      border: '1px solid rgba(100, 116, 139, 0.3)',
      color: '#e2e8f0'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>Important Disclosures</h1>
          <p style={styles.subtitle}>Required legal and financial disclosures for Oakline Bank services</p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>FDIC Insurance Disclosure</h2>
          <div style={styles.disclosureBox}>
            <p style={styles.text}>
              <strong>Member FDIC.</strong> Funds on deposit are insured by the Federal Deposit Insurance Corporation 
              up to $250,000 per depositor, per insured bank, for each account ownership category.
            </p>
            <p style={styles.text}>
              <strong>FDIC Certificate Number:</strong> #34567<br/>
              <strong>Equal Housing Lender</strong> - We do not discriminate on the basis of race, color, religion, 
              national origin, sex, handicap, or familial status.
            </p>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Truth in Savings Disclosure</h2>
          <p style={styles.text}>
            Annual Percentage Yield (APY) information and account terms:
          </p>
          
          <table style={styles.rateTable}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Account Type</th>
                <th style={styles.tableHeader}>APY</th>
                <th style={styles.tableHeader}>Minimum Balance</th>
                <th style={styles.tableHeader}>Monthly Fee</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={styles.tableCell}>Essential Checking</td>
                <td style={styles.tableCell}>0.01%</td>
                <td style={styles.tableCell}>$0</td>
                <td style={styles.tableCell}>$12 (waived with $1,500 balance)</td>
              </tr>
              <tr>
                <td style={styles.tableCell}>Premium Checking</td>
                <td style={styles.tableCell}>0.25%</td>
                <td style={styles.tableCell}>$2,500</td>
                <td style={styles.tableCell}>$25 (waived with $5,000 balance)</td>
              </tr>
              <tr>
                <td style={styles.tableCell}>High-Yield Savings</td>
                <td style={styles.tableCell}>4.20%</td>
                <td style={styles.tableCell}>$100</td>
                <td style={styles.tableCell}>$5 (waived with $500 balance)</td>
              </tr>
              <tr>
                <td style={styles.tableCell}>12-Month CD</td>
                <td style={styles.tableCell}>4.75%</td>
                <td style={styles.tableCell}>$1,000</td>
                <td style={styles.tableCell}>$0</td>
              </tr>
            </tbody>
          </table>

          <div style={styles.warning}>
            <p style={styles.text}>
              <strong>Important:</strong> APYs are variable and subject to change. Early withdrawal penalties 
              apply to CDs. Fees may reduce earnings.
            </p>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Investment Disclosures</h2>
          <div style={styles.disclosureBox}>
            <p style={styles.text}>
              <strong>Investment products offered through Oakline Securities, LLC:</strong>
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>Are NOT FDIC insured</li>
              <li style={styles.listItem}>Are NOT deposits or obligations of Oakline Bank</li>
              <li style={styles.listItem}>Are NOT guaranteed by Oakline Bank</li>
              <li style={styles.listItem}>May lose value, including loss of principal</li>
              <li style={styles.listItem}>Are subject to investment risks</li>
            </ul>
            <p style={styles.text}>
              <strong>Member FINRA/SIPC.</strong> Securities and investment advisory services offered through 
              Oakline Securities, LLC, a registered broker-dealer and investment adviser.
            </p>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Electronic Banking Agreement</h2>
          <p style={styles.text}>
            By using our online and mobile banking services, you agree to:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Receive electronic statements and notices</li>
            <li style={styles.listItem">Maintain the security of your login credentials</li>
            <li style={styles.listItem">Report unauthorized transactions promptly</li>
            <li style={styles.listItem">Use services in accordance with our terms</li>
          </ul>
          
          <div style={styles.warning}>
            <p style={styles.text}>
              <strong>Electronic Fund Transfer Liability:</strong> Your liability for unauthorized electronic 
              fund transfers is limited if you notify us within 2 business days of learning of the loss or theft.
            </p>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Funds Availability Policy</h2>
          <div style={styles.disclosureBox}>
            <p style={styles.text}>
              <strong>General Policy:</strong> Our policy is to make funds from your deposits available to you 
              on the business day we receive your deposit.
            </p>
            <p style={styles.text}>
              <strong>Longer Delays May Apply:</strong> In some cases, we will not make all of the funds that 
              you deposit by check available to you on the business day after we receive your deposit.
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem">Deposits over $5,525 may be held for up to 2 additional business days</li>
              <li style={styles.listItem">New accounts may have extended hold periods</li>
              <li style={styles.listItem">Repeated overdrafts may result in longer holds</li>
              <li style={styles.listItem">Reasonable doubt about collectibility</li>
            </ul>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Fee Schedule Disclosure</h2>
          <p style={styles.text}>Common fees that may apply to your accounts:</p>
          
          <table style={styles.rateTable}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Service</th>
                <th style={styles.tableHeader}>Fee</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={styles.tableCell}>Overdraft Fee</td>
                <td style={styles.tableCell}>$35 per item</td>
              </tr>
              <tr>
                <td style={styles.tableCell}>NSF Fee</td>
                <td style={styles.tableCell}>$35 per item</td>
              </tr>
              <tr>
                <td style={styles.tableCell}>Wire Transfer (Domestic)</td>
                <td style={styles.tableCell}>$25 outgoing, $15 incoming</td>
              </tr>
              <tr>
                <td style={styles.tableCell}>Wire Transfer (International)</td>
                <td style={styles.tableCell}>$45 outgoing, $25 incoming</td>
              </tr>
              <tr>
                <td style={styles.tableCell}>Stop Payment</td>
                <td style={styles.tableCell}>$30 per item</td>
              </tr>
              <tr>
                <td style={styles.tableCell}>Account Research</td>
                <td style={styles.tableCell">$25 per hour</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Credit Card Disclosures</h2>
          <div style={styles.disclosureBox}>
            <p style={styles.text}>
              <strong>Oakline Rewards Credit Card Terms:</strong>
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}><strong>APR:</strong> 15.99% - 24.99% variable, based on creditworthiness</li>
              <li style={styles.listItem}><strong>Annual Fee:</strong> $0 - $95, depending on card type</li>
              <li style={styles.listItem}><strong>Late Payment Fee:</strong> Up to $40</li>
              <li style={styles.listItem}><strong>Cash Advance Fee:</strong> 5% of advance amount</li>
              <li style={styles.listItem}><strong>Foreign Transaction Fee:</strong> 0% - 3%, depending on card type</li>
            </ul>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Loan Disclosures</h2>
          <p style={styles.text}>
            All loan products are subject to credit approval and may require:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem">Income verification and employment history</li>
            <li style={styles.listItem">Collateral evaluation (for secured loans)</li>
            <li style={styles.listItem">Debt-to-income ratio within acceptable limits</li>
            <li style={styles.listItem">Minimum credit score requirements</li>
            <li style={styles.listItem}>Property appraisal (for real estate loans)</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Contact for Questions</h2>
          <div style={styles.disclosureBox}>
            <p style={styles.text}>
              If you have questions about any of these disclosures or need additional information:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>Phone: 1-800-OAKLINE (625-5463)</li>
              <li style={styles.listItem">Email: info@oaklinebank.com</li>
              <li style={styles.listItem}>Visit: Any Oakline Bank branch location</li>
              <li style={styles.listItem}>Mail: Customer Service, Oakline Bank, 123 Financial District, NY 10001</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

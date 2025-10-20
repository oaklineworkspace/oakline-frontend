import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';

export default function CurrentRates() {
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    const now = new Date();
    setLastUpdated(now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }));
  }, []);

  const savingsRates = [
    { account: 'High-Yield Savings Account', apy: '5.00%', minBalance: '$500', terms: 'No monthly fees' },
    { account: 'Regular Savings Account', apy: '3.50%', minBalance: '$100', terms: 'No monthly fees' },
    { account: 'Money Market Account', apy: '4.75%', minBalance: '$2,500', terms: '$12 monthly fee (waived with balance)' },
    { account: 'Student Savings Account', apy: '2.50%', minBalance: '$0', terms: 'No fees for students' },
    { account: 'Senior Savings Account', apy: '4.00%', minBalance: '$500', terms: 'No monthly fees, age 55+' },
    { account: 'Emergency Fund Account', apy: '4.10%', minBalance: '$500', terms: 'Instant access, no penalties' }
  ];

  const checkingRates = [
    { account: 'Premium Checking', apy: '0.50%', minBalance: '$0', terms: 'No monthly fees' },
    { account: 'Business Checking', apy: '0.15%', minBalance: '$1,000', terms: '$15 monthly fee (waived with $5,000 balance)' },
    { account: 'Student Checking', apy: '2.50%', minBalance: '$0', terms: 'No fees for students' },
    { account: 'Joint Checking', apy: '0.50%', minBalance: '$0', terms: 'No monthly fees' },
    { account: 'Teen Account', apy: '2.00%', minBalance: '$0', terms: 'Parental oversight required' }
  ];

  const cdRates = [
    { term: '6 Months', apy: '4.50%', minDeposit: '$1,000', earlyWithdrawal: '90 days interest' },
    { term: '1 Year', apy: '4.75%', minDeposit: '$1,000', earlyWithdrawal: '180 days interest' },
    { term: '2 Years', apy: '5.00%', minDeposit: '$1,000', earlyWithdrawal: '365 days interest' },
    { term: '3 Years', apy: '5.15%', minDeposit: '$1,000', earlyWithdrawal: '365 days interest' },
    { term: '5 Years', apy: '5.25%', minDeposit: '$1,000', earlyWithdrawal: '365 days interest' }
  ];

  const loanRates = [
    { loanType: 'Personal Loan', rate: '7.99% - 24.99%', term: '2-7 years', minAmount: '$1,000' },
    { loanType: 'Auto Loan (New)', rate: '4.49% - 18.99%', term: '3-7 years', minAmount: '$5,000' },
    { loanType: 'Auto Loan (Used)', rate: '5.99% - 20.99%', term: '3-6 years', minAmount: '$5,000' },
    { loanType: 'Home Mortgage (30-year)', rate: '6.75% - 8.25%', term: '30 years', minAmount: '$50,000' },
    { loanType: 'Home Mortgage (15-year)', rate: '6.25% - 7.75%', term: '15 years', minAmount: '$50,000' },
    { loanType: 'Business Loan', rate: '8.99% - 29.99%', term: '1-10 years', minAmount: '$10,000' },
    { loanType: 'Line of Credit', rate: '9.99% - 25.99%', term: 'Revolving', minAmount: '$5,000' }
  ];

  const creditCardRates = [
    { cardType: 'Rewards Credit Card', apr: '16.99% - 26.99%', annualFee: '$0', rewards: '1.5% cash back on all purchases' },
    { cardType: 'Premium Rewards Card', apr: '18.99% - 28.99%', annualFee: '$95', rewards: '3% on dining, 2% on travel, 1% on everything else' },
    { cardType: 'Business Credit Card', apr: '15.99% - 24.99%', annualFee: '$0', rewards: '2% on business purchases' },
    { cardType: 'Student Credit Card', apr: '19.99% - 26.99%', annualFee: '$0', rewards: '1% cash back, no credit history required' },
    { cardType: 'Secured Credit Card', apr: '22.99%', annualFee: '$25', rewards: 'Build credit with secured deposit' }
  ];

  const investmentRates = [
    { product: 'Traditional IRA', expectedReturn: '4.80% APY', minInvestment: '$500', fees: 'No management fees' },
    { product: 'Roth IRA', expectedReturn: '4.80% APY', minInvestment: '$500', fees: 'No management fees' },
    { product: 'Investment Account', expectedReturn: 'Variable returns', minInvestment: '$1,000', fees: 'Trading fees apply' },
    { product: 'Green Investment Account', expectedReturn: '6.00% APY', minInvestment: '$2,500', fees: 'No monthly fees' },
    { product: 'Real Estate Investment', expectedReturn: '7.50% APY', minInvestment: '$5,000', fees: 'Professional management included' },
    { product: 'Cryptocurrency Account', expectedReturn: 'Variable', minInvestment: '$100', fees: '$5 monthly fee' }
  ];

  return (
    <>
      <Head>
        <title>Current Interest Rates - Oakline Bank</title>
        <meta name="description" content="View current interest rates for savings accounts, loans, mortgages, and credit cards at Oakline Bank." />
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
            <h1 style={styles.heroTitle}>Current Interest Rates</h1>
            <p style={styles.heroSubtitle}>
              Stay informed with our competitive rates across all banking products and services.
            </p>
            <div style={styles.updateInfo}>
              Last updated: {lastUpdated}
            </div>
          </div>
        </section>

        {/* Main Content */}
        <main style={styles.main}>
          {/* Rate Highlights */}
          <section style={styles.highlightsSection}>
            <h2 style={styles.sectionTitle}>Rate Highlights</h2>
            <div style={styles.highlightsGrid}>
              <div style={styles.highlightCard}>
                <div style={styles.highlightIcon}>💰</div>
                <h3 style={styles.highlightTitle}>High-Yield Savings</h3>
                <div style={styles.highlightRate}>5.00% APY</div>
                <p style={styles.highlightDesc}>Earn more on your savings with our premium account</p>
              </div>

              <div style={styles.highlightCard}>
                <div style={styles.highlightIcon}>🏠</div>
                <h3 style={styles.highlightTitle}>30-Year Mortgage</h3>
                <div style={styles.highlightRate}>6.75% APR</div>
                <p style={styles.highlightDesc}>Competitive rates for your dream home</p>
              </div>

              <div style={styles.highlightCard}>
                <div style={styles.highlightIcon}>🔒</div>
                <h3 style={styles.highlightTitle}>5-Year CD</h3>
                <div style={styles.highlightRate}>5.25% APY</div>
                <p style={styles.highlightDesc}>Lock in guaranteed returns</p>
              </div>

              <div style={styles.highlightCard}>
                <div style={styles.highlightIcon}>💳</div>
                <h3 style={styles.highlightTitle}>Rewards Credit Card</h3>
                <div style={styles.highlightRate}>16.99% APR</div>
                <p style={styles.highlightDesc}>Earn cash back on every purchase</p>
              </div>
            </div>
          </section>

          {/* Savings & Checking Rates */}
          <section style={styles.ratesSection}>
            <h2 style={styles.sectionTitle}>Savings & Checking Account Rates</h2>

            <div style={styles.ratesTabs}>
              <h3 style={styles.tabTitle}>Savings Accounts</h3>
              <div style={styles.ratesTable}>
                <div style={styles.tableHeader}>
                  <span>Account Type</span>
                  <span>APY</span>
                  <span>Minimum Balance</span>
                  <span>Terms</span>
                </div>
                {savingsRates.map((rate, index) => (
                  <div key={index} style={styles.tableRow}>
                    <span style={styles.accountName}>{rate.account}</span>
                    <span style={styles.rateValue}>{rate.apy}</span>
                    <span>{rate.minBalance}</span>
                    <span style={styles.terms}>{rate.terms}</span>
                  </div>
                ))}
              </div>

              <h3 style={styles.tabTitle}>Checking Accounts</h3>
              <div style={styles.ratesTable}>
                <div style={styles.tableHeader}>
                  <span>Account Type</span>
                  <span>APY</span>
                  <span>Minimum Balance</span>
                  <span>Terms</span>
                </div>
                {checkingRates.map((rate, index) => (
                  <div key={index} style={styles.tableRow}>
                    <span style={styles.accountName}>{rate.account}</span>
                    <span style={styles.rateValue}>{rate.apy}</span>
                    <span>{rate.minBalance}</span>
                    <span style={styles.terms}>{rate.terms}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Certificate of Deposit Rates */}
          <section style={styles.ratesSection}>
            <h2 style={styles.sectionTitle}>Certificate of Deposit (CD) Rates</h2>
            <div style={styles.ratesTable}>
              <div style={styles.tableHeader}>
                <span>Term</span>
                <span>APY</span>
                <span>Minimum Deposit</span>
                <span>Early Withdrawal Penalty</span>
              </div>
              {cdRates.map((cd, index) => (
                <div key={index} style={styles.tableRow}>
                  <span style={styles.accountName}>{cd.term}</span>
                  <span style={styles.rateValue}>{cd.apy}</span>
                  <span>{cd.minDeposit}</span>
                  <span style={styles.terms}>{cd.earlyWithdrawal}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Loan Rates */}
          <section style={styles.ratesSection}>
            <h2 style={styles.sectionTitle}>Loan & Mortgage Rates</h2>
            <div style={styles.ratesTable}>
              <div style={styles.tableHeader}>
                <span>Loan Type</span>
                <span>Interest Rate</span>
                <span>Term</span>
                <span>Minimum Amount</span>
              </div>
              {loanRates.map((loan, index) => (
                <div key={index} style={styles.tableRow}>
                  <span style={styles.accountName}>{loan.loanType}</span>
                  <span style={styles.rateValue}>{loan.rate}</span>
                  <span>{loan.term}</span>
                  <span>{loan.minAmount}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Credit Card Rates */}
          <section style={styles.ratesSection}>
            <h2 style={styles.sectionTitle}>Credit Card Rates</h2>
            <div style={styles.ratesTable}>
              <div style={styles.tableHeader}>
                <span>Card Type</span>
                <span>APR</span>
                <span>Annual Fee</span>
                <span>Rewards</span>
              </div>
              {creditCardRates.map((card, index) => (
                <div key={index} style={styles.tableRow}>
                  <span style={styles.accountName}>{card.cardType}</span>
                  <span style={styles.rateValue}>{card.apr}</span>
                  <span>{card.annualFee}</span>
                  <span style={styles.terms}>{card.rewards}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Investment Rates */}
          <section style={styles.ratesSection}>
            <h2 style={styles.sectionTitle}>Investment & Retirement Account Rates</h2>
            <div style={styles.ratesTable}>
              <div style={styles.tableHeader}>
                <span>Investment Product</span>
                <span>Expected Return</span>
                <span>Minimum Investment</span>
                <span>Fees</span>
              </div>
              {investmentRates.map((investment, index) => (
                <div key={index} style={styles.tableRow}>
                  <span style={styles.accountName}>{investment.product}</span>
                  <span style={styles.rateValue}>{investment.expectedReturn}</span>
                  <span>{investment.minInvestment}</span>
                  <span style={styles.terms}>{investment.fees}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Disclaimer */}
          <section style={styles.disclaimerSection}>
            <div style={styles.disclaimerCard}>
              <h3 style={styles.disclaimerTitle}>Important Rate Information</h3>
              <ul style={styles.disclaimerList}>
                <li>Annual Percentage Yield (APY) is accurate as of the last update date shown above.</li>
                <li>Rates are subject to change without notice and may vary based on creditworthiness and other factors.</li>
                <li>Minimum balance requirements must be maintained to earn the stated APY.</li>
                <li>Loan rates shown are starting rates and actual rates may be higher based on credit approval.</li>
                <li>Investment returns are not guaranteed and past performance does not guarantee future results.</li>
                <li>Early withdrawal penalties apply to CDs and may result in loss of principal.</li>
                <li>All accounts are FDIC insured up to $250,000 per depositor, per insured bank.</li>
              </ul>
            </div>
          </section>

          {/* CTA Section */}
          <section style={styles.ctaSection}>
            <div style={styles.ctaContent}>
              <h2 style={styles.ctaTitle}>Ready to Start Earning?</h2>
              <p style={styles.ctaSubtitle}>
                Open an account today and start earning competitive rates on your money.
              </p>
              <div style={styles.ctaButtons}>
                <Link href="/apply" style={styles.primaryButton}>Open Account</Link>
                <Link href="/support" style={styles.secondaryButton}>Speak with a Banker</Link>
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
    lineHeight: '1.6',
    marginBottom: '1rem'
  },
  updateInfo: {
    fontSize: '0.9rem',
    opacity: 0.8,
    fontStyle: 'italic'
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem'
  },
  highlightsSection: {
    padding: '3rem 0'
  },
  sectionTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1a365d',
    textAlign: 'center',
    marginBottom: '2rem'
  },
  highlightsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem'
  },
  highlightCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  highlightIcon: {
    fontSize: '2.5rem',
    marginBottom: '1rem'
  },
  highlightTitle: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '0.5rem'
  },
  highlightRate: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: '0.5rem'
  },
  highlightDesc: {
    color: '#64748b',
    fontSize: '0.9rem',
    margin: 0
  },
  ratesSection: {
    padding: '2rem 0',
    marginBottom: '2rem',
    marginTop: '4rem'
  },
  ratesTabs: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem'
  },
  tabTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '2px solid #e2e8f0'
  },
  ratesTable: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1.5fr 2fr',
    gap: '1rem',
    padding: '1rem 1.5rem',
    backgroundColor: '#f8fafc',
    fontWeight: 'bold',
    color: '#1a365d',
    fontSize: '0.9rem'
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1.5fr 2fr',
    gap: '1rem',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #e2e8f0',
    alignItems: 'center'
  },
  accountName: {
    fontWeight: '600',
    color: '#1e293b'
  },
  rateValue: {
    fontWeight: 'bold',
    color: '#059669',
    fontSize: '1.1rem'
  },
  terms: {
    fontSize: '0.9rem',
    color: '#64748b'
  },
  disclaimerSection: {
    padding: '2rem 0'
  },
  disclaimerCard: {
    backgroundColor: '#fef3c7',
    borderRadius: '12px',
    padding: '2rem',
    border: '1px solid #fbbf24'
  },
  disclaimerTitle: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: '1rem'
  },
  disclaimerList: {
    margin: 0,
    paddingLeft: '1.5rem',
    color: '#92400e'
  },
  ctaSection: {
    padding: '3rem 0',
    textAlign: 'center'
  },
  ctaContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '3rem 2rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  ctaTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '1rem'
  },
  ctaSubtitle: {
    fontSize: '1.1rem',
    color: '#64748b',
    marginBottom: '2rem'
  },
  ctaButtons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  primaryButton: {
    padding: '1rem 2rem',
    backgroundColor: '#1a365d',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  secondaryButton: {
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: '#1a365d',
    textDecoration: 'none',
    border: '2px solid #1a365d',
    borderRadius: '8px',
    fontWeight: '600',
    transition: 'all 0.2s'
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
  },
  ratesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
    gap: '2rem',
    marginBottom: '3rem'
  },
  ratesSectionTitle: {
    fontSize: 'clamp(2rem, 4vw, 2.5rem)',
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: '3rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  rateTable: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '2rem',
    marginBottom: '3rem',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    border: '2px solid #e2e8f0'
  },
  tableTitle: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  tableGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1px',
    backgroundColor: '#e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  tableHeader: {
    backgroundColor: '#1e40af',
    color: 'white',
    padding: '1rem',
    fontSize: '0.9rem',
    fontWeight: '700',
    textAlign: 'center'
  },
  tableCell: {
    backgroundColor: '#ffffff',
    padding: '1rem',
    fontSize: '0.9rem',
    color: '#374151',
    textAlign: 'center'
  },
  rateCell: {
    fontWeight: '800',
    color: '#059669',
    fontSize: '1rem'
  },
  loanRateCell: {
    fontWeight: '800',
    color: '#dc2626',
    fontSize: '1rem'
  },
  disclosure: {
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
    padding: '2.5rem',
    marginTop: '4rem',
    border: '2px solid #e2e8f0'
  },
  disclosureTitle: {
    fontSize: '1.3rem',
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: '1.5rem'
  },
  disclosureContent: {
    lineHeight: '1.6'
  },
  disclosureText: {
    fontSize: '0.95rem',
    color: '#64748b',
    marginBottom: '1rem',
    textAlign: 'left'
  }
};

import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';

export default function FinancialEducation() {
  const [selectedCategory, setSelectedCategory] = useState('basics');

  const educationCategories = {
    basics: 'Banking Basics',
    budgeting: 'Budgeting & Saving',
    credit: 'Credit & Loans',
    investing: 'Investing',
    retirement: 'Retirement Planning',
    business: 'Business Finance'
  };

  const educationContent = {
    basics: [
      {
        title: 'Understanding Different Account Types',
        description: 'Learn about checking, savings, money market, and CD accounts.',
        content: 'Banking accounts serve different purposes. Checking accounts are for daily transactions, savings accounts help you earn interest while keeping money accessible, money market accounts offer higher interest with some restrictions, and CDs provide guaranteed returns for fixed periods.',
        tips: [
          'Choose checking accounts with no monthly fees',
          'Look for high-yield savings accounts',
          'Consider money market accounts for emergency funds',
          'Use CDs for guaranteed returns on money you won\'t need soon'
        ]
      },
      {
        title: 'Banking Fees and How to Avoid Them',
        description: 'Understand common banking fees and strategies to minimize them.',
        content: 'Banks charge various fees including overdraft fees, ATM fees, monthly maintenance fees, and wire transfer fees. Understanding these fees helps you make informed decisions and avoid unnecessary charges.',
        tips: [
          'Set up account alerts to avoid overdrafts',
          'Use your bank\'s ATM network to avoid fees',
          'Maintain minimum balances to waive monthly fees',
          'Consider online banks for lower fees'
        ]
      }
    ],
    budgeting: [
      {
        title: 'Creating Your First Budget',
        description: 'Step-by-step guide to building a personal budget.',
        content: 'A budget is a plan for your money. Start by tracking your income and expenses for a month, then categorize your spending into needs and wants. Use the 50/30/20 rule: 50% for needs, 30% for wants, 20% for savings and debt repayment.',
        tips: [
          'Track every expense for at least one month',
          'Use budgeting apps or spreadsheets',
          'Review and adjust your budget monthly',
          'Automate savings to make it easier'
        ]
      },
      {
        title: 'Building an Emergency Fund',
        description: 'Why you need an emergency fund and how to build one.',
        content: 'An emergency fund is money set aside for unexpected expenses like medical bills, car repairs, or job loss. Aim to save 3-6 months of living expenses in a separate, easily accessible account.',
        tips: [
          'Start with a goal of $1,000',
          'Automate transfers to your emergency fund',
          'Keep emergency funds in a high-yield savings account',
          'Only use for true emergencies'
        ]
      }
    ],
    credit: [
      {
        title: 'Understanding Credit Scores',
        description: 'Learn how credit scores work and how to improve yours.',
        content: 'Credit scores range from 300 to 850 and are based on payment history (35%), credit utilization (30%), length of credit history (15%), new credit (10%), and credit mix (10%). Higher scores lead to better loan terms.',
        tips: [
          'Pay all bills on time',
          'Keep credit utilization below 30%',
          'Don\'t close old credit cards',
          'Check your credit report annually'
        ]
      },
      {
        title: 'Choosing the Right Loan',
        description: 'Compare different types of loans and their uses.',
        content: 'Different loans serve different purposes: personal loans for consolidation or large purchases, auto loans for vehicles, mortgages for homes, and student loans for education. Compare interest rates, terms, and fees.',
        tips: [
          'Shop around with multiple lenders',
          'Consider the total cost, not just monthly payments',
          'Read all terms and conditions',
          'Get pre-approved to know your options'
        ]
      }
    ],
    investing: [
      {
        title: 'Investment Basics for Beginners',
        description: 'Introduction to stocks, bonds, and mutual funds.',
        content: 'Investing helps your money grow over time. Stocks represent ownership in companies, bonds are loans to companies or governments, and mutual funds pool money from many investors to buy a diversified portfolio.',
        tips: [
          'Start investing early to benefit from compound interest',
          'Diversify your investments',
          'Don\'t try to time the market',
          'Consider low-cost index funds'
        ]
      },
      {
        title: 'Risk and Diversification',
        description: 'Understanding investment risk and how to manage it.',
        content: 'All investments carry risk, but diversification can help reduce it. Don\'t put all your money in one investment or type of investment. Consider your age, goals, and risk tolerance when building a portfolio.',
        tips: [
          'Diversify across asset classes',
          'Consider your time horizon',
          'Rebalance your portfolio regularly',
          'Don\'t panic during market downturns'
        ]
      }
    ],
    retirement: [
      {
        title: 'Retirement Planning Basics',
        description: 'Start planning for retirement early.',
        content: 'Retirement planning involves saving money in tax-advantaged accounts like 401(k)s and IRAs. The earlier you start, the more time your money has to grow through compound interest.',
        tips: [
          'Contribute enough to get your employer match',
          'Increase contributions with salary raises',
          'Consider both traditional and Roth options',
          'Don\'t withdraw early unless absolutely necessary'
        ]
      },
      {
        title: 'Social Security and Medicare',
        description: 'Understanding government retirement benefits.',
        content: 'Social Security provides income in retirement based on your work history. Medicare provides health insurance starting at age 65. Understanding these benefits helps you plan how much you need to save independently.',
        tips: [
          'Create a Social Security account online',
          'Review your earnings record annually',
          'Consider delaying benefits for higher payments',
          'Plan for Medicare premiums and gaps'
        ]
      }
    ],
    business: [
      {
        title: 'Business Banking Essentials',
        description: 'Banking needs for small business owners.',
        content: 'Business owners need separate business accounts, proper record keeping, and understanding of business loans and lines of credit. Good banking relationships can help your business grow.',
        tips: [
          'Keep personal and business finances separate',
          'Build relationships with business bankers',
          'Understand your cash flow needs',
          'Consider business credit cards for expenses'
        ]
      },
      {
        title: 'Business Loans and Financing',
        description: 'Options for financing your business.',
        content: 'Businesses can access various financing options including term loans, lines of credit, SBA loans, and equipment financing. Each has different requirements and best uses.',
        tips: [
          'Prepare detailed financial statements',
          'Understand the true cost of financing',
          'Consider SBA loans for favorable terms',
          'Build business credit history'
        ]
      }
    ]
  };

  return (
    <>
      <Head>
        <title>Financial Education - Oakline Bank</title>
        <meta name="description" content="Learn essential financial skills with Oakline Bank's comprehensive education resources." />
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
            <h1 style={styles.heroTitle}>Financial Education Center</h1>
            <p style={styles.heroSubtitle}>
              Empower yourself with knowledge to make informed financial decisions and build a secure future.
            </p>
          </div>
        </section>

        {/* Main Content */}
        <main style={styles.main}>
          {/* Category Navigation */}
          <section style={styles.categorySection}>
            <div style={styles.categoryNav}>
              {Object.entries(educationCategories).map(([key, label]) => (
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

          {/* Education Content */}
          <section style={styles.contentSection}>
            <div style={styles.contentGrid}>
              {educationContent[selectedCategory]?.map((article, index) => (
                <div key={index} style={styles.articleCard}>
                  <h3 style={styles.articleTitle}>{article.title}</h3>
                  <p style={styles.articleDescription}>{article.description}</p>
                  <div style={styles.articleContent}>
                    <p style={styles.contentText}>{article.content}</p>
                    <div style={styles.tipsSection}>
                      <h4 style={styles.tipsTitle}>Key Tips:</h4>
                      <ul style={styles.tipsList}>
                        {article.tips.map((tip, tipIndex) => (
                          <li key={tipIndex} style={styles.tipItem}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Resources Section */}
          <section style={styles.resourcesSection}>
            <h2 style={styles.resourcesTitle}>Additional Resources</h2>
            <div style={styles.resourcesGrid}>
              <Link href="/faq" style={styles.resourceCard}>
                <div style={styles.resourceIcon}>❓</div>
                <h3 style={styles.resourceCardTitle}>FAQ</h3>
                <p style={styles.resourceCardDesc}>Common banking questions answered</p>
              </Link>
              
              <Link href="/support" style={styles.resourceCard}>
                <div style={styles.resourceIcon}>💬</div>
                <h3 style={styles.resourceCardTitle}>Customer Support</h3>
                <p style={styles.resourceCardDesc}>Get personalized assistance</p>
              </Link>
              
              <div style={styles.resourceCard}>
                <div style={styles.resourceIcon}>📚</div>
                <h3 style={styles.resourceCardTitle}>Workshops</h3>
                <p style={styles.resourceCardDesc}>Join our financial literacy workshops</p>
              </div>
              
              <div style={styles.resourceCard}>
                <div style={styles.resourceIcon}>📊</div>
                <h3 style={styles.resourceCardTitle}>Financial Tools</h3>
                <p style={styles.resourceCardDesc}>Calculators and planning tools</p>
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
  contentSection: {
    padding: '2rem 0'
  },
  contentGrid: {
    display: 'grid',
    gap: '2rem'
  },
  articleCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  articleTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '0.5rem'
  },
  articleDescription: {
    color: '#64748b',
    marginBottom: '1rem',
    fontSize: '1.1rem'
  },
  articleContent: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '1rem'
  },
  contentText: {
    color: '#475569',
    lineHeight: '1.6',
    marginBottom: '1.5rem'
  },
  tipsSection: {
    backgroundColor: '#f8fafc',
    padding: '1.5rem',
    borderRadius: '8px'
  },
  tipsTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '1rem'
  },
  tipsList: {
    margin: 0,
    paddingLeft: '1rem'
  },
  tipItem: {
    color: '#475569',
    marginBottom: '0.5rem',
    lineHeight: '1.5'
  },
  resourcesSection: {
    padding: '3rem 0',
    textAlign: 'center'
  },
  resourcesTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '2rem'
  },
  resourcesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem'
  },
  resourceCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '12px',
    textDecoration: 'none',
    color: 'inherit',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    transition: 'all 0.3s ease',
    display: 'block'
  },
  resourceIcon: {
    fontSize: '2.5rem',
    marginBottom: '1rem'
  },
  resourceCardTitle: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '0.5rem'
  },
  resourceCardDesc: {
    color: '#64748b',
    margin: 0
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

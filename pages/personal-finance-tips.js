import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../styles/Home.module.css';

export default function PersonalFinanceTips() {
  const [expandedTip, setExpandedTip] = useState(null);

  const financeTips = [
    {
      id: 1,
      title: 'Create a Monthly Budget',
      summary: 'Track your income and expenses to gain control of your finances',
      details: 'Start by listing all your income sources and monthly expenses. Categorize spending into needs (housing, food) and wants (entertainment, dining out). Use the 50/30/20 rule: 50% for needs, 30% for wants, and 20% for savings and debt repayment.'
    },
    {
      id: 2,
      title: 'Build an Emergency Fund',
      summary: 'Save 3-6 months of expenses for unexpected situations',
      details: 'Set aside funds in a high-yield savings account to cover emergencies like medical bills, car repairs, or job loss. Start small with $500-$1,000, then gradually build to 3-6 months of living expenses.'
    },
    {
      id: 3,
      title: 'Pay Off High-Interest Debt',
      summary: 'Prioritize eliminating credit card and high-interest loans',
      details: 'Use the avalanche method (paying off highest interest rate first) or snowball method (paying off smallest balance first). Consider balance transfers to lower-interest cards or debt consolidation loans.'
    },
    {
      id: 4,
      title: 'Start Investing Early',
      summary: 'Take advantage of compound interest over time',
      details: 'Even small amounts invested regularly can grow significantly. Start with employer 401(k) matching, then consider IRAs and low-cost index funds. The earlier you start, the more time your money has to grow.'
    },
    {
      id: 5,
      title: 'Automate Your Savings',
      summary: 'Set up automatic transfers to make saving effortless',
      details: 'Arrange automatic transfers from checking to savings on payday. This "pay yourself first" approach ensures you save before spending. Start with even 5-10% of your income.'
    },
    {
      id: 6,
      title: 'Review and Reduce Subscriptions',
      summary: 'Cancel unused services and negotiate better rates',
      details: 'Audit all recurring charges monthly. Cancel services you don\'t use regularly. Negotiate with providers for better rates on insurance, internet, and phone plans.'
    },
    {
      id: 7,
      title: 'Improve Your Credit Score',
      summary: 'Build good credit for better loan rates and opportunities',
      details: 'Pay bills on time, keep credit utilization below 30%, don\'t close old accounts, and check your credit report annually for errors. Good credit can save thousands in interest over your lifetime.'
    },
    {
      id: 8,
      title: 'Plan for Retirement',
      summary: 'Start saving now for a comfortable future',
      details: 'Contribute to employer-sponsored plans like 401(k)s, especially to get full company matching. Open an IRA for additional tax-advantaged savings. Aim to save 15% of income for retirement.'
    }
  ];

  return (
    <div className={styles.container}>
      <Head>
        <title>Personal Finance Tips | Oakline Bank</title>
        <meta name="description" content="Expert personal finance tips to help you manage money, save more, and achieve your financial goals with Oakline Bank" />
      </Head>

      <main className={styles.main}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
          <Link href="/" style={{ color: '#0066cc', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
            ← Back to Home
          </Link>

          <h1 style={{ fontSize: '2.5rem', marginBottom: '20px', color: '#1a1a1a' }}>
            Personal Finance Tips
          </h1>

          <div style={{ position: 'relative', width: '100%', height: '400px', marginBottom: '40px', borderRadius: '10px', overflow: 'hidden' }}>
            <Image
              src="/images/pages/Personal_finance_planning_workspace_cc5c01d4.png"
              alt="Personal finance planning"
              fill
              style={{ objectFit: 'cover' }}
              priority
            />
          </div>

          <p style={{ fontSize: '1.2rem', lineHeight: '1.8', marginBottom: '40px', color: '#444' }}>
            At Oakline Bank, we believe financial wellness starts with good habits. Whether you're just starting your financial journey or looking to optimize your money management, these practical tips will help you build a stronger financial future.
          </p>

          <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '10px', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '20px', color: '#1a1a1a' }}>
              Essential Money Management Strategies
            </h2>
            
            <div style={{ display: 'grid', gap: '20px' }}>
              {financeTips.map((tip) => (
                <div
                  key={tip.id}
                  style={{
                    background: 'white',
                    padding: '25px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }}
                  onClick={() => setExpandedTip(expandedTip === tip.id ? null : tip.id)}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <h3 style={{ fontSize: '1.4rem', marginBottom: '10px', color: '#0066cc' }}>
                    {tip.title}
                  </h3>
                  <p style={{ fontSize: '1rem', color: '#666', marginBottom: expandedTip === tip.id ? '15px' : '0' }}>
                    {tip.summary}
                  </p>
                  {expandedTip === tip.id && (
                    <p style={{ fontSize: '1rem', lineHeight: '1.6', color: '#444', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                      {tip.details}
                    </p>
                  )}
                  <span style={{ fontSize: '0.9rem', color: '#0066cc', fontWeight: 'bold', marginTop: '10px', display: 'block' }}>
                    {expandedTip === tip.id ? 'Click to collapse ▲' : 'Click to learn more ▼'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#0066cc', color: 'white', padding: '40px', borderRadius: '10px', textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>Ready to Take Control of Your Finances?</h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '25px', opacity: 0.9 }}>
              Open an Oakline Bank account today and start building your financial future with our competitive rates and expert guidance.
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/apply" style={{ background: 'white', color: '#0066cc', padding: '15px 30px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold' }}>
                Open Account
              </Link>
              <Link href="/calculators" style={{ background: 'transparent', color: 'white', padding: '15px 30px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold', border: '2px solid white' }}>
                Financial Calculators
              </Link>
            </div>
          </div>

          <div style={{ marginTop: '50px' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '20px', color: '#1a1a1a' }}>
              Additional Resources
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <Link href="/calculators" style={{ textDecoration: 'none' }}>
                <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', transition: 'border-color 0.2s' }}>
                  <h3 style={{ color: '#0066cc', marginBottom: '10px' }}>Budget Calculator</h3>
                  <p style={{ color: '#666', fontSize: '0.95rem' }}>Plan your monthly expenses</p>
                </div>
              </Link>
              <Link href="/account-types" style={{ textDecoration: 'none' }}>
                <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
                  <h3 style={{ color: '#0066cc', marginBottom: '10px' }}>Savings Accounts</h3>
                  <p style={{ color: '#666', fontSize: '0.95rem' }}>Competitive interest rates</p>
                </div>
              </Link>
              <Link href="/investment" style={{ textDecoration: 'none' }}>
                <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
                  <h3 style={{ color: '#0066cc', marginBottom: '10px' }}>Investment Options</h3>
                  <p style={{ color: '#666', fontSize: '0.95rem' }}>Grow your wealth</p>
                </div>
              </Link>
              <Link href="/support" style={{ textDecoration: 'none' }}>
                <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
                  <h3 style={{ color: '#0066cc', marginBottom: '10px' }}>Financial Advisors</h3>
                  <p style={{ color: '#666', fontSize: '0.95rem' }}>Expert guidance available</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

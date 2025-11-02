import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../styles/Home.module.css';

export default function BusinessInsights() {
  const insights = [
    {
      category: 'Cash Flow Management',
      icon: '💵',
      tips: [
        'Monitor daily cash flow to identify patterns and seasonal trends',
        'Maintain a cash reserve equal to 3-6 months of operating expenses',
        'Use automated invoicing to accelerate receivables collection',
        'Negotiate favorable payment terms with suppliers'
      ]
    },
    {
      category: 'Business Credit',
      icon: '📊',
      tips: [
        'Separate personal and business finances from day one',
        'Build business credit by working with vendors who report to credit bureaus',
        'Pay all business obligations on time to maintain strong credit',
        'Monitor your business credit score quarterly'
      ]
    },
    {
      category: 'Growth Financing',
      icon: '📈',
      tips: [
        'Create detailed financial projections before seeking funding',
        'Explore multiple financing options: loans, lines of credit, SBA programs',
        'Maintain strong financial records to improve loan approval odds',
        'Consider timing - apply for financing before you urgently need it'
      ]
    },
    {
      category: 'Payment Processing',
      icon: '💳',
      tips: [
        'Offer multiple payment methods to increase sales',
        'Compare processor fees and negotiate better rates as you grow',
        'Implement secure payment systems to prevent fraud',
        'Use analytics to understand customer payment preferences'
      ]
    },
    {
      category: 'Tax Planning',
      icon: '📋',
      tips: [
        'Set aside 25-30% of profits for taxes throughout the year',
        'Track all business expenses for maximum deductions',
        'Make quarterly estimated tax payments to avoid penalties',
        'Consult with a tax professional for strategic planning'
      ]
    },
    {
      category: 'Digital Banking',
      icon: '💻',
      tips: [
        'Automate routine transactions to save time and reduce errors',
        'Use mobile banking for on-the-go account management',
        'Set up alerts for important account activities',
        'Integrate banking with accounting software for seamless bookkeeping'
      ]
    }
  ];

  const businessSolutions = [
    {
      title: 'Business Checking',
      features: ['No monthly maintenance fees', 'Unlimited transactions', 'Free online and mobile banking', 'Integration with QuickBooks'],
      ideal: 'Small to medium-sized businesses'
    },
    {
      title: 'Merchant Services',
      features: ['Competitive processing rates', 'Next-day funding', 'POS systems available', 'Fraud protection included'],
      ideal: 'Retail and service businesses'
    },
    {
      title: 'Business Line of Credit',
      features: ['Up to $250,000 credit line', 'Pay interest only on what you use', 'Flexible repayment terms', 'Quick approval process'],
      ideal: 'Managing cash flow gaps'
    },
    {
      title: 'Payroll Services',
      features: ['Automated payroll processing', 'Tax filing and compliance', 'Direct deposit setup', 'Employee self-service portal'],
      ideal: 'Businesses with employees'
    }
  ];

  return (
    <div className={styles.container}>
      <Head>
        <title>Business Banking Insights | Oakline Bank</title>
        <meta name="description" content="Expert business banking insights and financial strategies for small businesses and entrepreneurs from Oakline Bank" />
      </Head>

      <main className={styles.main}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
          <Link href="/" style={{ color: '#0066cc', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
            ← Back to Home
          </Link>

          <h1 style={{ fontSize: '2.5rem', marginBottom: '20px', color: '#1a1a1a' }}>
            Business Banking Insights
          </h1>

          <div style={{ position: 'relative', width: '100%', height: '400px', marginBottom: '40px', borderRadius: '10px', overflow: 'hidden' }}>
            <Image
              src="/images/pages/Business_banking_strategy_meeting_b5d04fcb.png"
              alt="Business banking strategy"
              fill
              style={{ objectFit: 'cover' }}
              priority
            />
          </div>

          <p style={{ fontSize: '1.2rem', lineHeight: '1.8', marginBottom: '40px', color: '#444' }}>
            Growing a successful business requires more than great products or services. Smart financial management is the foundation of sustainable growth. Oakline Bank provides the insights and tools you need to make informed business decisions.
          </p>

          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '30px', borderRadius: '10px', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '15px' }}>
              Financial Wisdom for Business Success
            </h2>
            <p style={{ fontSize: '1.1rem', lineHeight: '1.7', opacity: 0.95 }}>
              Our business banking experts have compiled proven strategies to help you optimize cash flow, access capital, and grow your business with confidence.
            </p>
          </div>

          <h2 style={{ fontSize: '1.8rem', marginBottom: '25px', color: '#1a1a1a' }}>
            Key Business Banking Insights
          </h2>

          <div style={{ display: 'grid', gap: '25px', marginBottom: '50px' }}>
            {insights.map((insight, index) => (
              <div key={index} style={{ background: '#f8f9fa', padding: '30px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '15px' }}>
                  <div style={{ fontSize: '2.5rem' }}>{insight.icon}</div>
                  <h3 style={{ fontSize: '1.5rem', color: '#0066cc', margin: 0 }}>
                    {insight.category}
                  </h3>
                </div>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {insight.tips.map((tip, idx) => (
                    <li key={idx} style={{ marginBottom: '12px', color: '#444', paddingLeft: '25px', position: 'relative', lineHeight: '1.6' }}>
                      <span style={{ position: 'absolute', left: 0, color: '#0066cc', fontWeight: 'bold' }}>✓</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: '1.8rem', marginBottom: '25px', color: '#1a1a1a' }}>
            Business Solutions We Offer
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px', marginBottom: '40px' }}>
            {businessSolutions.map((solution, index) => (
              <div key={index} style={{ background: 'white', border: '2px solid #0066cc', padding: '25px', borderRadius: '10px' }}>
                <h3 style={{ fontSize: '1.3rem', color: '#0066cc', marginBottom: '10px' }}>
                  {solution.title}
                </h3>
                <p style={{ color: '#999', fontSize: '0.9rem', marginBottom: '15px', fontStyle: 'italic' }}>
                  Ideal for: {solution.ideal}
                </p>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {solution.features.map((feature, idx) => (
                    <li key={idx} style={{ marginBottom: '8px', color: '#444', paddingLeft: '20px', position: 'relative', fontSize: '0.95rem' }}>
                      <span style={{ position: 'absolute', left: 0, color: '#2ecc71' }}>●</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '10px', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '20px', color: '#1a1a1a' }}>
              Success Story: How Oakline Bank Helped Local Business Thrive
            </h2>
            <div style={{ background: 'white', padding: '25px', borderRadius: '8px', borderLeft: '4px solid #0066cc' }}>
              <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#444', marginBottom: '15px', fontStyle: 'italic' }}>
                "When we needed to expand our operations, Oakline Bank provided not just financing, but strategic advice that helped us grow sustainably. Their business line of credit gave us the flexibility to seize opportunities while maintaining healthy cash flow."
              </p>
              <p style={{ fontWeight: 'bold', color: '#0066cc', margin: 0 }}>
                — Sarah Martinez, Owner of Martinez Manufacturing
              </p>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '40px', borderRadius: '10px', textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>Ready to Grow Your Business?</h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '25px', opacity: 0.9 }}>
              Partner with Oakline Bank for business banking solutions designed to help you succeed.
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/apply" style={{ background: 'white', color: '#667eea', padding: '15px 30px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold' }}>
                Open Business Account
              </Link>
              <Link href="/support" style={{ background: 'transparent', color: 'white', padding: '15px 30px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold', border: '2px solid white' }}>
                Speak with Business Banker
              </Link>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div style={{ textAlign: 'center', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0066cc', marginBottom: '10px' }}>5,000+</div>
              <p style={{ color: '#666' }}>Small businesses served</p>
            </div>
            <div style={{ textAlign: 'center', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0066cc', marginBottom: '10px' }}>$250M</div>
              <p style={{ color: '#666' }}>In business loans funded</p>
            </div>
            <div style={{ textAlign: 'center', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0066cc', marginBottom: '10px' }}>4.8/5</div>
              <p style={{ color: '#666' }}>Customer satisfaction rating</p>
            </div>
            <div style={{ textAlign: 'center', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0066cc', marginBottom: '10px' }}>24/7</div>
              <p style={{ color: '#666' }}>Business banking support</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

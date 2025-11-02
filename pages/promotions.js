import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import styles from '../styles/Home.module.css';

export default function Promotions() {
  const [activeTab, setActiveTab] = useState('current');

  const currentOffers = [
    {
      id: 1,
      title: '$500 Welcome Bonus',
      subtitle: 'New Checking Account',
      description: 'Open a new checking account and receive a $500 bonus when you set up direct deposit and make qualifying transactions',
      requirements: [
        'Open new checking account',
        'Set up direct deposit of $2,000+ within 90 days',
        'Make 10 debit card purchases within 90 days'
      ],
      expires: 'December 31, 2025',
      color: '#0066cc',
      badge: 'POPULAR'
    },
    {
      id: 2,
      title: '5.50% APY Savings',
      subtitle: 'High-Yield Savings Account',
      description: 'Earn an exceptional 5.50% APY on balances up to $50,000 for the first 6 months',
      requirements: [
        'New savings account holders only',
        'Maintain minimum balance of $10,000',
        'Rate applies to first $50,000'
      ],
      expires: 'March 31, 2025',
      color: '#2ecc71',
      badge: 'LIMITED TIME'
    },
    {
      id: 3,
      title: '0% APR for 18 Months',
      subtitle: 'Balance Transfer Credit Card',
      description: 'Transfer high-interest balances and pay no interest for 18 months',
      requirements: [
        'Good to excellent credit required',
        'Balance transfer within 60 days',
        '3% balance transfer fee applies'
      ],
      expires: 'February 28, 2025',
      color: '#e74c3c',
      badge: 'TRENDING'
    },
    {
      id: 4,
      title: 'Free International Transfers',
      subtitle: 'Global Banking Package',
      description: 'Send money worldwide with zero transfer fees for your first 10 international wire transfers',
      requirements: [
        'Sign up for Global Banking Package',
        'Minimum account balance of $5,000',
        'Offer valid for first 90 days'
      ],
      expires: 'June 30, 2025',
      color: '#9b59b6',
      badge: 'NEW'
    }
  ];

  const seasonalOffers = [
    {
      name: 'Student Banking Package',
      description: 'Free checking, no monthly fees, and a $100 bonus for students',
      season: 'Back to School Special'
    },
    {
      name: 'Holiday Bonus CD',
      description: '6.00% APY on 12-month CDs opened during the holiday season',
      season: 'Holiday Offer'
    },
    {
      name: 'Tax Season Savings',
      description: 'Bonus interest rate when you deposit your tax refund',
      season: 'Spring Promotion'
    }
  ];

  return (
    <div className={styles.container}>
      <Head>
        <title>Current Promotions & Special Offers | Oakline Bank</title>
        <meta name="description" content="Exclusive banking promotions and special offers from Oakline Bank. Welcome bonuses, high-yield rates, and limited-time deals" />
      </Head>

      <main className={styles.main}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
          <Link href="/" style={{ color: '#0066cc', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
            ← Back to Home
          </Link>

          <h1 style={{ fontSize: '2.5rem', marginBottom: '20px', color: '#1a1a1a' }}>
            Current Promotions & Special Offers
          </h1>

          <div style={{ position: 'relative', width: '100%', height: '400px', marginBottom: '40px', borderRadius: '10px', overflow: 'hidden' }}>
            <Image
              src="/images/pages/Bank_promotional_offers_display_883268a6.png"
              alt="Bank promotional offers"
              fill
              style={{ objectFit: 'cover' }}
              priority
            />
          </div>

          <p style={{ fontSize: '1.2rem', lineHeight: '1.8', marginBottom: '40px', color: '#444' }}>
            Take advantage of our exclusive promotions designed to give you more value from your banking relationship. Limited-time offers for new and existing customers.
          </p>

          <div style={{ marginBottom: '30px', borderBottom: '2px solid #e0e0e0' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setActiveTab('current')}
                style={{
                  background: activeTab === 'current' ? '#0066cc' : 'transparent',
                  color: activeTab === 'current' ? 'white' : '#666',
                  border: 'none',
                  padding: '15px 30px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  borderRadius: '5px 5px 0 0',
                  transition: 'all 0.3s'
                }}
              >
                Current Offers
              </button>
              <button
                onClick={() => setActiveTab('seasonal')}
                style={{
                  background: activeTab === 'seasonal' ? '#0066cc' : 'transparent',
                  color: activeTab === 'seasonal' ? 'white' : '#666',
                  border: 'none',
                  padding: '15px 30px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  borderRadius: '5px 5px 0 0',
                  transition: 'all 0.3s'
                }}
              >
                Seasonal Promotions
              </button>
            </div>
          </div>

          {activeTab === 'current' && (
            <div style={{ display: 'grid', gap: '30px', marginBottom: '40px' }}>
              {currentOffers.map((offer) => (
                <div key={offer.id} style={{ background: 'white', border: `3px solid ${offer.color}`, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  <div style={{ background: offer.color, color: 'white', padding: '20px 30px', position: 'relative' }}>
                    {offer.badge && (
                      <span style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.3)', padding: '5px 15px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {offer.badge}
                      </span>
                    )}
                    <h2 style={{ fontSize: '2rem', marginBottom: '5px', margin: 0 }}>{offer.title}</h2>
                    <p style={{ fontSize: '1.1rem', opacity: 0.9, margin: 0 }}>{offer.subtitle}</p>
                  </div>
                  <div style={{ padding: '30px' }}>
                    <p style={{ fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '25px', color: '#444' }}>
                      {offer.description}
                    </p>
                    <div style={{ marginBottom: '25px' }}>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', color: '#1a1a1a', fontWeight: 'bold' }}>Requirements:</h3>
                      <ul style={{ paddingLeft: '20px', color: '#666', lineHeight: '1.8' }}>
                        {offer.requirements.map((req, idx) => (
                          <li key={idx}>{req}</li>
                        ))}
                      </ul>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid #e0e0e0', flexWrap: 'wrap', gap: '15px' }}>
                      <span style={{ color: '#999', fontSize: '0.9rem' }}>
                        Expires: {offer.expires}
                      </span>
                      <Link href="/apply" style={{ background: offer.color, color: 'white', padding: '12px 25px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold' }}>
                        Claim Offer
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'seasonal' && (
            <div style={{ marginBottom: '40px' }}>
              <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '10px', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '15px', color: '#1a1a1a' }}>
                  Seasonal Promotions
                </h2>
                <p style={{ color: '#666', marginBottom: '25px' }}>
                  We offer special promotions throughout the year tied to seasons and events. Check back regularly for new offers!
                </p>
                <div style={{ display: 'grid', gap: '20px' }}>
                  {seasonalOffers.map((offer, index) => (
                    <div key={index} style={{ background: 'white', padding: '25px', borderRadius: '8px', borderLeft: '4px solid #ff9800' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                        <h3 style={{ fontSize: '1.3rem', color: '#1a1a1a', margin: 0 }}>{offer.name}</h3>
                        <span style={{ background: '#ff9800', color: 'white', padding: '5px 15px', borderRadius: '15px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          {offer.season}
                        </span>
                      </div>
                      <p style={{ color: '#666', margin: 0 }}>{offer.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', padding: '40px', borderRadius: '10px', textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>Don't Miss Out on These Exclusive Offers!</h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '25px', opacity: 0.9 }}>
              Our promotions are available for a limited time only. Open an account today to take advantage of these special rates and bonuses.
            </p>
            <Link href="/apply" style={{ background: 'white', color: '#f5576c', padding: '15px 40px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block' }}>
              Apply Now
            </Link>
          </div>

          <div style={{ background: '#e3f2fd', padding: '30px', borderRadius: '10px', borderLeft: '4px solid #2196f3' }}>
            <h3 style={{ color: '#1976d2', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>📧</span> Want to Stay Updated?
            </h3>
            <p style={{ color: '#1565c0', lineHeight: '1.7', marginBottom: '15px' }}>
              Sign up for our promotional emails to be the first to know about new offers, exclusive deals, and limited-time promotions.
            </p>
            <Link href="/signup" style={{ color: '#1976d2', fontWeight: 'bold', textDecoration: 'underline' }}>
              Subscribe to Promotional Emails →
            </Link>
          </div>

          <div style={{ marginTop: '40px', fontSize: '0.85rem', color: '#999', lineHeight: '1.6' }}>
            <p><strong>Terms and Conditions:</strong> All offers are subject to approval and may be withdrawn at any time. Minimum balance and eligibility requirements apply. Fees may apply for certain services. APY = Annual Percentage Yield. Rates and bonuses are subject to change. Please see full terms and conditions for each offer. Member FDIC.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

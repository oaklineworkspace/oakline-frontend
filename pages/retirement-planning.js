import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import styles from '../styles/Home.module.css';

export default function RetirementPlanning() {
  const [age, setAge] = useState('');
  const [currentSavings, setCurrentSavings] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [retirementAge, setRetirementAge] = useState(65);
  const [estimatedResult, setEstimatedResult] = useState(null);

  const calculateRetirement = () => {
    const currentAge = parseInt(age);
    const savings = parseFloat(currentSavings) || 0;
    const monthly = parseFloat(monthlyContribution) || 0;
    const yearsToRetirement = retirementAge - currentAge;
    
    if (yearsToRetirement <= 0) {
      alert('Retirement age must be greater than current age');
      return;
    }

    const annualReturn = 0.07;
    const monthlyReturn = annualReturn / 12;
    const months = yearsToRetirement * 12;

    const futureValue = savings * Math.pow(1 + annualReturn, yearsToRetirement) +
      monthly * ((Math.pow(1 + monthlyReturn, months) - 1) / monthlyReturn);

    setEstimatedResult({
      total: futureValue,
      years: yearsToRetirement,
      contributions: monthly * months
    });
  };

  const retirementAccounts = [
    {
      name: 'Traditional IRA',
      benefits: ['Tax-deductible contributions', 'Tax-deferred growth', 'Contributions up to $7,000/year (2024)'],
      bestFor: 'Those seeking immediate tax benefits'
    },
    {
      name: 'Roth IRA',
      benefits: ['Tax-free withdrawals in retirement', 'No required minimum distributions', 'Contributions with after-tax dollars'],
      bestFor: 'Younger savers expecting higher future tax rates'
    },
    {
      name: '401(k) Plans',
      benefits: ['Employer matching contributions', 'Higher contribution limits ($23,000 in 2024)', 'Automatic payroll deductions'],
      bestFor: 'Employees with employer-sponsored plans'
    },
    {
      name: 'SEP IRA',
      benefits: ['High contribution limits (up to $66,000)', 'Flexible contributions', 'Easy to set up and maintain'],
      bestFor: 'Self-employed and small business owners'
    }
  ];

  return (
    <div className={styles.container}>
      <Head>
        <title>Retirement Planning | Oakline Bank</title>
        <meta name="description" content="Plan your retirement with Oakline Bank. Explore IRAs, 401(k)s, and retirement strategies for a secure financial future" />
      </Head>

      <main className={styles.main}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
          <Link href="/" style={{ color: '#0066cc', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
            ← Back to Home
          </Link>

          <h1 style={{ fontSize: '2.5rem', marginBottom: '20px', color: '#1a1a1a' }}>
            Retirement Planning
          </h1>

          <div style={{ position: 'relative', width: '100%', height: '400px', marginBottom: '40px', borderRadius: '10px', overflow: 'hidden' }}>
            <Image
              src="/images/pages/Happy_retirement_planning_couple_94920a3b.png"
              alt="Retirement planning"
              fill
              style={{ objectFit: 'cover' }}
              priority
            />
          </div>

          <p style={{ fontSize: '1.2rem', lineHeight: '1.8', marginBottom: '40px', color: '#444' }}>
            Your retirement years should be filled with joy, not financial stress. At Oakline Bank, we help you create a comprehensive retirement strategy that ensures you can enjoy the lifestyle you've worked hard to achieve.
          </p>

          <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '10px', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '20px', color: '#1a1a1a' }}>
              Retirement Savings Calculator
            </h2>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              Estimate how much you'll have saved by retirement based on your current situation
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Current Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                  placeholder="30"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Current Savings ($)</label>
                <input
                  type="number"
                  value={currentSavings}
                  onChange={(e) => setCurrentSavings(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                  placeholder="10000"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Monthly Contribution ($)</label>
                <input
                  type="number"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                  placeholder="500"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Retirement Age</label>
                <input
                  type="number"
                  value={retirementAge}
                  onChange={(e) => setRetirementAge(parseInt(e.target.value))}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                  placeholder="65"
                />
              </div>
            </div>

            <button
              onClick={calculateRetirement}
              style={{
                background: '#0066cc',
                color: 'white',
                padding: '12px 30px',
                borderRadius: '5px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem'
              }}
            >
              Calculate Retirement Savings
            </button>

            {estimatedResult && (
              <div style={{ marginTop: '30px', padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h3 style={{ color: '#0066cc', marginBottom: '15px' }}>Your Projected Retirement Savings</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#2ecc71', marginBottom: '10px' }}>
                  ${estimatedResult.total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </div>
                <p style={{ color: '#666', marginBottom: '5px' }}>
                  In {estimatedResult.years} years at retirement
                </p>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>
                  Based on 7% average annual return. Total contributions: ${estimatedResult.contributions.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </p>
              </div>
            )}
          </div>

          <h2 style={{ fontSize: '1.8rem', marginBottom: '20px', color: '#1a1a1a' }}>
            Retirement Account Options
          </h2>

          <div style={{ display: 'grid', gap: '20px', marginBottom: '40px' }}>
            {retirementAccounts.map((account, index) => (
              <div key={index} style={{ background: '#f8f9fa', padding: '25px', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '1.4rem', color: '#0066cc', marginBottom: '10px' }}>
                  {account.name}
                </h3>
                <p style={{ color: '#666', fontSize: '0.95rem', marginBottom: '15px' }}>
                  Best for: {account.bestFor}
                </p>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {account.benefits.map((benefit, idx) => (
                    <li key={idx} style={{ marginBottom: '8px', color: '#444', paddingLeft: '20px', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0 }}>✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{ background: '#0066cc', color: 'white', padding: '40px', borderRadius: '10px', textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>Start Planning Your Retirement Today</h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '25px', opacity: 0.9 }}>
              Our financial advisors are ready to help you create a personalized retirement strategy.
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/apply" style={{ background: 'white', color: '#0066cc', padding: '15px 30px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold' }}>
                Open Retirement Account
              </Link>
              <Link href="/support" style={{ background: 'transparent', color: 'white', padding: '15px 30px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold', border: '2px solid white' }}>
                Speak with an Advisor
              </Link>
            </div>
          </div>

          <div style={{ background: '#fff3cd', padding: '25px', borderRadius: '8px', borderLeft: '4px solid #ffc107' }}>
            <h3 style={{ color: '#856404', marginBottom: '10px' }}>Important Retirement Tips</h3>
            <ul style={{ color: '#856404', lineHeight: '1.8' }}>
              <li>Start saving as early as possible to maximize compound growth</li>
              <li>Take full advantage of employer 401(k) matching - it's free money</li>
              <li>Diversify your retirement portfolio to manage risk</li>
              <li>Review and adjust your retirement plan annually</li>
              <li>Consider healthcare costs in your retirement planning</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

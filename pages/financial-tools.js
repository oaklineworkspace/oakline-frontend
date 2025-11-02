import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import styles from '../styles/Home.module.css';

export default function FinancialTools() {
  const [loanAmount, setLoanAmount] = useState(200000);
  const [interestRate, setInterestRate] = useState(6.5);
  const [loanTerm, setLoanTerm] = useState(30);
  const [monthlyPayment, setMonthlyPayment] = useState(null);

  const [savingsGoal, setSavingsGoal] = useState(10000);
  const [monthlyDeposit, setMonthlyDeposit] = useState(200);
  const [savingsRate, setSavingsRate] = useState(4.5);
  const [timeToGoal, setTimeToGoal] = useState(null);

  const calculateMortgage = () => {
    const principal = parseFloat(loanAmount);
    const monthlyRate = (parseFloat(interestRate) / 100) / 12;
    const numberOfPayments = parseInt(loanTerm) * 12;

    if (monthlyRate === 0) {
      setMonthlyPayment(principal / numberOfPayments);
    } else {
      const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
                     (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
      setMonthlyPayment(payment);
    }
  };

  const calculateSavings = () => {
    const goal = parseFloat(savingsGoal);
    const monthly = parseFloat(monthlyDeposit);
    const rate = parseFloat(savingsRate) / 100 / 12;

    let months = 0;
    let balance = 0;

    while (balance < goal && months < 1200) {
      balance = balance * (1 + rate) + monthly;
      months++;
    }

    setTimeToGoal(months);
  };

  const tools = [
    {
      name: 'Mortgage Calculator',
      description: 'Estimate your monthly mortgage payments based on loan amount, interest rate, and term',
      icon: '🏠',
      link: '#mortgage'
    },
    {
      name: 'Savings Goal Calculator',
      description: 'Calculate how long it will take to reach your savings goals',
      icon: '💰',
      link: '#savings'
    },
    {
      name: 'Retirement Planner',
      description: 'Plan for a comfortable retirement with our comprehensive calculator',
      icon: '🏖️',
      link: '/retirement-planning'
    },
    {
      name: 'Budget Planner',
      description: 'Create a personalized budget to track income and expenses',
      icon: '📊',
      link: '/calculators'
    },
    {
      name: 'Debt Payoff Calculator',
      description: 'Find the fastest way to pay off your debts and save on interest',
      icon: '💳',
      link: '/calculators'
    },
    {
      name: 'Investment Growth',
      description: 'Project investment returns over time with compound interest',
      icon: '📈',
      link: '/calculators'
    }
  ];

  return (
    <div className={styles.container}>
      <Head>
        <title>Financial Tools & Calculators | Oakline Bank</title>
        <meta name="description" content="Free financial calculators and planning tools from Oakline Bank. Mortgage, savings, budget, and retirement calculators" />
      </Head>

      <main className={styles.main}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
          <Link href="/" style={{ color: '#0066cc', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
            ← Back to Home
          </Link>

          <h1 style={{ fontSize: '2.5rem', marginBottom: '20px', color: '#1a1a1a' }}>
            Financial Tools & Calculators
          </h1>

          <div style={{ position: 'relative', width: '100%', height: '400px', marginBottom: '40px', borderRadius: '10px', overflow: 'hidden' }}>
            <Image
              src="/images/pages/Financial_planning_tools_workspace_05f110a9.png"
              alt="Financial planning tools"
              fill
              style={{ objectFit: 'cover' }}
              priority
            />
          </div>

          <p style={{ fontSize: '1.2rem', lineHeight: '1.8', marginBottom: '40px', color: '#444' }}>
            Make informed financial decisions with our free calculators and planning tools. Whether you're buying a home, saving for retirement, or planning your budget, we have the tools to help you succeed.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px', marginBottom: '50px' }}>
            {tools.map((tool, index) => (
              <Link key={index} href={tool.link} style={{ textDecoration: 'none' }}>
                <div style={{ 
                  background: '#f8f9fa', 
                  padding: '30px', 
                  borderRadius: '10px', 
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  height: '100%',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '15px' }}>{tool.icon}</div>
                  <h3 style={{ fontSize: '1.3rem', color: '#0066cc', marginBottom: '10px' }}>
                    {tool.name}
                  </h3>
                  <p style={{ color: '#666', lineHeight: '1.6', margin: 0 }}>
                    {tool.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div id="mortgage" style={{ background: '#f8f9fa', padding: '40px', borderRadius: '10px', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '25px', color: '#1a1a1a' }}>
              🏠 Mortgage Payment Calculator
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '25px', marginBottom: '25px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  Loan Amount ($)
                </label>
                <input
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  Interest Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  Loan Term (years)
                </label>
                <input
                  type="number"
                  value={loanTerm}
                  onChange={(e) => setLoanTerm(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '1rem' }}
                />
              </div>
            </div>
            <button
              onClick={calculateMortgage}
              style={{
                background: '#0066cc',
                color: 'white',
                padding: '15px 40px',
                borderRadius: '5px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem'
              }}
            >
              Calculate Payment
            </button>
            {monthlyPayment && (
              <div style={{ marginTop: '30px', padding: '25px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h3 style={{ color: '#0066cc', marginBottom: '10px' }}>Your Estimated Monthly Payment</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#2ecc71' }}>
                  ${monthlyPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '10px' }}>
                  Total payments: ${(monthlyPayment * loanTerm * 12).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </p>
              </div>
            )}
          </div>

          <div id="savings" style={{ background: '#f8f9fa', padding: '40px', borderRadius: '10px', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '25px', color: '#1a1a1a' }}>
              💰 Savings Goal Calculator
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '25px', marginBottom: '25px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  Savings Goal ($)
                </label>
                <input
                  type="number"
                  value={savingsGoal}
                  onChange={(e) => setSavingsGoal(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  Monthly Deposit ($)
                </label>
                <input
                  type="number"
                  value={monthlyDeposit}
                  onChange={(e) => setMonthlyDeposit(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  Interest Rate (% APY)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={savingsRate}
                  onChange={(e) => setSavingsRate(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '1rem' }}
                />
              </div>
            </div>
            <button
              onClick={calculateSavings}
              style={{
                background: '#2ecc71',
                color: 'white',
                padding: '15px 40px',
                borderRadius: '5px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem'
              }}
            >
              Calculate Time to Goal
            </button>
            {timeToGoal && (
              <div style={{ marginTop: '30px', padding: '25px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h3 style={{ color: '#2ecc71', marginBottom: '10px' }}>Time to Reach Your Goal</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0066cc' }}>
                  {Math.floor(timeToGoal / 12)} years, {timeToGoal % 12} months
                </div>
                <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '10px' }}>
                  Based on {savingsRate}% APY with monthly deposits of ${monthlyDeposit}
                </p>
              </div>
            )}
          </div>

          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '40px', borderRadius: '10px', textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>Ready to Achieve Your Financial Goals?</h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '25px', opacity: 0.9 }}>
              Open an Oakline Bank account today and turn your financial plans into reality with our competitive rates and expert support.
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/apply" style={{ background: 'white', color: '#667eea', padding: '15px 30px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold' }}>
                Open Account
              </Link>
              <Link href="/support" style={{ background: 'transparent', color: 'white', padding: '15px 30px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold', border: '2px solid white' }}>
                Speak with Advisor
              </Link>
            </div>
          </div>

          <div style={{ background: '#fff3cd', padding: '25px', borderRadius: '8px', borderLeft: '4px solid #ffc107' }}>
            <h3 style={{ color: '#856404', marginBottom: '10px' }}>💡 Financial Planning Tips</h3>
            <ul style={{ color: '#856404', lineHeight: '1.8', marginBottom: 0 }}>
              <li>Use these calculators as starting points - consult with a financial advisor for personalized advice</li>
              <li>Actual results may vary based on market conditions and individual circumstances</li>
              <li>Always account for additional costs like taxes, insurance, and fees in your planning</li>
              <li>Review and update your financial plans regularly as your situation changes</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}


import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';

export default function Calculators() {
  const [activeCalculator, setActiveCalculator] = useState('loan');
  const [results, setResults] = useState({});

  const calculateLoan = (principal, rate, years) => {
    const monthlyRate = rate / 100 / 12;
    const numPayments = years * 12;
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    const totalPayment = monthlyPayment * numPayments;
    const totalInterest = totalPayment - principal;
    
    return {
      monthlyPayment: monthlyPayment.toFixed(2),
      totalPayment: totalPayment.toFixed(2),
      totalInterest: totalInterest.toFixed(2)
    };
  };

  const calculateSavings = (monthly, rate, years) => {
    const monthlyRate = rate / 100 / 12;
    const numPayments = years * 12;
    const futureValue = monthly * (Math.pow(1 + monthlyRate, numPayments) - 1) / monthlyRate;
    const totalContributions = monthly * numPayments;
    const interestEarned = futureValue - totalContributions;
    
    return {
      futureValue: futureValue.toFixed(2),
      totalContributions: totalContributions.toFixed(2),
      interestEarned: interestEarned.toFixed(2)
    };
  };

  const calculateMortgage = (principal, rate, years, downPayment) => {
    const loanAmount = principal - downPayment;
    const monthlyRate = rate / 100 / 12;
    const numPayments = years * 12;
    const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    const totalPayment = monthlyPayment * numPayments;
    const totalInterest = totalPayment - loanAmount;
    
    return {
      loanAmount: loanAmount.toFixed(2),
      monthlyPayment: monthlyPayment.toFixed(2),
      totalPayment: totalPayment.toFixed(2),
      totalInterest: totalInterest.toFixed(2)
    };
  };

  const calculateRetirement = (currentAge, retirementAge, currentSavings, monthlyContribution, expectedReturn) => {
    const yearsToRetirement = retirementAge - currentAge;
    const monthlyRate = expectedReturn / 100 / 12;
    const numPayments = yearsToRetirement * 12;
    
    // Future value of current savings
    const currentSavingsFV = currentSavings * Math.pow(1 + monthlyRate, numPayments);
    
    // Future value of monthly contributions
    const contributionsFV = monthlyContribution * (Math.pow(1 + monthlyRate, numPayments) - 1) / monthlyRate;
    
    const totalRetirement = currentSavingsFV + contributionsFV;
    const totalContributions = currentSavings + (monthlyContribution * numPayments);
    const totalInterest = totalRetirement - totalContributions;
    
    return {
      totalRetirement: totalRetirement.toFixed(2),
      totalContributions: totalContributions.toFixed(2),
      totalInterest: totalInterest.toFixed(2),
      yearsToRetirement
    };
  };

  const calculators = {
    loan: {
      title: 'Loan Calculator',
      description: 'Calculate monthly payments for personal loans, auto loans, and more.',
      icon: '💰',
      fields: [
        { name: 'principal', label: 'Loan Amount ($)', type: 'number', placeholder: '10000' },
        { name: 'rate', label: 'Interest Rate (%)', type: 'number', placeholder: '5.5', step: '0.01' },
        { name: 'years', label: 'Loan Term (years)', type: 'number', placeholder: '5' }
      ],
      calculate: (values) => calculateLoan(Number(values.principal), Number(values.rate), Number(values.years))
    },
    mortgage: {
      title: 'Mortgage Calculator',
      description: 'Calculate monthly mortgage payments and total interest.',
      icon: '🏠',
      fields: [
        { name: 'principal', label: 'Home Price ($)', type: 'number', placeholder: '300000' },
        { name: 'downPayment', label: 'Down Payment ($)', type: 'number', placeholder: '60000' },
        { name: 'rate', label: 'Interest Rate (%)', type: 'number', placeholder: '3.5', step: '0.01' },
        { name: 'years', label: 'Loan Term (years)', type: 'number', placeholder: '30' }
      ],
      calculate: (values) => calculateMortgage(Number(values.principal), Number(values.rate), Number(values.years), Number(values.downPayment))
    },
    savings: {
      title: 'Savings Calculator',
      description: 'See how your savings will grow over time with compound interest.',
      icon: '🏦',
      fields: [
        { name: 'monthly', label: 'Monthly Deposit ($)', type: 'number', placeholder: '500' },
        { name: 'rate', label: 'Annual Interest Rate (%)', type: 'number', placeholder: '4.0', step: '0.01' },
        { name: 'years', label: 'Time Period (years)', type: 'number', placeholder: '10' }
      ],
      calculate: (values) => calculateSavings(Number(values.monthly), Number(values.rate), Number(values.years))
    },
    retirement: {
      title: 'Retirement Calculator',
      description: 'Plan for your retirement with this comprehensive calculator.',
      icon: '🏖️',
      fields: [
        { name: 'currentAge', label: 'Current Age', type: 'number', placeholder: '30' },
        { name: 'retirementAge', label: 'Retirement Age', type: 'number', placeholder: '65' },
        { name: 'currentSavings', label: 'Current Savings ($)', type: 'number', placeholder: '10000' },
        { name: 'monthlyContribution', label: 'Monthly Contribution ($)', type: 'number', placeholder: '500' },
        { name: 'expectedReturn', label: 'Expected Annual Return (%)', type: 'number', placeholder: '7.0', step: '0.1' }
      ],
      calculate: (values) => calculateRetirement(Number(values.currentAge), Number(values.retirementAge), Number(values.currentSavings), Number(values.monthlyContribution), Number(values.expectedReturn))
    }
  };

  const handleCalculate = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const values = {};
    for (let [key, value] of formData.entries()) {
      values[key] = value;
    }
    
    const result = calculators[activeCalculator].calculate(values);
    setResults(prev => ({ ...prev, [activeCalculator]: result }));
  };

  return (
    <>
      <Head>
        <title>Financial Calculators - Oakline Bank</title>
        <meta name="description" content="Use our free financial calculators to plan your loans, mortgage, savings, and retirement." />
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
            <h1 style={styles.heroTitle}>Financial Calculators</h1>
            <p style={styles.heroSubtitle}>
              Make informed financial decisions with our comprehensive suite of calculators.
            </p>
          </div>
        </section>

        {/* Main Content */}
        <main style={styles.main}>
          {/* Calculator Navigation */}
          <section style={styles.calculatorNav}>
            <div style={styles.navGrid}>
              {Object.entries(calculators).map(([key, calc]) => (
                <button
                  key={key}
                  onClick={() => setActiveCalculator(key)}
                  style={{
                    ...styles.navButton,
                    ...(activeCalculator === key ? styles.activeNavButton : {})
                  }}
                >
                  <span style={styles.navIcon}>{calc.icon}</span>
                  <h3 style={styles.navTitle}>{calc.title}</h3>
                  <p style={styles.navDesc}>{calc.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Active Calculator */}
          <section style={styles.calculatorSection}>
            <div style={styles.calculatorContainer}>
              <div style={styles.calculatorForm}>
                <h2 style={styles.calculatorTitle}>
                  {calculators[activeCalculator].icon} {calculators[activeCalculator].title}
                </h2>
                <form onSubmit={handleCalculate} style={styles.form}>
                  <div style={styles.formGrid}>
                    {calculators[activeCalculator].fields.map((field, index) => (
                      <div key={index} style={styles.formGroup}>
                        <label style={styles.label}>{field.label}</label>
                        <input
                          type={field.type}
                          name={field.name}
                          placeholder={field.placeholder}
                          step={field.step}
                          style={styles.input}
                          required
                        />
                      </div>
                    ))}
                  </div>
                  <button type="submit" style={styles.calculateButton}>
                    Calculate
                  </button>
                </form>
              </div>

              {/* Results */}
              {results[activeCalculator] && (
                <div style={styles.resultsContainer}>
                  <h3 style={styles.resultsTitle}>Results</h3>
                  <div style={styles.resultsGrid}>
                    {Object.entries(results[activeCalculator]).map(([key, value]) => (
                      <div key={key} style={styles.resultItem}>
                        <span style={styles.resultLabel}>
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                        </span>
                        <span style={styles.resultValue}>
                          {key.includes('Rate') || key.includes('Years') ? value : `$${Number(value).toLocaleString()}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Tips Section */}
          <section style={styles.tipsSection}>
            <h2 style={styles.tipsTitle}>Financial Planning Tips</h2>
            <div style={styles.tipsGrid}>
              <div style={styles.tipCard}>
                <h3 style={styles.tipTitle}>📊 Loan Tips</h3>
                <ul style={styles.tipList}>
                  <li>Shop around for the best rates</li>
                  <li>Consider shorter terms to save on interest</li>
                  <li>Make extra payments toward principal</li>
                  <li>Check your credit score before applying</li>
                </ul>
              </div>
              
              <div style={styles.tipCard}>
                <h3 style={styles.tipTitle}>💰 Savings Tips</h3>
                <ul style={styles.tipList}>
                  <li>Start saving early to benefit from compound interest</li>
                  <li>Automate your savings contributions</li>
                  <li>Look for high-yield savings accounts</li>
                  <li>Set specific savings goals</li>
                </ul>
              </div>
              
              <div style={styles.tipCard}>
                <h3 style={styles.tipTitle}>🏠 Mortgage Tips</h3>
                <ul style={styles.tipList}>
                  <li>Save at least 20% for down payment</li>
                  <li>Get pre-approved before house hunting</li>
                  <li>Consider total monthly housing costs</li>
                  <li>Factor in property taxes and insurance</li>
                </ul>
              </div>
              
              <div style={styles.tipCard}>
                <h3 style={styles.tipTitle}>🏖️ Retirement Tips</h3>
                <ul style={styles.tipList}>
                  <li>Start retirement planning in your 20s</li>
                  <li>Take advantage of employer 401(k) matching</li>
                  <li>Consider both traditional and Roth IRAs</li>
                  <li>Review and adjust regularly</li>
                </ul>
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
            <p style={styles.disclaimerText}>
              Calculators are for estimation purposes only. Actual terms may vary.
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
  calculatorNav: {
    padding: '2rem 0'
  },
  navGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem'
  },
  navButton: {
    backgroundColor: 'white',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1.5rem',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.3s ease'
  },
  activeNavButton: {
    borderColor: '#1a365d',
    backgroundColor: '#f8fafc'
  },
  navIcon: {
    fontSize: '2rem',
    display: 'block',
    marginBottom: '0.5rem'
  },
  navTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#1a365d',
    margin: '0 0 0.5rem 0'
  },
  navDesc: {
    color: '#64748b',
    fontSize: '0.9rem',
    margin: 0
  },
  calculatorSection: {
    padding: '2rem 0'
  },
  calculatorContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2rem',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr'
    }
  },
  calculatorForm: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  calculatorTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '1.5rem'
  },
  form: {
    width: '100%'
  },
  formGrid: {
    display: 'grid',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#374151'
  },
  input: {
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.3s ease'
  },
  calculateButton: {
    width: '100%',
    padding: '1rem',
    backgroundColor: '#1a365d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  resultsContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  resultsTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '1.5rem'
  },
  resultsGrid: {
    display: 'grid',
    gap: '1rem'
  },
  resultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '8px'
  },
  resultLabel: {
    fontSize: '0.9rem',
    color: '#64748b',
    fontWeight: '500'
  },
  resultValue: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#1a365d'
  },
  tipsSection: {
    padding: '3rem 0'
  },
  tipsTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1a365d',
    textAlign: 'center',
    marginBottom: '2rem'
  },
  tipsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem'
  },
  tipCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  tipTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '1rem'
  },
  tipList: {
    margin: 0,
    paddingLeft: '1rem'
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
    fontSize: '0.9rem',
    marginBottom: '0.5rem'
  },
  disclaimerText: {
    color: '#a0aec0',
    fontSize: '0.8rem'
  }
};

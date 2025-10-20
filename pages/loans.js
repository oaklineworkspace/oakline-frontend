
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

export default function Loans() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLoanType, setSelectedLoanType] = useState('');
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [loanCalculator, setLoanCalculator] = useState({
    amount: 25000,
    rate: 6.99,
    term: 5,
    monthlyPayment: 0
  });
  const [applicationData, setApplicationData] = useState({
    loanType: '',
    amount: '',
    purpose: '',
    income: '',
    employment: '',
    creditScore: ''
  });
  const router = useRouter();

  useEffect(() => {
    checkUser();
    calculatePayment();
  }, []);

  useEffect(() => {
    calculatePayment();
  }, [loanCalculator.amount, loanCalculator.rate, loanCalculator.term]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/sign-in');
        return;
      }
      setUser(user);
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePayment = () => {
    const principal = loanCalculator.amount;
    const monthlyRate = loanCalculator.rate / 100 / 12;
    const numPayments = loanCalculator.term * 12;
    
    if (monthlyRate === 0) {
      setLoanCalculator(prev => ({ ...prev, monthlyPayment: principal / numPayments }));
      return;
    }
    
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                          (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    setLoanCalculator(prev => ({ ...prev, monthlyPayment: monthlyPayment }));
  };

  const loanTypes = [
    {
      id: 'home_mortgage',
      title: 'Home Mortgage',
      icon: '🏠',
      rate: '6.75% - 8.25%',
      amount: '$50,000 - $1,500,000',
      term: '15 - 30 years',
      description: 'Finance your dream home with competitive rates and flexible terms',
      features: ['No PMI with 20% down', 'Fixed and adjustable rates', 'First-time buyer programs', 'Online pre-approval'],
      highlight: 'Most Popular',
      color: '#10b981'
    },
    {
      id: 'auto_loan',
      title: 'Auto Loan',
      icon: '🚗',
      rate: '4.99% - 12.99%',
      amount: '$5,000 - $100,000',
      term: '2 - 7 years',
      description: 'Drive away with confidence with our competitive auto financing',
      features: ['New and used vehicles', 'Same-day approval', 'No prepayment penalty', 'Refinancing available'],
      highlight: 'Quick Approval',
      color: '#3b82f6'
    },
    {
      id: 'personal_loan',
      title: 'Personal Loan',
      icon: '💰',
      rate: '7.99% - 24.99%',
      amount: '$1,000 - $50,000',
      term: '2 - 7 years',
      description: 'Flexible financing for life\'s important moments',
      features: ['No collateral required', 'Fixed monthly payments', 'Debt consolidation', 'Quick funding'],
      highlight: 'No Collateral',
      color: '#8b5cf6'
    },
    {
      id: 'business_loan',
      title: 'Business Loan',
      icon: '🏢',
      rate: '5.99% - 18.99%',
      amount: '$10,000 - $500,000',
      term: '1 - 10 years',
      description: 'Fuel your business growth with our commercial lending solutions',
      features: ['Equipment financing', 'Working capital', 'SBA loans', 'Lines of credit'],
      highlight: 'SBA Approved',
      color: '#f59e0b'
    },
    {
      id: 'student_loan',
      title: 'Student Loan',
      icon: '🎓',
      rate: '4.99% - 11.99%',
      amount: 'Up to $200,000',
      term: '5 - 20 years',
      description: 'Invest in your future with education financing',
      features: ['Undergraduate & graduate', 'Competitive rates', 'Flexible repayment', 'No origination fees'],
      highlight: 'Education First',
      color: '#06b6d4'
    },
    {
      id: 'heloc',
      title: 'Home Equity Line',
      icon: '🏡',
      rate: '7.25% - 10.50%',
      amount: 'Up to 80% LTV',
      term: '10 - 30 years',
      description: 'Access your home\'s equity with a flexible credit line',
      features: ['Interest-only payments', 'Revolving credit', 'No closing costs', 'Tax advantages'],
      highlight: 'Flexible Access',
      color: '#ef4444'
    }
  ];

  const handleLoanApplication = (loanType) => {
    setSelectedLoanType(loanType);
    setApplicationData({ ...applicationData, loanType: loanType.id });
    setShowApplicationModal(true);
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    console.log('Loan application submitted:', applicationData);
    setShowApplicationModal(false);
    alert('Thank you! Your loan application has been submitted. Our loan specialists will contact you within 24 hours to discuss next steps.');
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading loan products...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.title}>🏦 Loans & Financing</h1>
          <button 
            style={styles.menuButton}
            onClick={() => router.push('/main-menu')}
          >
            ☰
          </button>
        </div>
        <div style={styles.headerActions}>
          <button 
            style={styles.backButton}
            onClick={() => router.push('/dashboard')}
          >
            ← Dashboard
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div style={styles.heroSection}>
        <div style={styles.heroContent}>
          <h2 style={styles.heroTitle}>Turn Your Dreams Into Reality</h2>
          <p style={styles.heroSubtitle}>
            From home ownership to business expansion, we have the right loan for your goals
          </p>
          <div style={styles.heroStats}>
            <div style={styles.heroStat}>
              <span style={styles.statNumber}>$2.5B+</span>
              <span style={styles.statLabel}>Loans Funded</span>
            </div>
            <div style={styles.heroStat}>
              <span style={styles.statNumber}>24hrs</span>
              <span style={styles.statLabel}>Avg. Approval</span>
            </div>
            <div style={styles.heroStat}>
              <span style={styles.statNumber}>4.9★</span>
              <span style={styles.statLabel}>Customer Rating</span>
            </div>
          </div>
        </div>
      </div>

      {/* Loan Calculator */}
      <div style={styles.calculatorCard}>
        <h3 style={styles.calculatorTitle}>💡 Quick Loan Calculator</h3>
        <div style={styles.calculatorGrid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Loan Amount</label>
            <input 
              type="range"
              min="1000"
              max="500000"
              step="1000"
              value={loanCalculator.amount}
              onChange={(e) => setLoanCalculator({...loanCalculator, amount: parseInt(e.target.value)})}
              style={styles.slider}
            />
            <span style={styles.sliderValue}>${loanCalculator.amount.toLocaleString()}</span>
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Interest Rate (%)</label>
            <input 
              type="range"
              min="3"
              max="25"
              step="0.25"
              value={loanCalculator.rate}
              onChange={(e) => setLoanCalculator({...loanCalculator, rate: parseFloat(e.target.value)})}
              style={styles.slider}
            />
            <span style={styles.sliderValue}>{loanCalculator.rate}%</span>
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Term (Years)</label>
            <input 
              type="range"
              min="1"
              max="30"
              step="1"
              value={loanCalculator.term}
              onChange={(e) => setLoanCalculator({...loanCalculator, term: parseInt(e.target.value)})}
              style={styles.slider}
            />
            <span style={styles.sliderValue}>{loanCalculator.term} years</span>
          </div>
          <div style={styles.paymentResult}>
            <label style={styles.label}>Monthly Payment</label>
            <div style={styles.paymentAmount}>
              ${loanCalculator.monthlyPayment.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Loan Types Grid */}
      <div style={styles.loansSection}>
        <h3 style={styles.sectionTitle}>Choose Your Loan Type</h3>
        <div style={styles.loansGrid}>
          {loanTypes.map(loan => (
            <div key={loan.id} style={{...styles.loanCard, borderTop: `4px solid ${loan.color}`}}>
              {loan.highlight && (
                <div style={{...styles.highlight, backgroundColor: loan.color}}>
                  {loan.highlight}
                </div>
              )}
              
              <div style={styles.loanHeader}>
                <span style={styles.loanIcon}>{loan.icon}</span>
                <h4 style={styles.loanTitle}>{loan.title}</h4>
              </div>
              
              <p style={styles.loanDescription}>{loan.description}</p>
              
              <div style={styles.loanInfo}>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Rate:</span>
                  <span style={styles.infoValue}>{loan.rate}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Amount:</span>
                  <span style={styles.infoValue}>{loan.amount}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Term:</span>
                  <span style={styles.infoValue}>{loan.term}</span>
                </div>
              </div>

              <div style={styles.features}>
                {loan.features.map((feature, index) => (
                  <div key={index} style={styles.feature}>
                    <span style={styles.checkIcon}>✅</span>
                    <span style={styles.featureText}>{feature}</span>
                  </div>
                ))}
              </div>

              <button 
                style={{...styles.applyButton, backgroundColor: loan.color}}
                onClick={() => handleLoanApplication(loan)}
              >
                Apply Now - Get Pre-Approved
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Application Modal */}
      {showApplicationModal && (
        <div style={styles.modal} onClick={() => setShowApplicationModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Apply for {selectedLoanType.title}</h3>
              <button 
                style={styles.closeButton}
                onClick={() => setShowApplicationModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitApplication}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Requested Amount *</label>
                  <input
                    type="number"
                    style={styles.formInput}
                    value={applicationData.amount}
                    onChange={e => setApplicationData({...applicationData, amount: e.target.value})}
                    placeholder="Enter loan amount"
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Purpose of Loan *</label>
                  <input
                    type="text"
                    style={styles.formInput}
                    value={applicationData.purpose}
                    onChange={e => setApplicationData({...applicationData, purpose: e.target.value})}
                    placeholder="e.g., Home purchase, debt consolidation"
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Annual Income *</label>
                  <input
                    type="number"
                    style={styles.formInput}
                    value={applicationData.income}
                    onChange={e => setApplicationData({...applicationData, income: e.target.value})}
                    placeholder="Your yearly income"
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Employment Status *</label>
                  <select
                    style={styles.formInput}
                    value={applicationData.employment}
                    onChange={e => setApplicationData({...applicationData, employment: e.target.value})}
                    required
                  >
                    <option value="">Select employment status</option>
                    <option value="full_time">Full-time Employee</option>
                    <option value="part_time">Part-time Employee</option>
                    <option value="self_employed">Self-employed</option>
                    <option value="contractor">Independent Contractor</option>
                    <option value="retired">Retired</option>
                    <option value="student">Student</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Estimated Credit Score</label>
                  <select
                    style={styles.formInput}
                    value={applicationData.creditScore}
                    onChange={e => setApplicationData({...applicationData, creditScore: e.target.value})}
                  >
                    <option value="">Select credit range</option>
                    <option value="excellent">Excellent (750+)</option>
                    <option value="good">Good (650-749)</option>
                    <option value="fair">Fair (550-649)</option>
                    <option value="poor">Poor (Below 550)</option>
                    <option value="unknown">Don't know</option>
                  </select>
                </div>
              </div>

              <div style={styles.disclaimer}>
                <p style={styles.disclaimerText}>
                  By submitting this application, you authorize Oakline Bank to perform a credit check and verify your information.
                </p>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowApplicationModal(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.submitButton}
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    padding: '20px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0
  },
  menuButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    padding: '10px 15px',
    borderRadius: '8px',
    fontSize: '18px',
    cursor: 'pointer'
  },
  headerActions: {
    display: 'flex',
    gap: '10px'
  },
  backButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '70vh',
    color: '#64748b'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '15px'
  },
  heroSection: {
    background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%)',
    color: 'white',
    padding: '40px 20px',
    textAlign: 'center'
  },
  heroContent: {
    maxWidth: '800px',
    margin: '0 auto'
  },
  heroTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '0 0 15px 0'
  },
  heroSubtitle: {
    fontSize: '18px',
    opacity: 0.9,
    margin: '0 0 30px 0'
  },
  heroStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    maxWidth: '500px',
    margin: '0 auto'
  },
  heroStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#fbbf24'
  },
  statLabel: {
    fontSize: '14px',
    opacity: 0.8
  },
  calculatorCard: {
    backgroundColor: 'white',
    margin: '20px',
    borderRadius: '16px',
    padding: '25px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  calculatorTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 20px 0',
    textAlign: 'center'
  },
  calculatorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  slider: {
    width: '100%',
    height: '8px',
    borderRadius: '4px',
    background: '#e5e7eb',
    outline: 'none',
    cursor: 'pointer'
  },
  sliderValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1e40af',
    textAlign: 'center'
  },
  paymentResult: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  paymentAmount: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#10b981',
    padding: '15px',
    backgroundColor: '#ecfdf5',
    borderRadius: '12px',
    border: '2px solid #bbf7d0',
    textAlign: 'center',
    marginTop: '8px'
  },
  loansSection: {
    padding: '20px'
  },
  sectionTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    margin: '0 0 30px 0'
  },
  loansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '20px'
  },
  loanCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '25px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    position: 'relative',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    animation: 'fadeIn 0.6s ease forwards'
  },
  highlight: {
    position: 'absolute',
    top: '-1px',
    right: '20px',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '0 0 8px 8px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  loanHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '15px'
  },
  loanIcon: {
    fontSize: '32px'
  },
  loanTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  loanDescription: {
    color: '#64748b',
    marginBottom: '20px',
    fontSize: '15px',
    lineHeight: '1.6'
  },
  loanInfo: {
    marginBottom: '20px'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #f1f5f9'
  },
  infoLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500'
  },
  infoValue: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: '700'
  },
  features: {
    marginBottom: '25px'
  },
  feature: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px'
  },
  checkIcon: {
    fontSize: '14px'
  },
  featureText: {
    fontSize: '14px',
    color: '#374151'
  },
  applyButton: {
    width: '100%',
    padding: '15px',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '16px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '25px',
    borderBottom: '1px solid #e9ecef'
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
    color: '#1e293b'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#64748b',
    padding: '5px'
  },
  formGrid: {
    padding: '25px',
    display: 'grid',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  formLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  formInput: {
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    transition: 'border-color 0.3s ease'
  },
  disclaimer: {
    padding: '0 25px',
    marginBottom: '15px'
  },
  disclaimerText: {
    fontSize: '12px',
    color: '#64748b',
    lineHeight: '1.5',
    textAlign: 'center',
    margin: 0
  },
  modalActions: {
    display: 'flex',
    gap: '15px',
    padding: '25px'
  },
  cancelButton: {
    flex: 1,
    padding: '15px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  submitButton: {
    flex: 1,
    padding: '15px',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer'
  }
};

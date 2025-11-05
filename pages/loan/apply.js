
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

function LoanApplicationContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [accounts, setAccounts] = useState([]);
  const [loanTypes, setLoanTypes] = useState([]);
  const [selectedLoanTypeData, setSelectedLoanTypeData] = useState(null);
  const [formData, setFormData] = useState({
    loan_type: '',
    principal: '',
    term_months: '',
    purpose: '',
    interest_rate: '',
    collateral_description: '',
    deposit_method: 'balance'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);
  const [depositAmount, setDepositAmount] = useState(0);
  const [hasActiveLoan, setHasActiveLoan] = useState(false);
  const [creditScore, setCreditScore] = useState(null);
  const DEPOSIT_PERCENTAGE = 0.10;

  useEffect(() => {
    fetchBankDetails();
    fetchLoanTypes();
    if (user) {
      fetchUserAccounts();
      checkActiveLoan();
      fetchCreditScore();
    }
  }, [user]);

  useEffect(() => {
    if (formData.principal) {
      const required = parseFloat(formData.principal) * DEPOSIT_PERCENTAGE;
      setDepositAmount(required);
    }
  }, [formData.principal]);

  const fetchCreditScore = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_scores')
        .select('score, score_source, score_reason')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setCreditScore(data);
      }
    } catch (err) {
      console.error('Error fetching credit score:', err);
    }
  };

  const fetchLoanTypes = async () => {
    try {
      setFetchingData(true);
      const { data: typesData, error: typesError } = await supabase
        .from('loan_types')
        .select(`
          id,
          name,
          description,
          min_amount,
          max_amount,
          loan_interest_rates (
            id,
            rate,
            apr,
            min_term_months,
            max_term_months
          )
        `)
        .order('name', { ascending: true });

      if (typesError) {
        console.error('Error fetching loan types:', typesError);
        setError('Failed to load loan types. Please refresh the page.');
        setFetchingData(false);
        return;
      }

      if (typesData && typesData.length > 0) {
        const formattedTypes = typesData.map(type => ({
          id: type.id,
          value: type.name.toLowerCase().replace(/\s+/g, '_'),
          label: type.name,
          desc: type.description || `Apply for a ${type.name.toLowerCase()}`,
          minAmount: parseFloat(type.min_amount) || 1000,
          maxAmount: parseFloat(type.max_amount) || 5000000,
          rates: Array.isArray(type.loan_interest_rates) ? type.loan_interest_rates.map(r => ({
            rate: parseFloat(r.rate),
            apr: parseFloat(r.apr),
            min_term_months: parseInt(r.min_term_months),
            max_term_months: parseInt(r.max_term_months)
          })) : [],
          icon: getLoanTypeIcon(type.name)
        }));
        setLoanTypes(formattedTypes);
      } else {
        console.warn('No loan types found in database, using defaults');
        setLoanTypes(getDefaultLoanTypes());
      }
    } catch (err) {
      console.error('Error in fetchLoanTypes:', err);
      setLoanTypes(getDefaultLoanTypes());
    } finally {
      setFetchingData(false);
    }
  };

  const getLoanTypeIcon = (name) => {
    const nameLC = name.toLowerCase();
    if (nameLC.includes('personal')) return '👤';
    if (nameLC.includes('home') || nameLC.includes('mortgage')) return '🏠';
    if (nameLC.includes('auto') || nameLC.includes('car') || nameLC.includes('vehicle')) return '🚗';
    if (nameLC.includes('business')) return '🏢';
    if (nameLC.includes('student') || nameLC.includes('education')) return '🎓';
    if (nameLC.includes('equity')) return '🏡';
    return '💰';
  };

  const getDefaultLoanTypes = () => [
    { 
      id: '1', value: 'personal', label: 'Personal Loan', 
      rates: [{ rate: 6.99, apr: 6.99, min_term_months: 12, max_term_months: 84 }],
      icon: '👤', desc: 'Perfect for debt consolidation, home improvements, or major purchases',
      minAmount: 1000, maxAmount: 50000
    },
    { 
      id: '2', value: 'home_mortgage', label: 'Home Mortgage', 
      rates: [{ rate: 7.25, apr: 7.25, min_term_months: 180, max_term_months: 360 }],
      icon: '🏠', desc: 'Fixed and adjustable-rate mortgages for your dream home',
      minAmount: 50000, maxAmount: 5000000
    },
    { 
      id: '3', value: 'auto_loan', label: 'Auto Loan', 
      rates: [{ rate: 5.99, apr: 5.99, min_term_months: 24, max_term_months: 72 }],
      icon: '🚗', desc: 'Finance new or used vehicles with competitive rates',
      minAmount: 5000, maxAmount: 100000
    },
    { 
      id: '4', value: 'business', label: 'Business Loan', 
      rates: [{ rate: 8.50, apr: 8.50, min_term_months: 12, max_term_months: 120 }],
      icon: '🏢', desc: 'Expand your business with flexible financing options',
      minAmount: 10000, maxAmount: 500000
    },
    { 
      id: '5', value: 'student', label: 'Student Loan', 
      rates: [{ rate: 4.99, apr: 4.99, min_term_months: 120, max_term_months: 240 }],
      icon: '🎓', desc: 'Invest in education with competitive student loan rates',
      minAmount: 1000, maxAmount: 100000
    },
    { 
      id: '6', value: 'home_equity', label: 'Home Equity Loan', 
      rates: [{ rate: 7.50, apr: 7.50, min_term_months: 60, max_term_months: 360 }],
      icon: '🏡', desc: 'Leverage your home equity for major expenses',
      minAmount: 10000, maxAmount: 500000
    }
  ];

  const fetchBankDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_details')
        .select('*')
        .limit(1)
        .single();

      if (!error && data) {
        setBankDetails(data);
      }
    } catch (err) {
      console.error('Error fetching bank details:', err);
    }
  };

  const fetchUserAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!error && data) {
        setAccounts(data);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  const checkActiveLoan = async () => {
    try {
      const { data, error } = await supabase
        .from('loans')
        .select('id, status')
        .eq('user_id', user.id)
        .in('status', ['pending_deposit', 'under_review', 'active', 'approved']);

      if (!error && data && data.length > 0) {
        setHasActiveLoan(true);
      }
    } catch (err) {
      console.error('Error checking active loans:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'loan_type') {
      const selectedLoan = loanTypes.find(lt => lt.value === value);
      if (selectedLoan) {
        setSelectedLoanTypeData(selectedLoan);
        const rates = selectedLoan.rates || [];
        if (rates.length > 0) {
          const defaultRate = rates[0].apr || rates[0].rate;
          setFormData(prev => ({ 
            ...prev, 
            interest_rate: defaultRate.toString(),
            loan_type: value,
            // Reset term if it's outside the allowed range
            term_months: prev.term_months && 
                         parseInt(prev.term_months) >= rates[0].min_term_months && 
                         parseInt(prev.term_months) <= rates[0].max_term_months 
                         ? prev.term_months 
                         : ''
          }));
        } else {
          // No rates available, keep loan type but clear rate
          setFormData(prev => ({ 
            ...prev, 
            loan_type: value,
            interest_rate: ''
          }));
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!user) {
        setError('You must be logged in to apply for a loan');
        setLoading(false);
        return;
      }

      if (hasActiveLoan) {
        setError('You already have an active or pending loan. Please complete your existing loan before applying for a new one.');
        setLoading(false);
        return;
      }

      if (accounts.length === 0) {
        setError('You must have an active account to apply for a loan');
        setLoading(false);
        return;
      }

      if (selectedLoanTypeData) {
        const principal = parseFloat(formData.principal);
        if (principal < selectedLoanTypeData.minAmount) {
          setError(`Minimum loan amount for ${selectedLoanTypeData.label} is $${selectedLoanTypeData.minAmount.toLocaleString()}`);
          setLoading(false);
          return;
        }
        if (principal > selectedLoanTypeData.maxAmount) {
          setError(`Maximum loan amount for ${selectedLoanTypeData.label} is $${selectedLoanTypeData.maxAmount.toLocaleString()}`);
          setLoading(false);
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        setLoading(false);
        return;
      }

      const principal = parseFloat(formData.principal);
      const requiredDeposit = principal * DEPOSIT_PERCENTAGE;

      const response = await fetch('/api/loan/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          loan_type: formData.loan_type,
          principal: principal,
          term_months: parseInt(formData.term_months),
          purpose: formData.purpose,
          interest_rate: parseFloat(formData.interest_rate),
          collateral_description: formData.collateral_description,
          deposit_required: requiredDeposit,
          deposit_method: formData.deposit_method,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit loan application');
      }

      setSuccessData({
        loanId: data.loan.id,
        amount: requiredDeposit,
        loanType: formData.loan_type
      });
      setSuccess('success');

    } catch (err) {
      setError(err.message || 'An error occurred while submitting your application');
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyPayment = () => {
    if (!formData.principal || !formData.interest_rate || !formData.term_months) {
      return 0;
    }

    const principal = parseFloat(formData.principal);
    const monthlyRate = parseFloat(formData.interest_rate) / 100 / 12;
    const numPayments = parseInt(formData.term_months);

    if (monthlyRate === 0) {
      return (principal / numPayments).toFixed(2);
    }

    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                          (Math.pow(1 + monthlyRate, numPayments) - 1);

    return monthlyPayment.toFixed(2);
  };

  const calculateTotalInterest = () => {
    if (!formData.principal || !formData.interest_rate || !formData.term_months) {
      return 0;
    }
    const monthlyPayment = parseFloat(calculateMonthlyPayment());
    const totalRepayment = monthlyPayment * parseInt(formData.term_months);
    const totalInterest = totalRepayment - parseFloat(formData.principal);
    return totalInterest.toFixed(2);
  };

  const accountBalance = accounts.length > 0 ? parseFloat(accounts[0].balance) : 0;
  const hasSufficientBalance = accountBalance >= depositAmount;

  if (success === 'success' && successData) {
    return (
      <div style={styles.successModalOverlay}>
        <div style={styles.successModalContainer}>
          <div style={styles.successModalContent}>
            <div style={styles.successCheckmark}>
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="38" stroke="#10b981" strokeWidth="4" fill="#f0fdf4"/>
                <path d="M25 40L35 50L55 30" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            <h2 style={styles.successModalTitle}>Application Submitted Successfully!</h2>
            
            <p style={styles.successModalMessage}>
              Dear valued customer, your loan application has been successfully received by our Loan Department. 
              To proceed with the review process, please complete the required 10% security deposit.
            </p>

            <div style={styles.successModalDetails}>
              <h3 style={styles.detailsHeading}>Application Summary</h3>
              <div style={styles.successDetailRow}>
                <span style={styles.successDetailLabel}>Loan Type:</span>
                <span style={styles.successDetailValue}>{loanTypes.find(lt => lt.value === successData.loanType)?.label || 'Loan'}</span>
              </div>
              <div style={styles.successDetailRow}>
                <span style={styles.successDetailLabel}>Required Deposit (10%):</span>
                <span style={{...styles.successDetailValue, color: '#10b981', fontSize: '1.25rem', fontWeight: '700'}}>
                  ${parseFloat(successData.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div style={styles.successDetailRow}>
                <span style={styles.successDetailLabel}>Application ID:</span>
                <span style={{...styles.successDetailValue, fontFamily: 'monospace'}}>
                  {successData.loanId.substring(0, 8).toUpperCase()}
                </span>
              </div>
              <div style={styles.successDetailRow}>
                <span style={styles.successDetailLabel}>Status:</span>
                <span style={styles.statusBadge}>⏳ Pending Deposit</span>
              </div>
            </div>

            <div style={styles.successModalInfo}>
              <h3 style={styles.infoHeading}>
                <span style={styles.infoIcon}>📋</span>
                Next Steps to Complete Your Application
              </h3>
              <ol style={styles.successInfoList}>
                <li>Complete the required 10% security deposit to activate your application</li>
                <li>Choose your preferred deposit method (Account Balance, Crypto, Wire Transfer, or Check)</li>
                <li>Upload proof of payment for verification</li>
                <li>Our Loan Department will review your application within 24-48 business hours</li>
                <li>You'll receive email notification once your loan is approved</li>
              </ol>
            </div>

            <div style={styles.importantNotice}>
              <span style={styles.noticeIcon}>⚠️</span>
              <div>
                <strong style={styles.noticeTitle}>Important Notice:</strong>
                <p style={styles.noticeText}>
                  Your application will remain in pending status until the deposit is received and verified. 
                  The deposit serves as a security measure and demonstrates your commitment to the loan agreement.
                </p>
              </div>
            </div>

            <div style={styles.successModalActions}>
              <button
                onClick={() => router.push(`/loan/deposit-confirmation?loan_id=${successData.loanId}&amount=${successData.amount}`)}
                style={styles.successModalButton}
              >
                Proceed to Deposit Payment
              </button>
              <button
                onClick={() => router.push('/loan/dashboard')}
                style={styles.successModalSecondaryButton}
              >
                View Loan Dashboard
              </button>
            </div>

            <div style={styles.supportSection}>
              <p style={styles.supportText}>
                Need assistance? Our Loan Department is available 24/7
              </p>
              <p style={styles.supportContact}>
                📧 {bankDetails?.loan_email || 'loans@theoaklinebank.com'} | 
                📞 {bankDetails?.phone || '(636) 635-6122'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (fetchingData) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Loading loan application...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Professional Hero Section */}
      <div style={styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>Apply for Your Loan Today</h1>
          <p style={styles.heroSubtitle}>
            Competitive rates, flexible terms, and fast approvals. Let us help you achieve your financial goals with Oakline Bank.
          </p>
          {creditScore && (
            <div style={styles.creditScoreBadge}>
              <div style={styles.creditScoreInfo}>
                <span style={styles.creditScoreLabel}>Your Credit Score</span>
                <span style={styles.creditScoreValue}>{creditScore.score}</span>
              </div>
              <span style={styles.creditScoreQuality}>
                {creditScore.score >= 750 ? 'Excellent' : creditScore.score >= 700 ? 'Good' : creditScore.score >= 650 ? 'Fair' : 'Building Credit'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={styles.mainContent}>
        {hasActiveLoan && (
          <div style={styles.warningAlert}>
            <div style={styles.alertIcon}>⚠️</div>
            <div>
              <strong style={styles.alertTitle}>Active Loan Detected</strong>
              <p style={styles.alertMessage}>
                You currently have an active or pending loan with Oakline Bank. Please complete your existing loan 
                before applying for a new one. Visit your <a href="/loan/dashboard" style={{ color: '#f59e0b', textDecoration: 'underline' }}>Loan Dashboard</a> to manage your current loan.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div style={styles.alert}>
            <div style={styles.alertIcon}>⚠️</div>
            <div>
              <strong style={styles.alertTitle}>Application Error</strong>
              <p style={styles.alertMessage}>{error}</p>
            </div>
          </div>
        )}

        {/* Step Progress Indicator */}
        <div style={styles.progressContainer}>
          <div style={styles.progressSteps}>
            <div style={{...styles.progressStep, ...(currentStep >= 1 ? styles.progressStepActive : {})}}>
              <div style={styles.progressNumber}>1</div>
              <span style={styles.progressLabel}>Choose Loan</span>
            </div>
            <div style={styles.progressLine}></div>
            <div style={{...styles.progressStep, ...(currentStep >= 2 ? styles.progressStepActive : {})}}>
              <div style={styles.progressNumber}>2</div>
              <span style={styles.progressLabel}>Loan Details</span>
            </div>
            <div style={styles.progressLine}></div>
            <div style={{...styles.progressStep, ...(currentStep >= 3 ? styles.progressStepActive : {})}}>
              <div style={styles.progressNumber}>3</div>
              <span style={styles.progressLabel}>Review & Submit</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Loan Type Selection */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Select Your Loan Type</h2>
              <p style={styles.sectionDesc}>Choose the loan product that best matches your financial needs. Each loan type offers competitive rates and flexible terms.</p>
            </div>

            <div style={styles.loanTypeGrid}>
              {loanTypes.map(type => (
                <div
                  key={type.value}
                  onClick={() => !hasActiveLoan && handleInputChange({ target: { name: 'loan_type', value: type.value } })}
                  style={{
                    ...styles.loanTypeCard,
                    ...(formData.loan_type === type.value ? styles.loanTypeCardSelected : {}),
                    ...(hasActiveLoan ? { opacity: 0.5, cursor: 'not-allowed' } : {})
                  }}
                >
                  <div style={styles.loanTypeHeader}>
                    <div style={styles.loanTypeIcon}>{type.icon}</div>
                    {formData.loan_type === type.value && (
                      <div style={styles.selectedCheckmark}>✓</div>
                    )}
                  </div>
                  <h3 style={styles.loanTypeTitle}>{type.label}</h3>
                  <p style={styles.loanTypeDesc}>{type.desc}</p>
                  
                  <div style={styles.loanTypeDetails}>
                    <div style={styles.loanTypeRate}>
                      {type.rates && type.rates.length > 0 ? (
                        <>
                          <span style={styles.rateValue}>{type.rates[0].apr || type.rates[0].rate}%</span>
                          <span style={styles.rateLabel}>APR</span>
                        </>
                      ) : (
                        <span style={styles.rateLabel}>Rates vary</span>
                      )}
                    </div>
                    <div style={styles.loanAmountRange}>
                      <span style={styles.amountLabel}>Loan Range</span>
                      <span style={styles.amountValue}>
                        ${(type.minAmount / 1000).toFixed(0)}K - ${type.maxAmount >= 1000000 ? (type.maxAmount / 1000000).toFixed(1) + 'M' : (type.maxAmount / 1000).toFixed(0) + 'K'}
                      </span>
                    </div>
                    <div style={styles.loanTermRange}>
                      <span style={styles.termLabel}>Terms Available</span>
                      <span style={styles.termValue}>
                        {type.rates?.[0]?.min_term_months || 12} - {type.rates?.[0]?.max_term_months || 360} months
                      </span>
                    </div>
                  </div>

                  <div style={styles.loanFeatures}>
                    <span style={styles.feature}>✓ No prepayment penalty</span>
                    <span style={styles.feature}>✓ Fixed interest rate</span>
                    <span style={styles.feature}>✓ Flexible terms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Loan Details Form */}
          {formData.loan_type && !hasActiveLoan && (
            <>
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>Loan Amount & Terms</h2>
                  <p style={styles.sectionDesc}>
                    Specify your desired loan amount and repayment period. Our calculator will show you estimated monthly payments in real-time.
                  </p>
                </div>

                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <span style={styles.labelText}>Loan Amount</span>
                      <span style={styles.required}>*</span>
                      <span style={styles.tooltip}>💡</span>
                    </label>
                    <div style={styles.inputWrapper}>
                      <span style={styles.inputPrefix}>$</span>
                      <input
                        type="number"
                        name="principal"
                        value={formData.principal}
                        onChange={handleInputChange}
                        placeholder={selectedLoanTypeData?.minAmount?.toLocaleString() || "10,000"}
                        min={selectedLoanTypeData?.minAmount || 1000}
                        max={selectedLoanTypeData?.maxAmount || 5000000}
                        step="100"
                        required
                        style={{...styles.input, paddingLeft: '36px'}}
                      />
                    </div>
                    <span style={styles.hint}>
                      Range: ${(selectedLoanTypeData?.minAmount || 1000).toLocaleString()} - ${(selectedLoanTypeData?.maxAmount || 5000000).toLocaleString()}
                    </span>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <span style={styles.labelText}>Repayment Term</span>
                      <span style={styles.required}>*</span>
                      <span style={styles.tooltip}>💡</span>
                    </label>
                    <div style={styles.inputWrapper}>
                      <input
                        type="number"
                        name="term_months"
                        value={formData.term_months}
                        onChange={handleInputChange}
                        placeholder="36"
                        min={selectedLoanTypeData?.rates?.[0]?.min_term_months || 1}
                        max={selectedLoanTypeData?.rates?.[0]?.max_term_months || 360}
                        required
                        style={{...styles.input, paddingRight: '80px'}}
                      />
                      <span style={styles.inputSuffix}>months</span>
                    </div>
                    <span style={styles.hint}>
                      Choose between {selectedLoanTypeData?.rates?.[0]?.min_term_months || 12} to {selectedLoanTypeData?.rates?.[0]?.max_term_months || 360} months
                    </span>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <span style={styles.labelText}>Interest Rate (APR)</span>
                      <span style={styles.lockIcon}>🔒</span>
                    </label>
                    <div style={styles.inputWrapper}>
                      <input
                        type="text"
                        name="interest_rate"
                        value={formData.interest_rate ? `${formData.interest_rate}%` : ''}
                        readOnly
                        placeholder="Rate assigned based on loan type"
                        style={{...styles.input, backgroundColor: '#f0fdf4', cursor: 'not-allowed', color: '#059669', fontWeight: '600', fontSize: '16px'}}
                      />
                    </div>
                    <span style={styles.hint}>✓ Competitive rate locked in for your loan type</span>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <span style={styles.labelText}>Purpose of Loan</span>
                    <span style={styles.required}>*</span>
                  </label>
                  <textarea
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleInputChange}
                    placeholder="Please provide detailed information about how you plan to use the loan funds. For example: 'Home renovation including kitchen remodeling and bathroom upgrades' or 'Debt consolidation of three credit cards totaling $15,000'..."
                    required
                    rows="5"
                    style={styles.textarea}
                  />
                  <span style={styles.hint}>
                    💡 Detailed information helps us process your application faster and may improve approval chances
                  </span>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <span style={styles.labelText}>Collateral Description (Optional)</span>
                    <span style={styles.optionalBadge}>Optional</span>
                  </label>
                  <textarea
                    name="collateral_description"
                    value={formData.collateral_description}
                    onChange={handleInputChange}
                    placeholder="If you're offering collateral to secure this loan, please describe it here. For example: '2020 Honda Accord, VIN: 1HGCV1F3XLA012345, estimated value $25,000' or 'Real estate property at 123 Main St, appraised at $300,000'..."
                    rows="4"
                    style={styles.textarea}
                  />
                  <span style={styles.hint}>
                    ✓ Providing collateral may improve your approval odds and potentially lower your interest rate
                  </span>
                </div>
              </div>

              {/* Deposit Information */}
              {depositAmount > 0 && (
                <div style={styles.depositSection}>
                  <div style={styles.depositHeader}>
                    <h3 style={styles.depositTitle}>💰 Required Security Deposit</h3>
                    <p style={styles.depositDesc}>
                      A refundable 10% security deposit is required to process your loan application. This deposit demonstrates 
                      your commitment and is a standard practice in professional lending.
                    </p>
                  </div>

                  <div style={styles.depositInfoBox}>
                    <div style={styles.depositInfoItem}>
                      <span style={styles.depositInfoIcon}>📊</span>
                      <div style={styles.depositInfoContent}>
                        <span style={styles.depositInfoLabel}>Why is a deposit required?</span>
                        <span style={styles.depositInfoText}>
                          The security deposit protects both parties and ensures serious applications. It will be applied to your loan upon approval.
                        </span>
                      </div>
                    </div>
                    <div style={styles.depositInfoItem}>
                      <span style={styles.depositInfoIcon}>✅</span>
                      <div style={styles.depositInfoContent}>
                        <span style={styles.depositInfoLabel}>When is it refunded?</span>
                        <span style={styles.depositInfoText}>
                          If your application is declined, the full deposit will be refunded within 3-5 business days.
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.depositBox}>
                    <div style={styles.depositRow}>
                      <span style={styles.depositLabel}>Requested Loan Amount:</span>
                      <span style={styles.depositValue}>${parseFloat(formData.principal).toLocaleString()}</span>
                    </div>
                    <div style={styles.depositRow}>
                      <span style={styles.depositLabel}>Security Deposit (10%):</span>
                      <span style={{...styles.depositValue, color: '#059669', fontSize: '1.75rem', fontWeight: '700'}}>
                        ${depositAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div style={styles.depositRow}>
                      <span style={styles.depositLabel}>Your Available Balance:</span>
                      <span style={{...styles.depositValue, color: hasSufficientBalance ? '#059669' : '#dc2626', fontWeight: '600'}}>
                        ${accountBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {!hasSufficientBalance && (
                    <div style={styles.insufficientAlert}>
                      <span style={styles.alertIcon}>⚠️</span>
                      <div>
                        <strong>Insufficient Account Balance</strong>
                        <p style={{margin: '4px 0 0 0', fontSize: '14px'}}>
                          You need an additional ${(depositAmount - accountBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })} to meet the deposit requirement. 
                          Please deposit funds into your account or select a different deposit method below.
                        </p>
                      </div>
                    </div>
                  )}

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <span style={styles.labelText}>Deposit Payment Method</span>
                      <span style={styles.required}>*</span>
                    </label>
                    <select
                      name="deposit_method"
                      value={formData.deposit_method}
                      onChange={handleInputChange}
                      style={styles.select}
                      required
                    >
                      <option value="balance">Pay from Account Balance</option>
                      <option value="crypto">Cryptocurrency Deposit</option>
                      <option value="wire">Wire Transfer</option>
                      <option value="check">Check Deposit</option>
                    </select>
                    <span style={styles.hint}>
                      Choose your preferred method for submitting the security deposit
                    </span>
                  </div>
                </div>
              )}

              {/* Payment Calculator */}
              {formData.principal && formData.interest_rate && formData.term_months && (
                <div style={styles.calculatorSection}>
                  <div style={styles.calculatorHeader}>
                    <h3 style={styles.calculatorTitle}>📊 Your Loan Estimate</h3>
                    <p style={styles.calculatorDesc}>
                      Based on your loan details, here's what you can expect. These figures are estimates and final terms will be confirmed upon approval.
                    </p>
                  </div>

                  <div style={styles.calculatorGrid}>
                    <div style={styles.calculatorCard}>
                      <div style={styles.calculatorIcon}>💵</div>
                      <div style={styles.calculatorLabel}>Estimated Monthly Payment</div>
                      <div style={styles.calculatorValue}>${parseFloat(calculateMonthlyPayment()).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                      <div style={styles.calculatorNote}>Principal + Interest</div>
                    </div>

                    <div style={styles.calculatorCard}>
                      <div style={styles.calculatorIcon}>💰</div>
                      <div style={styles.calculatorLabel}>Total Amount to Repay</div>
                      <div style={styles.calculatorValue}>
                        ${(parseFloat(calculateMonthlyPayment()) * parseInt(formData.term_months)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div style={styles.calculatorNote}>Over {formData.term_months} months</div>
                    </div>

                    <div style={styles.calculatorCard}>
                      <div style={styles.calculatorIcon}>📈</div>
                      <div style={styles.calculatorLabel}>Total Interest Charges</div>
                      <div style={styles.calculatorValue}>
                        ${parseFloat(calculateTotalInterest()).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div style={styles.calculatorNote}>Cost of borrowing</div>
                    </div>

                    <div style={styles.calculatorCard}>
                      <div style={styles.calculatorIcon}>📅</div>
                      <div style={styles.calculatorLabel}>First Payment Date</div>
                      <div style={styles.calculatorValue}>
                        {new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div style={styles.calculatorNote}>30 days after approval</div>
                    </div>
                  </div>

                  <div style={styles.benefitsBox}>
                    <h4 style={styles.benefitsTitle}>✨ Your Loan Benefits</h4>
                    <div style={styles.benefitsGrid}>
                      <div style={styles.benefit}>
                        <span style={styles.benefitIcon}>✓</span>
                        <span style={styles.benefitText}>No prepayment penalties</span>
                      </div>
                      <div style={styles.benefit}>
                        <span style={styles.benefitIcon}>✓</span>
                        <span style={styles.benefitText}>Fixed interest rate guarantee</span>
                      </div>
                      <div style={styles.benefit}>
                        <span style={styles.benefitIcon}>✓</span>
                        <span style={styles.benefitText}>Flexible payment options</span>
                      </div>
                      <div style={styles.benefit}>
                        <span style={styles.benefitIcon}>✓</span>
                        <span style={styles.benefitText}>Online account management</span>
                      </div>
                      <div style={styles.benefit}>
                        <span style={styles.benefitIcon}>✓</span>
                        <span style={styles.benefitText}>24/7 customer support</span>
                      </div>
                      <div style={styles.benefit}>
                        <span style={styles.benefitIcon}>✓</span>
                        <span style={styles.benefitText}>Automatic payment setup</span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.disclaimerBox}>
                    <span style={styles.disclaimerIcon}>ℹ️</span>
                    <span style={styles.disclaimerText}>
                      These estimates are based on the information provided and are subject to change pending final approval. 
                      Actual loan terms may vary based on credit review and verification of information.
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={styles.actionSection}>
                <button
                  type="button"
                  onClick={() => router.push('/loan/dashboard')}
                  style={styles.cancelButton}
                  disabled={loading}
                >
                  ← Cancel Application
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.loan_type || !hasSufficientBalance}
                  style={{
                    ...styles.submitButton,
                    ...((loading || !formData.loan_type || !hasSufficientBalance) ? styles.submitButtonDisabled : {})
                  }}
                >
                  {loading ? (
                    <>
                      <span style={styles.spinner}></span>
                      Processing Application...
                    </>
                  ) : (
                    <>
                      Submit Loan Application →
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>

        {/* Information Box */}
        <div style={styles.infoBox}>
          <h3 style={styles.infoBoxTitle}>📋 How Our Loan Process Works</h3>
          
          <div style={styles.processSteps}>
            <div style={styles.processStep}>
              <div style={styles.processNumber}>1</div>
              <div style={styles.processContent}>
                <h4 style={styles.processStepTitle}>Complete Application</h4>
                <p style={styles.processStepDesc}>
                  Fill out the loan application form with accurate information about your loan needs, 
                  financial situation, and intended use of funds.
                </p>
              </div>
            </div>

            <div style={styles.processStep}>
              <div style={styles.processNumber}>2</div>
              <div style={styles.processContent}>
                <h4 style={styles.processStepTitle}>Submit Security Deposit</h4>
                <p style={styles.processStepDesc}>
                  Make the required 10% security deposit using your preferred payment method. 
                  This deposit will be applied to your loan upon approval.
                </p>
              </div>
            </div>

            <div style={styles.processStep}>
              <div style={styles.processNumber}>3</div>
              <div style={styles.processContent}>
                <h4 style={styles.processStepTitle}>Loan Department Review</h4>
                <p style={styles.processStepDesc}>
                  Our experienced loan officers will review your application, verify information, 
                  and assess your creditworthiness within 24-48 business hours.
                </p>
              </div>
            </div>

            <div style={styles.processStep}>
              <div style={styles.processNumber}>4</div>
              <div style={styles.processContent}>
                <h4 style={styles.processStepTitle}>Receive Decision</h4>
                <p style={styles.processStepDesc}>
                  You'll receive an email notification with the loan decision. If approved, 
                  review and sign the loan agreement electronically.
                </p>
              </div>
            </div>

            <div style={styles.processStep}>
              <div style={styles.processNumber}>5</div>
              <div style={styles.processContent}>
                <h4 style={styles.processStepTitle}>Get Your Funds</h4>
                <p style={styles.processStepDesc}>
                  Upon signing the agreement, funds are typically deposited into your account 
                  within 1-2 business days. Start using your loan immediately!
                </p>
              </div>
            </div>
          </div>

          <div style={styles.faqSection}>
            <h4 style={styles.faqTitle}>💡 Frequently Asked Questions</h4>
            
            <div style={styles.faqItem}>
              <h5 style={styles.faqQuestion}>What documents do I need?</h5>
              <p style={styles.faqAnswer}>
                While the online application requires no document uploads initially, you may need to provide 
                proof of identity, income verification, and address confirmation during the approval process.
              </p>
            </div>

            <div style={styles.faqItem}>
              <h5 style={styles.faqQuestion}>How is my interest rate determined?</h5>
              <p style={styles.faqAnswer}>
                Your rate is based on the loan type, amount, term, and your credit profile. We offer competitive 
                rates that are clearly disclosed before you commit to the loan.
              </p>
            </div>

            <div style={styles.faqItem}>
              <h5 style={styles.faqQuestion}>Can I pay off my loan early?</h5>
              <p style={styles.faqAnswer}>
                Yes! All our loans come with no prepayment penalties. You can pay off your loan early and 
                save on interest charges without any additional fees.
              </p>
            </div>

            <div style={styles.faqItem}>
              <h5 style={styles.faqQuestion}>What if I'm declined?</h5>
              <p style={styles.faqAnswer}>
                Your security deposit will be fully refunded within 3-5 business days. We'll also provide 
                information about why the application was declined and steps you can take to improve your chances.
              </p>
            </div>
          </div>

          <div style={styles.supportBox}>
            <div style={styles.supportIcon}>💬</div>
            <div style={styles.supportContent}>
              <h4 style={styles.supportTitle}>Need Help with Your Application?</h4>
              <p style={styles.supportDesc}>
                Our loan specialists are available 24/7 to answer your questions and guide you through the application process.
              </p>
            </div>
            <div style={styles.contactMethods}>
              <a href={`tel:${bankDetails?.phone || '+1-636-635-6122'}`} style={styles.contactMethod}>
                <span style={styles.contactIcon}>📞</span>
                <span style={styles.contactText}>{bankDetails?.phone || '(636) 635-6122'}</span>
              </a>
              <a href={`mailto:${bankDetails?.loan_email || 'loans@theoaklinebank.com'}`} style={styles.contactMethod}>
                <span style={styles.contactIcon}>📧</span>
                <span style={styles.contactText}>{bankDetails?.loan_email || 'loans@theoaklinebank.com'}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc'
  },
  loadingSpinner: {
    width: '60px',
    height: '60px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#059669',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  loadingText: {
    marginTop: '20px',
    fontSize: '16px',
    color: '#64748b',
    fontWeight: '500'
  },
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  hero: {
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    padding: '60px 20px',
    textAlign: 'center',
    color: '#fff',
    position: 'relative',
    overflow: 'hidden'
  },
  heroContent: {
    maxWidth: '900px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 2
  },
  heroTitle: {
    fontSize: 'clamp(32px, 5vw, 48px)',
    fontWeight: '700',
    marginBottom: '20px',
    letterSpacing: '-0.5px',
    lineHeight: '1.2'
  },
  heroSubtitle: {
    fontSize: 'clamp(15px, 2.5vw, 18px)',
    lineHeight: '1.6',
    opacity: '0.95',
    maxWidth: '700px',
    margin: '0 auto'
  },
  creditScoreBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '24px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: '16px 32px',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    marginTop: '24px'
  },
  creditScoreInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start'
  },
  creditScoreLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  creditScoreValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#059669',
    lineHeight: '1'
  },
  creditScoreQuality: {
    fontSize: '14px',
    color: '#059669',
    fontWeight: '600',
    padding: '6px 16px',
    backgroundColor: '#d1fae5',
    borderRadius: '12px'
  },
  
  mainContent: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '40px 20px 80px'
  },
  progressContainer: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '40px',
    marginBottom: '32px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  progressSteps: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: '800px',
    margin: '0 auto'
  },
  progressStep: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    flex: 1
  },
  progressStepActive: {
    
  },
  progressNumber: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#d1fae5',
    color: '#059669',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '700',
    transition: 'all 0.3s'
  },
  progressLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center'
  },
  progressLine: {
    flex: 1,
    height: '2px',
    backgroundColor: '#e5e7eb',
    margin: '0 16px'
  },
  warningAlert: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fde68a',
    borderLeft: '4px solid #f59e0b',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start'
  },
  alert: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderLeft: '4px solid #ef4444',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start'
  },
  alertIcon: {
    fontSize: '24px',
    flexShrink: 0
  },
  alertTitle: {
    fontSize: '16px',
    fontWeight: '600',
    display: 'block',
    marginBottom: '4px',
    color: '#1e293b'
  },
  alertMessage: {
    fontSize: '14px',
    margin: 0,
    color: '#4b5563',
    lineHeight: '1.6'
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'hidden'
  },
  section: {
    padding: '48px',
    borderBottom: '1px solid #e5e7eb'
  },
  sectionHeader: {
    marginBottom: '32px'
  },
  sectionTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '12px'
  },
  sectionDesc: {
    fontSize: '16px',
    color: '#64748b',
    lineHeight: '1.6',
    maxWidth: '800px'
  },
  loanTypeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '24px'
  },
  loanTypeCard: {
    position: 'relative',
    padding: '28px',
    borderRadius: '16px',
    border: '2px solid #e5e7eb',
    backgroundColor: '#fff',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    minHeight: '400px',
    display: 'flex',
    flexDirection: 'column'
  },
  loanTypeCardSelected: {
    borderColor: '#059669',
    backgroundColor: '#f0fdf4',
    boxShadow: '0 8px 24px rgba(5, 150, 105, 0.2)',
    transform: 'translateY(-4px)'
  },
  loanTypeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px'
  },
  loanTypeIcon: {
    fontSize: '48px'
  },
  selectedCheckmark: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#059669',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '700'
  },
  loanTypeTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '12px'
  },
  loanTypeDesc: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '24px',
    lineHeight: '1.5',
    flex: 1
  },
  loanTypeDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '20px',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px'
  },
  loanTypeRate: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px'
  },
  rateValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#059669'
  },
  rateLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '600'
  },
  loanAmountRange: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  amountLabel: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500'
  },
  amountValue: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: '600'
  },
  loanTermRange: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  termLabel: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500'
  },
  termValue: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: '600'
  },
  loanFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb'
  },
  feature: {
    fontSize: '13px',
    color: '#059669',
    fontWeight: '500'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '28px',
    marginBottom: '28px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px',
    gap: '6px'
  },
  labelText: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b'
  },
  required: {
    color: '#ef4444',
    fontSize: '14px'
  },
  tooltip: {
    fontSize: '14px',
    cursor: 'help'
  },
  lockIcon: {
    fontSize: '14px',
    marginLeft: 'auto'
  },
  optionalBadge: {
    fontSize: '11px',
    padding: '4px 8px',
    backgroundColor: '#e5e7eb',
    color: '#64748b',
    borderRadius: '4px',
    fontWeight: '600',
    marginLeft: 'auto'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  inputPrefix: {
    position: 'absolute',
    left: '16px',
    fontSize: '16px',
    color: '#6b7280',
    fontWeight: '500',
    zIndex: 1
  },
  inputSuffix: {
    position: 'absolute',
    right: '16px',
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500'
  },
  input: {
    width: '100%',
    padding: '16px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    outline: 'none',
    transition: 'all 0.3s',
    fontFamily: 'inherit',
    backgroundColor: '#fff'
  },
  select: {
    width: '100%',
    padding: '16px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    outline: 'none',
    transition: 'all 0.3s',
    fontFamily: 'inherit',
    backgroundColor: '#fff',
    cursor: 'pointer'
  },
  textarea: {
    width: '100%',
    padding: '16px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    outline: 'none',
    transition: 'all 0.3s',
    fontFamily: 'inherit',
    resize: 'vertical',
    lineHeight: '1.6',
    backgroundColor: '#fff'
  },
  hint: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '8px',
    lineHeight: '1.4'
  },
  depositSection: {
    padding: '48px',
    backgroundColor: '#f0fdf4',
    borderTop: '1px solid #d1fae5'
  },
  depositHeader: {
    textAlign: 'center',
    marginBottom: '32px'
  },
  depositTitle: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '12px'
  },
  depositDesc: {
    fontSize: '15px',
    color: '#64748b',
    maxWidth: '700px',
    margin: '0 auto',
    lineHeight: '1.6'
  },
  depositInfoBox: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '28px'
  },
  depositInfoItem: {
    display: 'flex',
    gap: '16px',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #d1fae5'
  },
  depositInfoIcon: {
    fontSize: '24px',
    flexShrink: 0
  },
  depositInfoContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  depositInfoLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#059669'
  },
  depositInfoText: {
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.5'
  },
  depositBox: {
    backgroundColor: '#fff',
    padding: '28px',
    borderRadius: '16px',
    marginBottom: '24px',
    border: '2px solid #d1fae5',
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.1)'
  },
  depositRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '16px 0',
    borderBottom: '1px solid #f3f4f6',
    alignItems: 'center'
  },
  depositLabel: {
    fontSize: '15px',
    color: '#64748b',
    fontWeight: '500'
  },
  depositValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b'
  },
  insufficientAlert: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    color: '#dc2626'
  },
  calculatorSection: {
    padding: '48px',
    backgroundColor: '#f0fdf4',
    borderTop: '1px solid #d1fae5'
  },
  calculatorHeader: {
    textAlign: 'center',
    marginBottom: '40px'
  },
  calculatorTitle: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '12px'
  },
  calculatorDesc: {
    fontSize: '15px',
    color: '#64748b',
    maxWidth: '700px',
    margin: '0 auto',
    lineHeight: '1.6'
  },
  calculatorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '24px',
    marginBottom: '32px'
  },
  calculatorCard: {
    backgroundColor: '#fff',
    padding: '28px',
    borderRadius: '16px',
    textAlign: 'center',
    border: '1px solid #e5e7eb',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  calculatorIcon: {
    fontSize: '32px',
    marginBottom: '12px'
  },
  calculatorLabel: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  calculatorValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#059669',
    marginBottom: '8px'
  },
  calculatorNote: {
    fontSize: '12px',
    color: '#64748b'
  },
  benefitsBox: {
    backgroundColor: '#fff',
    padding: '28px',
    borderRadius: '16px',
    marginBottom: '24px',
    border: '1px solid #e5e7eb'
  },
  benefitsTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '20px'
  },
  benefitsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  benefit: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  benefitIcon: {
    color: '#059669',
    fontSize: '18px',
    fontWeight: '700'
  },
  benefitText: {
    fontSize: '14px',
    color: '#4b5563'
  },
  disclaimerBox: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  disclaimerIcon: {
    fontSize: '20px',
    flexShrink: 0
  },
  disclaimerText: {
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.5'
  },
  actionSection: {
    padding: '40px 48px',
    display: 'flex',
    gap: '20px',
    justifyContent: 'flex-end',
    backgroundColor: '#f8fafc',
    flexWrap: 'wrap'
  },
  cancelButton: {
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#4b5563',
    backgroundColor: '#fff',
    border: '2px solid #d1d5db',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    fontFamily: 'inherit'
  },
  submitButton: {
    padding: '16px 48px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.4)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontFamily: 'inherit'
  },
  submitButtonDisabled: {
    background: '#9ca3af',
    cursor: 'not-allowed',
    boxShadow: 'none'
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #fff',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
    display: 'inline-block'
  },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '48px',
    marginTop: '32px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  infoBoxTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '32px'
  },
  processSteps: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    marginBottom: '48px'
  },
  processStep: {
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-start'
  },
  processNumber: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#f0fdf4',
    color: '#059669',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: '700',
    flexShrink: 0,
    border: '2px solid #d1fae5'
  },
  processContent: {
    flex: 1
  },
  processStepTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '8px'
  },
  processStepDesc: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.6',
    margin: 0
  },
  faqSection: {
    marginBottom: '40px'
  },
  faqTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '24px'
  },
  faqItem: {
    marginBottom: '24px',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  faqQuestion: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '8px'
  },
  faqAnswer: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.6',
    margin: 0
  },
  supportBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '32px',
    backgroundColor: '#f0fdf4',
    borderRadius: '16px',
    border: '1px solid #d1fae5',
    textAlign: 'center'
  },
  supportIcon: {
    fontSize: '48px',
    marginBottom: '8px'
  },
  supportContent: {
    width: '100%'
  },
  supportTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#059669',
    marginBottom: '12px'
  },
  supportDesc: {
    fontSize: '15px',
    color: '#64748b',
    marginBottom: '20px',
    lineHeight: '1.6',
    maxWidth: '600px',
    margin: '0 auto 20px'
  },
  contactMethods: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  contactMethod: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 24px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    textDecoration: 'none',
    color: '#059669',
    fontWeight: '600',
    fontSize: '15px',
    border: '2px solid #d1fae5',
    transition: 'all 0.3s',
    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.1)'
  },
  contactIcon: {
    fontSize: '20px'
  },
  contactText: {
    
  },
  successModalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
    overflow: 'auto'
  },
  successModalContainer: {
    maxWidth: '700px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    margin: 'auto'
  },
  successModalContent: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: 'clamp(24px, 5vw, 48px)',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
  },
  successCheckmark: {
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'center'
  },
  successModalTitle: {
    fontSize: 'clamp(24px, 4vw, 32px)',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '16px',
    lineHeight: '1.2'
  },
  successModalMessage: {
    fontSize: 'clamp(14px, 2.5vw, 16px)',
    color: '#4b5563',
    marginBottom: '32px',
    lineHeight: '1.7',
    textAlign: 'left'
  },
  detailsHeading: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '16px',
    textAlign: 'left',
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: '8px'
  },
  successModalDetails: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    textAlign: 'left',
    border: '1px solid #e5e7eb'
  },
  successDetailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 0',
    borderBottom: '1px solid #e2e8f0'
  },
  successDetailLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500'
  },
  successDetailValue: {
    fontSize: '15px',
    color: '#1e293b',
    fontWeight: '600',
    textAlign: 'right'
  },
  statusBadge: {
    fontSize: '13px',
    color: '#f59e0b',
    fontWeight: '700',
    backgroundColor: '#fffbeb',
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid #fde68a'
  },
  successModalInfo: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    textAlign: 'left'
  },
  infoHeading: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  infoIcon: {
    fontSize: '20px'
  },
  successInfoList: {
    margin: '0',
    paddingLeft: '20px',
    color: '#1e40af',
    fontSize: '14px',
    lineHeight: '2',
    textAlign: 'left'
  },
  importantNotice: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderLeft: '4px solid #dc2626',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    textAlign: 'left'
  },
  noticeIcon: {
    fontSize: '20px',
    flexShrink: 0,
    marginTop: '2px'
  },
  noticeTitle: {
    fontSize: '14px',
    color: '#991b1b',
    display: 'block',
    marginBottom: '4px'
  },
  noticeText: {
    fontSize: '13px',
    color: '#991b1b',
    margin: 0,
    lineHeight: '1.6'
  },
  successModalActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px'
  },
  successModalButton: {
    width: '100%',
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    transition: 'all 0.3s',
    fontFamily: 'inherit'
  },
  successModalSecondaryButton: {
    width: '100%',
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    backgroundColor: 'transparent',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    fontFamily: 'inherit'
  },
  supportSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '20px',
    marginTop: '8px'
  },
  supportText: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 8px 0'
  },
  supportContact: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: '600',
    margin: 0
  }
};

export default function LoanApplication() {
  return (
    <ProtectedRoute>
      <LoanApplicationContent />
    </ProtectedRoute>
  );
}

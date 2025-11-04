
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
  const DEPOSIT_PERCENTAGE = 0.10; // 10% deposit requirement

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
        return;
      }

      if (typesData && typesData.length > 0) {
        const formattedTypes = typesData.map(type => ({
          id: type.id,
          value: type.name.toLowerCase().replace(/\s+/g, '_'),
          label: type.name,
          desc: type.description || `Apply for a ${type.name.toLowerCase()}`,
          minAmount: type.min_amount || 1000,
          maxAmount: type.max_amount || 5000000,
          rates: type.loan_interest_rates || [],
          icon: getLoanTypeIcon(type.name)
        }));
        setLoanTypes(formattedTypes);
      } else {
        // Fallback to default loan types if database is empty
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
      icon: '👤', desc: 'For personal expenses and consolidation',
      minAmount: 1000, maxAmount: 50000
    },
    { 
      id: '2', value: 'home_mortgage', label: 'Home Mortgage', 
      rates: [{ rate: 7.25, apr: 7.25, min_term_months: 180, max_term_months: 360 }],
      icon: '🏠', desc: 'Finance your dream home',
      minAmount: 50000, maxAmount: 5000000
    },
    { 
      id: '3', value: 'auto_loan', label: 'Auto Loan', 
      rates: [{ rate: 5.99, apr: 5.99, min_term_months: 24, max_term_months: 72 }],
      icon: '🚗', desc: 'Get the car you want',
      minAmount: 5000, maxAmount: 100000
    },
    { 
      id: '4', value: 'business', label: 'Business Loan', 
      rates: [{ rate: 8.50, apr: 8.50, min_term_months: 12, max_term_months: 120 }],
      icon: '🏢', desc: 'Grow your business',
      minAmount: 10000, maxAmount: 500000
    },
    { 
      id: '5', value: 'student', label: 'Student Loan', 
      rates: [{ rate: 4.99, apr: 4.99, min_term_months: 120, max_term_months: 240 }],
      icon: '🎓', desc: 'Invest in your education',
      minAmount: 1000, maxAmount: 100000
    },
    { 
      id: '6', value: 'home_equity', label: 'Home Equity Loan', 
      rates: [{ rate: 7.50, apr: 7.50, min_term_months: 60, max_term_months: 360 }],
      icon: '🏡', desc: 'Unlock your home\'s value',
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
        .in('status', ['pending', 'active']);

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
        // Set the default interest rate (using the first available rate or average)
        const rates = selectedLoan.rates || [];
        if (rates.length > 0) {
          const defaultRate = rates[0].apr || rates[0].rate;
          setFormData(prev => ({ 
            ...prev, 
            interest_rate: defaultRate.toString(),
            loan_type: value
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
        setError('You already have an active or pending loan. Please complete or close your existing loan before applying for a new one.');
        setLoading(false);
        return;
      }

      if (accounts.length === 0) {
        setError('You must have an active account to apply for a loan');
        setLoading(false);
        return;
      }

      // Validate loan amount against selected loan type limits
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

  // Success Modal
  if (success === 'success' && successData) {
    return (
      <div style={styles.successModalOverlay}>
        <div style={styles.successModalContent}>
          <div style={styles.successCheckmark}>
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="38" stroke="#10b981" strokeWidth="4" fill="#f0fdf4"/>
              <path d="M25 40L35 50L55 30" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 style={styles.successModalTitle}>Application Submitted!</h2>
          <p style={styles.successModalMessage}>
            Your loan application has been successfully submitted. Please complete the required deposit to proceed with your application.
          </p>
          <div style={styles.successModalDetails}>
            <div style={styles.successDetailRow}>
              <span style={styles.successDetailLabel}>Loan Type:</span>
              <span style={styles.successDetailValue}>{loanTypes.find(lt => lt.value === successData.loanType)?.label || 'Loan'}</span>
            </div>
            <div style={styles.successDetailRow}>
              <span style={styles.successDetailLabel}>Required Deposit:</span>
              <span style={styles.successDetailValue}>${parseFloat(successData.amount).toLocaleString()}</span>
            </div>
            <div style={styles.successDetailRow}>
              <span style={styles.successDetailLabel}>Application Status:</span>
              <span style={styles.successDetailValue}>⏳ Awaiting Deposit</span>
            </div>
          </div>
          <div style={styles.successModalInfo}>
            <p style={styles.successInfoText}>
              <strong>Next Steps:</strong>
            </p>
            <ul style={styles.successInfoList}>
              <li>Complete your 10% deposit to activate your application</li>
              <li>Choose your preferred deposit method (Balance or Crypto)</li>
              <li>Our team will review your application within 24-48 hours</li>
            </ul>
          </div>
          <button
            onClick={() => router.push(`/loan/deposit-confirmation?loan_id=${successData.loanId}&amount=${successData.amount}`)}
            style={styles.successModalButton}
          >
            Proceed to Deposit
          </button>
        </div>
      </div>
    );
  }

  if (fetchingData) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Loading loan options...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.hero}>
        <div style={styles.heroContent}>
          <div style={styles.heroIcon}>💼</div>
          <h1 style={styles.heroTitle}>Loan Application</h1>
          <p style={styles.heroSubtitle}>
            Take the next step towards your financial goals. Complete your application and make the required deposit to get approved.
          </p>
          {creditScore && (
            <div style={styles.creditScoreBadge}>
              <span style={styles.creditScoreLabel}>Your Credit Score:</span>
              <span style={styles.creditScoreValue}>{creditScore.score}</span>
            </div>
          )}
        </div>
      </div>

      <div style={styles.mainContent}>
        {hasActiveLoan && (
          <div style={styles.warningAlert}>
            <div style={styles.alertIcon}>⚠️</div>
            <div>
              <strong style={styles.alertTitle}>Active Loan Exists</strong>
              <p style={styles.alertMessage}>You already have an active or pending loan. Please complete your existing loan before applying for a new one.</p>
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

        {success && (
          <div style={styles.successAlert}>
            <div style={styles.alertIcon}>✅</div>
            <div>
              <strong style={styles.alertTitle}>Application Submitted</strong>
              <p style={styles.alertMessage}>{success}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Select Loan Type</h2>
            <p style={styles.sectionDesc}>Choose the loan product that best fits your needs</p>

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
                  <div style={styles.loanTypeIcon}>{type.icon}</div>
                  <h3 style={styles.loanTypeTitle}>{type.label}</h3>
                  <p style={styles.loanTypeDesc}>{type.desc}</p>
                  <div style={styles.loanTypeRate}>
                    {type.rates && type.rates.length > 0 ? (
                      <>
                        <span style={styles.rateValue}>{type.rates[0].apr || type.rates[0].rate}%</span>
                        <span style={styles.rateLabel}>APR</span>
                      </>
                    ) : (
                      <span style={styles.rateLabel}>Contact for rates</span>
                    )}
                  </div>
                  <div style={styles.loanAmountRange}>
                    <span style={styles.amountLabel}>${type.minAmount?.toLocaleString()} - ${type.maxAmount?.toLocaleString()}</span>
                  </div>
                  {formData.loan_type === type.value && (
                    <div style={styles.selectedBadge}>✓ Selected</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {formData.loan_type && !hasActiveLoan && (
            <>
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Loan Details</h2>
                <p style={styles.sectionDesc}>Specify the amount and term for your {selectedLoanTypeData?.label || 'loan'}</p>

                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <span style={styles.labelText}>Loan Amount</span>
                      <span style={styles.required}>*</span>
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
                      Minimum: ${(selectedLoanTypeData?.minAmount || 1000).toLocaleString()} | 
                      Maximum: ${(selectedLoanTypeData?.maxAmount || 5000000).toLocaleString()}
                    </span>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <span style={styles.labelText}>Loan Term</span>
                      <span style={styles.required}>*</span>
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
                      Range: {selectedLoanTypeData?.rates?.[0]?.min_term_months || 12} - {selectedLoanTypeData?.rates?.[0]?.max_term_months || 360} months
                    </span>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <span style={styles.labelText}>Interest Rate (APR)</span>
                    </label>
                    <div style={styles.inputWrapper}>
                      <input
                        type="text"
                        name="interest_rate"
                        value={formData.interest_rate ? `${formData.interest_rate}%` : ''}
                        readOnly
                        placeholder="Rate will be set automatically"
                        style={{...styles.input, backgroundColor: '#f9fafb', cursor: 'not-allowed', color: '#10b981', fontWeight: '600'}}
                      />
                    </div>
                    <span style={styles.hint}>Competitive rate automatically assigned based on loan type</span>
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
                    placeholder="Please describe in detail how you plan to use the loan funds..."
                    required
                    rows="5"
                    style={styles.textarea}
                  />
                  <span style={styles.hint}>Provide specific details to help us process your application faster</span>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <span style={styles.labelText}>Collateral Description (Optional)</span>
                  </label>
                  <textarea
                    name="collateral_description"
                    value={formData.collateral_description}
                    onChange={handleInputChange}
                    placeholder="Describe any collateral you're offering for this loan..."
                    rows="3"
                    style={styles.textarea}
                  />
                  <span style={styles.hint}>Providing collateral may improve your approval chances</span>
                </div>
              </div>

              {depositAmount > 0 && (
                <div style={styles.depositSection}>
                  <div style={styles.depositHeader}>
                    <h3 style={styles.depositTitle}>💰 Required Deposit</h3>
                    <p style={styles.depositDesc}>A {(DEPOSIT_PERCENTAGE * 100)}% deposit is required to process your loan application</p>
                  </div>

                  <div style={styles.depositBox}>
                    <div style={styles.depositRow}>
                      <span style={styles.depositLabel}>Loan Amount:</span>
                      <span style={styles.depositValue}>${parseFloat(formData.principal).toLocaleString()}</span>
                    </div>
                    <div style={styles.depositRow}>
                      <span style={styles.depositLabel}>Required Deposit ({(DEPOSIT_PERCENTAGE * 100)}%):</span>
                      <span style={{...styles.depositValue, color: '#10b981', fontSize: '1.5rem'}}>
                        ${depositAmount.toLocaleString()}
                      </span>
                    </div>
                    <div style={styles.depositRow}>
                      <span style={styles.depositLabel}>Your Account Balance:</span>
                      <span style={{...styles.depositValue, color: hasSufficientBalance ? '#10b981' : '#ef4444'}}>
                        ${accountBalance.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {!hasSufficientBalance && (
                    <div style={styles.insufficientAlert}>
                      <span style={styles.alertIcon}>⚠️</span>
                      <div>
                        <strong>Insufficient Balance</strong>
                        <p style={{margin: '4px 0 0 0'}}>
                          You need ${(depositAmount - accountBalance).toLocaleString()} more in your account. 
                          Please deposit funds or choose a lower loan amount.
                        </p>
                      </div>
                    </div>
                  )}

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <span style={styles.labelText}>Deposit Method</span>
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
                      <option value="crypto">Crypto Deposit</option>
                      <option value="wire">Wire Transfer</option>
                      <option value="check">Check Deposit</option>
                    </select>
                  </div>
                </div>
              )}

              {formData.principal && formData.interest_rate && formData.term_months && (
                <div style={styles.calculatorSection}>
                  <div style={styles.calculatorHeader}>
                    <h3 style={styles.calculatorTitle}>📊 Payment Estimate</h3>
                    <p style={styles.calculatorDesc}>Based on the information provided</p>
                  </div>

                  <div style={styles.calculatorGrid}>
                    <div style={styles.calculatorCard}>
                      <div style={styles.calculatorLabel}>Monthly Payment</div>
                      <div style={styles.calculatorValue}>${calculateMonthlyPayment()}</div>
                    </div>

                    <div style={styles.calculatorCard}>
                      <div style={styles.calculatorLabel}>Total to Repay</div>
                      <div style={styles.calculatorValue}>
                        ${(parseFloat(calculateMonthlyPayment()) * parseInt(formData.term_months)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div style={styles.calculatorCard}>
                      <div style={styles.calculatorLabel}>Total Interest</div>
                      <div style={styles.calculatorValue}>
                        ${calculateTotalInterest()}
                      </div>
                    </div>
                  </div>

                  <div style={styles.calculatorNote}>
                    <span style={styles.noteIcon}>ℹ️</span>
                    <span>These are estimated figures. Final terms will be confirmed upon approval.</span>
                  </div>
                </div>
              )}

              <div style={styles.actionSection}>
                <button
                  type="button"
                  onClick={() => router.push('/loan/dashboard')}
                  style={styles.cancelButton}
                  disabled={loading}
                >
                  Cancel
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
                      Processing...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </button>
              </div>
            </>
          )}
        </form>

        <div style={styles.infoBox}>
          <h3 style={styles.infoTitle}>📋 Application Process</h3>
          <div style={styles.timelineContainer}>
            <div style={styles.timelineItem}>
              <div style={styles.timelineDot}></div>
              <div style={styles.timelineContent}>
                <strong>1. Submit Application</strong>
                <p>Complete the loan application form with required details</p>
              </div>
            </div>
            <div style={styles.timelineItem}>
              <div style={styles.timelineDot}></div>
              <div style={styles.timelineContent}>
                <strong>2. Make Required Deposit</strong>
                <p>Deposit {(DEPOSIT_PERCENTAGE * 100)}% of the requested loan amount</p>
              </div>
            </div>
            <div style={styles.timelineItem}>
              <div style={styles.timelineDot}></div>
              <div style={styles.timelineContent}>
                <strong>3. Application Review</strong>
                <p>Our team reviews your application within 24-48 hours</p>
              </div>
            </div>
            <div style={styles.timelineItem}>
              <div style={styles.timelineDot}></div>
              <div style={styles.timelineContent}>
                <strong>4. Approval & Funding</strong>
                <p>Upon approval, funds are credited to your account</p>
              </div>
            </div>
          </div>

          <div style={styles.supportNote}>
            <span style={styles.supportIcon}>💬</span>
            <div>
              Need assistance? Contact our support team at{' '}
              <a href={`tel:${bankDetails?.phone || '+1 (636) 635-6122'}`} style={{ color: '#1A3E6F', fontWeight: '600', textDecoration: 'none' }}>
                {bankDetails?.phone || '+1 (636) 635-6122'}
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
    borderTopColor: '#10b981',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  loadingText: {
    marginTop: '20px',
    fontSize: '16px',
    color: '#64748b',
    fontWeight: '500'
  },
  successModalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px'
  },
  successModalContent: {
    backgroundColor: '#fff',
    borderRadius: '20px',
    padding: '48px',
    maxWidth: '600px',
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
    fontSize: '32px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '16px'
  },
  successModalMessage: {
    fontSize: '18px',
    color: '#64748b',
    marginBottom: '32px',
    lineHeight: '1.6'
  },
  successModalDetails: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '32px',
    textAlign: 'left'
  },
  successDetailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #e2e8f0'
  },
  successDetailLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500'
  },
  successDetailValue: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: '600'
  },
  successModalInfo: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '32px',
    textAlign: 'left'
  },
  successInfoText: {
    fontSize: '14px',
    color: '#1e293b',
    marginBottom: '12px'
  },
  successInfoList: {
    margin: '0',
    paddingLeft: '24px',
    color: '#64748b',
    fontSize: '14px',
    lineHeight: '2'
  },
  successModalButton: {
    width: '100%',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    transition: 'all 0.3s'
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
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  heroContent: {
    maxWidth: '800px',
    margin: '0 auto'
  },
  heroIcon: {
    fontSize: '48px',
    marginBottom: '20px'
  },
  heroTitle: {
    fontSize: 'clamp(32px, 5vw, 48px)',
    fontWeight: '700',
    marginBottom: '16px',
    letterSpacing: '-0.5px'
  },
  heroSubtitle: {
    fontSize: '18px',
    lineHeight: '1.6',
    opacity: '0.95',
    maxWidth: '600px',
    margin: '0 auto'
  },
  creditScoreBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: '12px 24px',
    borderRadius: '30px',
    marginTop: '20px',
    backdropFilter: 'blur(10px)'
  },
  creditScoreLabel: {
    fontSize: '14px',
    fontWeight: '500'
  },
  creditScoreValue: {
    fontSize: '24px',
    fontWeight: '700'
  },
  mainContent: {
    maxWidth: '1000px',
    margin: '-40px auto 0',
    padding: '0 20px 60px',
    position: 'relative'
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
  successAlert: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderLeft: '4px solid #10b981',
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
    marginBottom: '4px'
  },
  alertMessage: {
    fontSize: '14px',
    margin: 0,
    color: '#4b5563'
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'hidden'
  },
  section: {
    padding: '40px',
    borderBottom: '1px solid #e5e7eb'
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '8px'
  },
  sectionDesc: {
    fontSize: '15px',
    color: '#64748b',
    marginBottom: '28px'
  },
  loanTypeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px'
  },
  loanTypeCard: {
    position: 'relative',
    padding: '24px',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
    backgroundColor: '#fff',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  loanTypeCardSelected: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
  },
  loanTypeIcon: {
    fontSize: '40px',
    marginBottom: '16px'
  },
  loanTypeTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '8px'
  },
  loanTypeDesc: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '16px',
    minHeight: '40px'
  },
  loanTypeRate: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
    marginBottom: '8px'
  },
  rateValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#10b981'
  },
  rateLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500'
  },
  loanAmountRange: {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #e5e7eb'
  },
  amountLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500'
  },
  selectedBadge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    backgroundColor: '#10b981',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '24px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
    gap: '4px'
  },
  labelText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b'
  },
  required: {
    color: '#ef4444',
    fontSize: '14px'
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
    fontWeight: '500'
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
    padding: '14px 16px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    outline: 'none',
    transition: 'all 0.3s',
    fontFamily: 'inherit',
    backgroundColor: '#fff'
  },
  select: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    outline: 'none',
    transition: 'all 0.3s',
    fontFamily: 'inherit',
    backgroundColor: '#fff'
  },
  textarea: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
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
    marginTop: '6px'
  },
  depositSection: {
    padding: '40px',
    backgroundColor: '#f0fdf4',
    borderTop: '1px solid #e5e7eb'
  },
  depositHeader: {
    textAlign: 'center',
    marginBottom: '28px'
  },
  depositTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '8px'
  },
  depositDesc: {
    fontSize: '14px',
    color: '#64748b'
  },
  depositBox: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '12px',
    marginBottom: '20px',
    border: '1px solid #dcfce7'
  },
  depositRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f6'
  },
  depositLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500'
  },
  depositValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937'
  },
  insufficientAlert: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '20px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    color: '#dc2626'
  },
  calculatorSection: {
    padding: '40px',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #e5e7eb'
  },
  calculatorHeader: {
    textAlign: 'center',
    marginBottom: '28px'
  },
  calculatorTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '8px'
  },
  calculatorDesc: {
    fontSize: '14px',
    color: '#64748b'
  },
  calculatorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '20px'
  },
  calculatorCard: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '12px',
    textAlign: 'center',
    border: '1px solid #e5e7eb'
  },
  calculatorLabel: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  calculatorValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#10b981'
  },
  calculatorNote: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#fff',
    borderRadius: '10px',
    fontSize: '14px',
    color: '#4b5563',
    border: '1px solid #e5e7eb'
  },
  noteIcon: {
    fontSize: '20px',
    flexShrink: 0
  },
  actionSection: {
    padding: '32px 40px',
    display: 'flex',
    gap: '16px',
    justifyContent: 'flex-end',
    backgroundColor: '#f8fafc'
  },
  cancelButton: {
    padding: '14px 32px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#4b5563',
    backgroundColor: '#fff',
    border: '2px solid #d1d5db',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    fontFamily: 'inherit'
  },
  submitButton: {
    padding: '14px 40px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
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
    padding: '40px',
    marginTop: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  infoTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '28px'
  },
  timelineContainer: {
    position: 'relative',
    paddingLeft: '40px',
    marginBottom: '32px'
  },
  timelineItem: {
    position: 'relative',
    paddingBottom: '28px',
    display: 'flex',
    gap: '16px'
  },
  timelineDot: {
    position: 'absolute',
    left: '-28px',
    top: '4px',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    border: '3px solid #f0fdf4',
    zIndex: 1
  },
  timelineContent: {
    flex: 1
  },
  supportNote: {
    display: 'flex',
    gap: '16px',
    padding: '20px',
    backgroundColor: '#f0fdf4',
    borderRadius: '12px',
    border: '1px solid #bbf7d0'
  },
  supportIcon: {
    fontSize: '24px',
    flexShrink: 0
  }
};

export default function LoanApplication() {
  return (
    <ProtectedRoute>
      <LoanApplicationContent />
    </ProtectedRoute>
  );
}

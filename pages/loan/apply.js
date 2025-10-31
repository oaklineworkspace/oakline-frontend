import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

function LoanApplicationContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [formData, setFormData] = useState({
    loan_type: '',
    principal: '',
    term_months: '',
    purpose: '',
    interest_rate: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bankDetails, setBankDetails] = useState(null);

  useEffect(() => {
    fetchBankDetails();
    if (user) {
      fetchUserAccounts();
    }
  }, [user]);

  const fetchBankDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_details')
        .select('*')
        .limit(1)
        .single();

      if (!error && data) {
        setBankDetails(data);
      } else if (error) {
        console.error('Error fetching bank details:', error);
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

  const loanTypes = [
    { value: 'personal', label: 'Personal Loan', rate: 6.99, icon: '👤', desc: 'For personal expenses and consolidation' },
    { value: 'home_mortgage', label: 'Home Mortgage', rate: 7.25, icon: '🏠', desc: 'Finance your dream home' },
    { value: 'auto_loan', label: 'Auto Loan', rate: 5.99, icon: '🚗', desc: 'Get the car you want' },
    { value: 'business', label: 'Business Loan', rate: 8.50, icon: '🏢', desc: 'Grow your business' },
    { value: 'student', label: 'Student Loan', rate: 4.99, icon: '🎓', desc: 'Invest in your education' },
    { value: 'home_equity', label: 'Home Equity Loan', rate: 7.50, icon: '🏡', desc: 'Unlock your home\'s value' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'loan_type') {
      const selectedLoan = loanTypes.find(lt => lt.value === value);
      if (selectedLoan) {
        setFormData(prev => ({ ...prev, interest_rate: selectedLoan.rate.toString() }));
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

      if (accounts.length === 0) {
        setError('You must have an active account to apply for a loan');
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/loan/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          loan_type: formData.loan_type,
          principal: parseFloat(formData.principal),
          term_months: parseInt(formData.term_months),
          purpose: formData.purpose,
          interest_rate: parseFloat(formData.interest_rate)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit loan application');
      }

      setSuccess('Loan application submitted successfully! You will receive an email confirmation shortly.');
      setFormData({
        loan_type: '',
        principal: '',
        term_months: '',
        purpose: '',
        interest_rate: ''
      });

      setTimeout(() => {
        router.push('/loan/dashboard');
      }, 2000);

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

  const selectedLoanType = loanTypes.find(lt => lt.value === formData.loan_type);

  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <div style={styles.hero}>
        <div style={styles.heroContent}>
          <div style={styles.heroIcon}>💼</div>
          <h1 style={styles.heroTitle}>Loan Application</h1>
          <p style={styles.heroSubtitle}>
            Take the next step towards your financial goals. Our streamlined application process
            ensures you get a decision quickly with competitive rates.
          </p>
        </div>
      </div>

      <div style={styles.mainContent}>
        {/* Progress Indicator */}
        <div style={styles.progressBar}>
          <div style={styles.progressStep}>
            <div style={{...styles.progressCircle, ...styles.progressCircleActive}}>1</div>
            <span style={styles.progressLabel}>Application</span>
          </div>
          <div style={styles.progressLine}></div>
          <div style={styles.progressStep}>
            <div style={styles.progressCircle}>2</div>
            <span style={styles.progressLabel}>Review</span>
          </div>
          <div style={styles.progressLine}></div>
          <div style={styles.progressStep}>
            <div style={styles.progressCircle}>3</div>
            <span style={styles.progressLabel}>Approval</span>
          </div>
        </div>

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
          {/* Loan Type Selection */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Select Loan Type</h2>
            <p style={styles.sectionDesc}>Choose the loan product that best fits your needs</p>

            <div style={styles.loanTypeGrid}>
              {loanTypes.map(type => (
                <div
                  key={type.value}
                  onClick={() => handleInputChange({ target: { name: 'loan_type', value: type.value } })}
                  style={{
                    ...styles.loanTypeCard,
                    ...(formData.loan_type === type.value ? styles.loanTypeCardSelected : {})
                  }}
                >
                  <div style={styles.loanTypeIcon}>{type.icon}</div>
                  <h3 style={styles.loanTypeTitle}>{type.label}</h3>
                  <p style={styles.loanTypeDesc}>{type.desc}</p>
                  <div style={styles.loanTypeRate}>
                    <span style={styles.rateValue}>{type.rate}%</span>
                    <span style={styles.rateLabel}>APR</span>
                  </div>
                  {formData.loan_type === type.value && (
                    <div style={styles.selectedBadge}>✓ Selected</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Loan Details */}
          {formData.loan_type && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Loan Details</h2>
              <p style={styles.sectionDesc}>Specify the amount and term for your {selectedLoanType?.label}</p>

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
                      placeholder="10,000"
                      min="1000"
                      max="5000000"
                      step="100"
                      required
                      style={{...styles.input, paddingLeft: '36px'}}
                    />
                  </div>
                  <span style={styles.hint}>Minimum: $1,000 | Maximum: $5,000,000</span>
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
                      min="1"
                      max="360"
                      required
                      style={{...styles.input, paddingRight: '80px'}}
                    />
                    <span style={styles.inputSuffix}>months</span>
                  </div>
                  <span style={styles.hint}>Common terms: 12, 24, 36, 60, 120, 180, 360 months</span>
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
                  placeholder="Please describe in detail how you plan to use the loan funds. For example: 'Consolidating credit card debt totaling $15,000' or 'Purchasing equipment for my consulting business'..."
                  required
                  rows="5"
                  style={styles.textarea}
                />
                <span style={styles.hint}>Provide specific details to help us process your application faster</span>
              </div>
            </div>
          )}

          {/* Payment Calculator */}
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

          {/* Action Buttons */}
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
              disabled={loading || !formData.loan_type}
              style={{
                ...styles.submitButton,
                ...((loading || !formData.loan_type) ? styles.submitButtonDisabled : {})
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
        </form>

        {/* Information Box */}
        <div style={styles.infoBox}>
          <h3 style={styles.infoTitle}>📋 What Happens Next?</h3>
          <div style={styles.timelineContainer}>
            <div style={styles.timelineItem}>
              <div style={styles.timelineDot}></div>
              <div style={styles.timelineContent}>
                <strong>Immediate Confirmation</strong>
                <p>You'll receive an email confirming receipt of your application</p>
              </div>
            </div>
            <div style={styles.timelineItem}>
              <div style={styles.timelineDot}></div>
              <div style={styles.timelineContent}>
                <strong>Application Review</strong>
                <p>Our loan department will review your application within 24-48 hours</p>
              </div>
            </div>
            <div style={styles.timelineItem}>
              <div style={styles.timelineDot}></div>
              <div style={styles.timelineContent}>
                <strong>Decision Notification</strong>
                <p>You'll receive an in-app notification and email with the decision</p>
              </div>
            </div>
            <div style={styles.timelineItem}>
              <div style={styles.timelineDot}></div>
              <div style={styles.timelineContent}>
                <strong>Funding (if approved)</strong>
                <p>Approved funds will be credited to your active account</p>
              </div>
            </div>
          </div>

          <div style={styles.supportNote}>
            <span style={styles.supportIcon}>💬</span>
            <div>
              Need assistance? Contact our support team at{' '}
              <a href={`tel:${bankDetails?.phone || '+1 (636) 635-6122'}`} style={{ color: '#1A3E6F', fontWeight: '600', textDecoration: 'none', wordBreak: 'break-word' }}>
                {bankDetails?.phone || '+1 (636) 635-6122'}
              </a>{' '}
              or email{' '}
              <a href={`mailto:${bankDetails?.email_contact || 'contact-us@theoaklinebank.com'}`} style={{ color: '#1A3E6F', fontWeight: '600', textDecoration: 'none', wordBreak: 'break-word' }}>
                {bankDetails?.email_contact || 'contact-us@theoaklinebank.com'}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
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
  mainContent: {
    maxWidth: '1000px',
    margin: '-40px auto 0',
    padding: '0 20px 60px',
    position: 'relative'
  },
  progressBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    marginBottom: '30px'
  },
  progressStep: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },
  progressCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '18px',
    color: '#6b7280',
    transition: 'all 0.3s'
  },
  progressCircleActive: {
    backgroundColor: '#10b981',
    color: '#fff',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
  },
  progressLine: {
    width: '80px',
    height: '3px',
    backgroundColor: '#e5e7eb',
    margin: '0 20px'
  },
  progressLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#64748b'
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
    transition: 'all 0.3s ease',
    ':hover': {
      borderColor: '#10b981',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
    }
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
    gap: '6px'
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
  },
  link: {
    color: '#10b981',
    textDecoration: 'none',
    fontWeight: '600'
  }
};

// Add CSS animation for spinner and input styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    input[type="number"]::-webkit-inner-spin-button,
    input[type="number"]::-webkit-outer-spin-button {
      opacity: 1;
    }

    input:focus,
    textarea:focus {
      border-color: #10b981 !important;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1) !important;
    }

    input::placeholder,
    textarea::placeholder {
      color: #9ca3af;
      font-weight: 400;
    }
  `;
  document.head.appendChild(style);
}

export default function LoanApplication() {
  return (
    <ProtectedRoute>
      <LoanApplicationContent />
    </ProtectedRoute>
  );
}
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function SignupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    accountNumber: '',
    verificationCode: '',
    ssnLast4: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: ''
  });

  const [accountData, setAccountData] = useState(null);
  const [codeSent, setCodeSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Timer for resend code
  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  // Step 1: Verify Account Number
  const handleAccountVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/enrollment/verify-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNumber: formData.accountNumber })
      });

      const data = await response.json();

      if (response.ok) {
        setAccountData(data.account);
        setCodeSent(true);
        setSuccess('Verification code sent to your email on file');
        startResendTimer();
        setCurrentStep(2);
      } else {
        setError(data.error || 'Account not found or not eligible for enrollment');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Account verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Resend verification code
  const handleResendCode = async () => {
    if (resendTimer > 0) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/enrollment/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNumber: formData.accountNumber })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Verification code resent to your email');
        startResendTimer();
      } else {
        setError(data.error || 'Failed to resend code');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Email Code
  const handleCodeVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/enrollment/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accountNumber: formData.accountNumber,
          code: formData.verificationCode 
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Email verified successfully');
        setCurrentStep(3);
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verify SSN Last 4
  const handleSSNVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.ssnLast4.length !== 4 || !/^\d{4}$/.test(formData.ssnLast4)) {
      setError('Please enter exactly 4 digits');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/enrollment/verify-ssn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accountNumber: formData.accountNumber,
          ssnLast4: formData.ssnLast4 
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('SSN verified successfully');
        setCurrentStep(4);
      } else {
        setError(data.error || 'SSN does not match our records');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Verify Name
  const handleNameVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('Please enter both first and last name');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/enrollment/verify-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accountNumber: formData.accountNumber,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Name verified successfully');
        setCurrentStep(5);
      } else {
        setError(data.error || 'Name does not match our records');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Create Password and Complete Enrollment
  const handlePasswordCreation = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validate passwords
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/enrollment/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accountNumber: formData.accountNumber,
          password: formData.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Enrollment complete! Redirecting to login...');
        setTimeout(() => {
          router.push('/login?enrolled=true');
        }, 2000);
      } else {
        setError(data.error || 'Failed to complete enrollment');
      }
    } catch (err) {
      console.error('Enrollment error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      'Account Number',
      'Email Verification',
      'SSN Verification',
      'Name Verification',
      'Create Password'
    ];

    return (
      <div style={styles.stepIndicator}>
        {steps.map((step, index) => (
          <div key={index} style={styles.stepItem}>
            <div style={{
              ...styles.stepCircle,
              ...(currentStep > index + 1 ? styles.stepCompleted : {}),
              ...(currentStep === index + 1 ? styles.stepActive : {})
            }}>
              {currentStep > index + 1 ? '✓' : index + 1}
            </div>
            <span style={styles.stepLabel}>{step}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <Link href="/">
            <img 
              src="/images/Oakline_Bank_logo_design_c1b04ae0.png" 
              alt="Oakline Bank" 
              style={styles.logo}
            />
          </Link>
          <h1 style={styles.title}>Account Enrollment</h1>
          <p style={styles.subtitle}>Complete these steps to access your account online</p>
        </div>

        {renderStepIndicator()}

        {error && (
          <div style={styles.errorBox}>
            <span style={styles.errorIcon}>⚠️</span>
            {error}
          </div>
        )}

        {success && (
          <div style={styles.successBox}>
            <span style={styles.successIcon}>✓</span>
            {success}
          </div>
        )}

        <div style={styles.formContainer}>
          {/* Step 1: Account Number */}
          {currentStep === 1 && (
            <form onSubmit={handleAccountVerification}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Account Number</label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                  placeholder="Enter your account number"
                  required
                  style={styles.input}
                  maxLength="20"
                />
                <p style={styles.helpText}>
                  Enter the account number from your approval letter
                </p>
              </div>
              <button type="submit" disabled={loading} style={styles.button}>
                {loading ? 'Verifying...' : 'Continue'}
              </button>
            </form>
          )}

          {/* Step 2: Email Verification Code */}
          {currentStep === 2 && (
            <form onSubmit={handleCodeVerification}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Verification Code</label>
                <input
                  type="text"
                  name="verificationCode"
                  value={formData.verificationCode}
                  onChange={handleInputChange}
                  placeholder="Enter 6-digit code"
                  required
                  style={styles.input}
                  maxLength="6"
                />
                <p style={styles.helpText}>
                  Check your email for the verification code
                </p>
              </div>
              <button type="submit" disabled={loading} style={styles.button}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              <button 
                type="button" 
                onClick={handleResendCode}
                disabled={resendTimer > 0 || loading}
                style={styles.secondaryButton}
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
              </button>
            </form>
          )}

          {/* Step 3: SSN Last 4 */}
          {currentStep === 3 && (
            <form onSubmit={handleSSNVerification}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Last 4 Digits of SSN</label>
                <input
                  type="text"
                  name="ssnLast4"
                  value={formData.ssnLast4}
                  onChange={handleInputChange}
                  placeholder="XXXX"
                  required
                  style={styles.input}
                  maxLength="4"
                  pattern="\d{4}"
                />
                <p style={styles.helpText}>
                  Enter the last 4 digits of your Social Security Number
                </p>
              </div>
              <button type="submit" disabled={loading} style={styles.button}>
                {loading ? 'Verifying...' : 'Verify SSN'}
              </button>
            </form>
          )}

          {/* Step 4: Name Verification */}
          {currentStep === 4 && (
            <form onSubmit={handleNameVerification}>
              <div style={styles.formGroup}>
                <label style={styles.label}>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="Enter your first name"
                  required
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Enter your last name"
                  required
                  style={styles.input}
                />
              </div>
              <p style={styles.helpText}>
                Enter your name exactly as it appears on your application
              </p>
              <button type="submit" disabled={loading} style={styles.button}>
                {loading ? 'Verifying...' : 'Verify Name'}
              </button>
            </form>
          )}

          {/* Step 5: Create Password */}
          {currentStep === 5 && (
            <form onSubmit={handlePasswordCreation}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Create Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter password (min 8 characters)"
                  required
                  style={styles.input}
                  minLength="8"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Re-enter password"
                  required
                  style={styles.input}
                  minLength="8"
                />
              </div>
              <div style={styles.passwordRequirements}>
                <p style={styles.requirementTitle}>Password Requirements:</p>
                <ul style={styles.requirementList}>
                  <li>At least 8 characters long</li>
                  <li>Passwords must match</li>
                </ul>
              </div>
              <button type="submit" disabled={loading} style={styles.button}>
                {loading ? 'Creating Account...' : 'Complete Enrollment'}
              </button>
            </form>
          )}
        </div>

        <div style={styles.footer}>
          <p>Already enrolled? <Link href="/login" style={styles.link}>Sign In</Link></p>
          <p>Need help? <Link href="/contact" style={styles.link}>Contact Support</Link></p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    maxWidth: '600px',
    width: '100%',
    padding: '2.5rem',
    animation: 'fadeIn 0.5s ease-in'
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem'
  },
  logo: {
    height: '60px',
    marginBottom: '1rem',
    cursor: 'pointer'
  },
  title: {
    color: '#1A3E6F',
    fontSize: '2rem',
    fontWeight: '700',
    margin: '0 0 0.5rem 0'
  },
  subtitle: {
    color: '#64748b',
    fontSize: '1rem',
    margin: 0
  },
  stepIndicator: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  stepItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: '1',
    minWidth: '80px'
  },
  stepCircle: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    marginBottom: '0.5rem',
    fontSize: '0.9rem'
  },
  stepActive: {
    backgroundColor: '#1A3E6F',
    color: '#ffffff'
  },
  stepCompleted: {
    backgroundColor: '#10b981',
    color: '#ffffff'
  },
  stepLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    textAlign: 'center'
  },
  formContainer: {
    marginTop: '1.5rem'
  },
  formGroup: {
    marginBottom: '1.5rem'
  },
  label: {
    display: 'block',
    color: '#1A3E6F',
    fontWeight: '600',
    marginBottom: '0.5rem',
    fontSize: '0.95rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '1rem',
    transition: 'border-color 0.3s',
    boxSizing: 'border-box',
    outline: 'none'
  },
  helpText: {
    fontSize: '0.85rem',
    color: '#64748b',
    marginTop: '0.5rem',
    marginBottom: 0
  },
  button: {
    width: '100%',
    padding: '0.875rem',
    backgroundColor: '#1A3E6F',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
    marginTop: '1rem'
  },
  secondaryButton: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#f1f5f9',
    color: '#1A3E6F',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginTop: '0.75rem'
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    border: '1px solid #ef4444',
    color: '#991b1b',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  errorIcon: {
    fontSize: '1.25rem'
  },
  successBox: {
    backgroundColor: '#d1fae5',
    border: '1px solid #10b981',
    color: '#065f46',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  successIcon: {
    fontSize: '1.25rem',
    fontWeight: 'bold'
  },
  passwordRequirements: {
    backgroundColor: '#f1f5f9',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem'
  },
  requirementTitle: {
    color: '#1A3E6F',
    fontWeight: '600',
    marginTop: 0,
    marginBottom: '0.5rem',
    fontSize: '0.9rem'
  },
  requirementList: {
    margin: 0,
    paddingLeft: '1.5rem',
    color: '#64748b',
    fontSize: '0.85rem'
  },
  footer: {
    marginTop: '2rem',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '0.9rem'
  },
  link: {
    color: '#1A3E6F',
    textDecoration: 'none',
    fontWeight: '600'
  }
};
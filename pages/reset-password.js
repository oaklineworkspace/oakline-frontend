import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function ResetPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] });
  const router = useRouter();

  const checkPasswordStrength = (password) => {
    const feedback = [];
    let score = 0;

    if (password.length >= 8) {
      score += 1;
      feedback.push('✓ At least 8 characters');
    } else {
      feedback.push('✗ At least 8 characters');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
      feedback.push('✓ Contains uppercase letter');
    } else {
      feedback.push('✗ Contains uppercase letter');
    }

    if (/[a-z]/.test(password)) {
      score += 1;
      feedback.push('✓ Contains lowercase letter');
    } else {
      feedback.push('✗ Contains lowercase letter');
    }

    if (/[0-9]/.test(password)) {
      score += 1;
      feedback.push('✓ Contains number');
    } else {
      feedback.push('✗ Contains number');
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
      feedback.push('✓ Contains special character');
    } else {
      feedback.push('✗ Contains special character');
    }

    setPasswordStrength({ score, feedback });
    return score >= 5;
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/request-password-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setStep(2);
        setMessage(data.message || 'A 6-digit verification code has been sent to your email address.');
      } else {
        setError(data.error || 'Failed to send verification code');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      if (!email || !code || !newPassword || !confirmPassword) {
        throw new Error('Please fill in all fields');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (!checkPasswordStrength(newPassword)) {
        throw new Error('Password does not meet security requirements');
      }

      const response = await fetch('/api/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('✅ Password reset successful! Redirecting to login...');
        setIsSuccess(true);

        setTimeout(() => {
          router.push('/sign-in');
        }, 3000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/" style={styles.logoContainer}>
            <span style={styles.logoIcon}>🏦</span>
            <div style={styles.brandInfo}>
              <span style={styles.bankName}>Oakline Bank</span>
              <span style={styles.tagline}>Secure Password Recovery</span>
            </div>
          </Link>

          <div style={styles.headerActions}>
            <Link href="/sign-in" style={styles.headerButton}>Sign In</Link>
            <Link href="/apply" style={styles.headerButton}>Open Account</Link>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.contentWrapper}>
          <div style={styles.heroSection}>
            <div style={styles.heroContent}>
              <h1 style={styles.heroTitle}>🔐 Secure Password Recovery</h1>
              <p style={styles.heroSubtitle}>
                Reset your password securely with our 6-digit verification code system. Your account security is our top priority.
              </p>

              <div style={styles.securityFeatures}>
                <div style={styles.feature}>
                  <span style={styles.featureIcon}>🔐</span>
                  <span>Bank-Level Security</span>
                </div>
                <div style={styles.feature}>
                  <span style={styles.featureIcon}>📧</span>
                  <span>Email Verification</span>
                </div>
                <div style={styles.feature}>
                  <span style={styles.featureIcon}>⚡</span>
                  <span>10-Minute Code</span>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.resetSection}>
            <div style={styles.resetCard}>
              <div style={styles.resetHeader}>
                <div style={styles.cardLogo}>🏦</div>
                <h2 style={styles.resetTitle}>
                  {step === 1 ? 'Request Verification Code' : 'Reset Your Password'}
                </h2>
                <p style={styles.resetSubtitle}>
                  {step === 1 
                    ? 'Enter your email address and we\'ll send you a 6-digit verification code'
                    : 'Enter the code from your email and create a new password'}
                </p>
              </div>

              {message && (
                <div style={styles.successMessage}>
                  <div style={styles.successIcon}>✅</div>
                  <p style={styles.successText}>{message}</p>
                </div>
              )}

              {error && (
                <div style={styles.errorMessage}>
                  <span style={styles.errorIcon}>⚠️</span>
                  {error}
                </div>
              )}

              {step === 1 && !isSuccess ? (
                <form onSubmit={handleRequestCode} style={styles.form}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Email Address *</label>
                    <input
                      type="email"
                      placeholder="Enter your registered email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={styles.input}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      ...styles.resetButton,
                      backgroundColor: loading ? '#9ca3af' : '#2563eb',
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? (
                      <span style={styles.loadingContent}>
                        <span style={styles.spinner}></span>
                        Sending Code...
                      </span>
                    ) : (
                      <>
                        <span style={styles.buttonIcon}>📧</span>
                        Send Verification Code
                      </>
                    )}
                  </button>
                </form>
              ) : step === 2 && !isSuccess ? (
                <form onSubmit={handleResetPassword} style={styles.form}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Email Address *</label>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Verification Code *</label>
                    <p style={styles.codeHint}>
                      Enter the 6-digit code sent to your email
                    </p>
                    <input
                      type="text"
                      placeholder="000000"
                      required
                      maxLength={6}
                      pattern="[0-9]{6}"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      style={{
                        ...styles.input,
                        fontSize: '1.5rem',
                        letterSpacing: '0.5rem',
                        textAlign: 'center',
                        fontFamily: 'monospace'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      style={styles.resendLink}
                    >
                      Didn't receive code? Request new code
                    </button>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>New Password *</label>
                    <p style={styles.passwordRequirements}>
                      Password must contain: 8+ characters, uppercase, lowercase, number, and special character
                    </p>
                    <div style={styles.passwordInputWrapper}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your new password"
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          checkPasswordStrength(e.target.value);
                        }}
                        style={styles.input}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={styles.togglePassword}
                      >
                        {showPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>

                    {newPassword && (
                      <div style={styles.passwordStrength}>
                        <div style={styles.strengthBar}>
                          <div style={{
                            ...styles.strengthFill,
                            width: `${(passwordStrength.score / 5) * 100}%`,
                            backgroundColor: passwordStrength.score < 3 ? '#ef4444' : passwordStrength.score < 5 ? '#f59e0b' : '#10b981'
                          }}></div>
                        </div>
                        <div style={styles.strengthFeedback}>
                          {passwordStrength.feedback.map((item, index) => (
                            <div key={index} style={{
                              ...styles.feedbackItem,
                              color: item.startsWith('✓') ? '#10b981' : '#ef4444'
                            }}>
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Confirm New Password *</label>
                    <div style={styles.passwordInputWrapper}>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your new password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={styles.input}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={styles.togglePassword}
                      >
                        {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <div style={styles.passwordMismatch}>
                        ⚠️ Passwords do not match
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || passwordStrength.score < 5}
                    style={{
                      ...styles.resetButton,
                      backgroundColor: loading || passwordStrength.score < 5 ? '#9ca3af' : '#1e40af',
                      cursor: loading || passwordStrength.score < 5 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? (
                      <span style={styles.loadingContent}>
                        <span style={styles.spinner}></span>
                        Resetting Password...
                      </span>
                    ) : (
                      <>
                        <span style={styles.buttonIcon}>🔒</span>
                        Reset Password
                      </>
                    )}
                  </button>
                </form>
              ) : null}

              <div style={styles.helpSection}>
                <h3 style={styles.helpTitle}>Need Additional Help?</h3>
                <div style={styles.helpOptions}>
                  <Link href="/support" style={styles.helpLink}>
                    💬 Contact Support
                  </Link>
                  <Link href="/faq" style={styles.helpLink}>
                    ❓ View FAQ
                  </Link>
                  <a href="tel:+16366356122" style={styles.helpLink}>
                    📞 Call: (636) 635-6122
                  </a>
                </div>
              </div>

              <div style={styles.backToLogin}>
                <Link href="/sign-in" style={styles.backLink}>
                  ← Back to Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerSection}>
            <h4 style={styles.footerTitle}>Equal Housing Lender</h4>
            <p style={styles.footerText}>NMLS ID: 574160</p>
          </div>
          <div style={styles.footerSection}>
            <h4 style={styles.footerTitle}>Security Notice</h4>
            <p style={styles.footerText}>
              Oakline Bank will never ask for your password or verification code via phone.
              Always access your account through our official website.
            </p>
          </div>
        </div>
        <div style={styles.footerBottom}>
          <p style={styles.copyright}>
            © 2025 Oakline Bank. All rights reserved. Member FDIC. Routing: 075915826
          </p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    width: '100%',
    overflowX: 'hidden'
  },
  header: {
    backgroundColor: '#1e40af',
    color: 'white',
    padding: '1rem 1.5rem',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.2)'
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    textDecoration: 'none',
    color: 'white'
  },
  logoIcon: {
    fontSize: '2.5rem'
  },
  brandInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  bankName: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    margin: 0,
    color: 'white'
  },
  tagline: {
    fontSize: '0.9rem',
    color: '#bfdbfe'
  },
  headerActions: {
    display: 'flex',
    gap: '1rem'
  },
  headerButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.3s ease'
  },
  main: {
    flex: 1,
    minHeight: 'calc(100vh - 120px)'
  },
  contentWrapper: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 'calc(100vh - 120px)'
  },
  heroSection: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    padding: '2rem 1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '30vh'
  },
  heroContent: {
    maxWidth: '600px',
    textAlign: 'center'
  },
  heroTitle: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    marginBottom: '1.5rem',
    lineHeight: '1.2'
  },
  heroSubtitle: {
    fontSize: '1.1rem',
    marginBottom: '2rem',
    lineHeight: '1.6',
    opacity: 0.9
  },
  securityFeatures: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    flexWrap: 'wrap'
  },
  feature: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    fontWeight: '500',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: '0.75rem 1rem',
    borderRadius: '20px',
    backdropFilter: 'blur(10px)'
  },
  featureIcon: {
    fontSize: '1.2rem'
  },
  resetSection: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem'
  },
  resetCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
    maxWidth: '550px',
    width: '100%',
    padding: '2.5rem',
    margin: '2rem auto'
  },
  resetHeader: {
    textAlign: 'center',
    marginBottom: '2rem'
  },
  cardLogo: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },
  resetTitle: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  resetSubtitle: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: '1.6'
  },
  successMessage: {
    backgroundColor: '#f0fdf4',
    border: '2px solid #22c55e',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  successIcon: {
    fontSize: '1.5rem'
  },
  successText: {
    color: '#166534',
    fontSize: '0.95rem',
    fontWeight: '500',
    margin: 0
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    border: '2px solid #ef4444',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1.5rem',
    color: '#991b1b',
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  errorIcon: {
    fontSize: '1.2rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.25rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '1rem',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    outline: 'none'
  },
  codeHint: {
    fontSize: '0.85rem',
    color: '#64748b',
    margin: '0 0 0.25rem 0'
  },
  resendLink: {
    marginTop: '0.5rem',
    padding: 0,
    background: 'none',
    border: 'none',
    color: '#2563eb',
    fontSize: '0.85rem',
    cursor: 'pointer',
    textAlign: 'left',
    textDecoration: 'underline'
  },
  passwordRequirements: {
    fontSize: '0.8rem',
    color: '#64748b',
    margin: '0 0 0.25rem 0'
  },
  passwordInputWrapper: {
    position: 'relative',
    width: '100%'
  },
  togglePassword: {
    position: 'absolute',
    right: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.2rem',
    padding: '0.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  passwordStrength: {
    marginTop: '0.75rem'
  },
  strengthBar: {
    width: '100%',
    height: '4px',
    backgroundColor: '#e2e8f0',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '0.75rem'
  },
  strengthFill: {
    height: '100%',
    transition: 'all 0.3s ease',
    borderRadius: '2px'
  },
  strengthFeedback: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '0.5rem'
  },
  feedbackItem: {
    fontSize: '0.8rem',
    fontWeight: '500'
  },
  passwordMismatch: {
    color: '#ef4444',
    fontSize: '0.85rem',
    marginTop: '0.5rem',
    fontWeight: '500'
  },
  resetButton: {
    width: '100%',
    padding: '1rem',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
  },
  loadingContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  buttonIcon: {
    fontSize: '1.2rem'
  },
  helpSection: {
    marginTop: '2rem',
    paddingTop: '2rem',
    borderTop: '1px solid #e2e8f0'
  },
  helpTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '1rem',
    textAlign: 'center'
  },
  helpOptions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    justifyContent: 'center'
  },
  helpLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  },
  backToLogin: {
    marginTop: '1.5rem',
    textAlign: 'center'
  },
  backLink: {
    color: '#2563eb',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  },
  footer: {
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    padding: '2rem 1.5rem 1rem',
    marginTop: 'auto'
  },
  footerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem',
    marginBottom: '2rem'
  },
  footerSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  footerTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#ffffff',
    margin: 0
  },
  footerText: {
    fontSize: '0.85rem',
    color: '#cbd5e1',
    margin: 0,
    lineHeight: '1.6'
  },
  footerBottom: {
    borderTop: '1px solid #334155',
    paddingTop: '1rem',
    textAlign: 'center'
  },
  copyright: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    margin: 0
  }
};

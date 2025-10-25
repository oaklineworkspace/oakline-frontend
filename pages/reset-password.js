import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] });
  const router = useRouter();

  useEffect(() => {
    // Check if this is a password reset callback
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    const accessToken = hashParams.get('access_token');

    if (type === 'recovery' && accessToken) {
      setIsResetMode(true);
    }
  }, []);

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
    return score >= 4;
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setIsSuccess(true);
      setMessage('Password reset instructions have been sent to your email address. Please check your inbox and spam folder.');
    } catch (error) {
      setError(`Error: ${error.message}`);
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
      if (!newPassword || !confirmPassword) {
        throw new Error('Please fill in all fields');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (!checkPasswordStrength(newPassword)) {
        throw new Error('Password does not meet security requirements');
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setMessage('✅ Password reset successful! Redirecting to login...');
      setIsSuccess(true);

      setTimeout(() => {
        router.push('/sign-in');
      }, 3000);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Oakline Bank Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/" style={styles.logoContainer}>
            <img src="/images/logo-primary.png" alt="Oakline Bank" style={styles.logo} />
            <div style={styles.brandInfo}>
              <span style={styles.bankName}>Oakline Bank</span>
              <span style={styles.tagline}>
                {isResetMode ? 'Create New Password' : 'Secure Password Recovery'}
              </span>
            </div>
          </Link>

          <div style={styles.headerActions}>
            <Link href="/sign-in" style={styles.headerButton}>Sign In</Link>
            <Link href="/enroll" style={styles.headerButton}>Enroll Now</Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.contentWrapper}>
          {/* Hero Section */}
          <div style={styles.heroSection}>
            <div style={styles.heroContent}>
              <h1 style={styles.heroTitle}>
                {isResetMode ? '🔐 Create New Password' : '🔐 Secure Password Recovery'}
              </h1>
              <p style={styles.heroSubtitle}>
                {isResetMode 
                  ? 'Set a strong, secure password for your Oakline Bank account.'
                  : 'Reset your password securely with our advanced verification system. Your account security is our top priority.'}
              </p>

              {!isResetMode && (
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
                    <span>Instant Reset Link</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reset Form Section */}
          <div style={styles.resetSection}>
            <div style={styles.resetCard}>
              <div style={styles.resetHeader}>
                <div style={styles.cardLogo}>
                  <img src="/images/logo-primary.png" alt="Oakline Bank" style={styles.cardLogoImg} />
                </div>
                <h2 style={styles.resetTitle}>
                  {isResetMode ? 'Set Your New Password' : 'Reset Your Password'}
                </h2>
                <p style={styles.resetSubtitle}>
                  {isResetMode 
                    ? 'Create a strong password that meets our security requirements'
                    : 'Enter your email address and we\'ll send you a secure link to reset your password'}
                </p>
              </div>

              {/* Success Messages */}
              {message && (
                <div style={styles.successMessage}>
                  <div style={styles.successIcon}>✅</div>
                  <p style={styles.successText}>{message}</p>
                </div>
              )}

              {/* Error Messages */}
              {error && (
                <div style={styles.errorMessage}>
                  <span style={styles.errorIcon}>⚠️</span>
                  {error}
                </div>
              )}

              {/* Password Reset Mode */}
              {isResetMode && !isSuccess ? (
                <form onSubmit={handleResetPassword} style={styles.form}>
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

                    {/* Password Strength Indicator */}
                    {newPassword && (
                      <div style={styles.passwordStrength}>
                        <div style={styles.strengthBar}>
                          <div style={{
                            ...styles.strengthFill,
                            width: `${(passwordStrength.score / 5) * 100}%`,
                            backgroundColor: passwordStrength.score < 3 ? '#ef4444' : passwordStrength.score < 4 ? '#f59e0b' : '#10b981'
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
                    disabled={loading || passwordStrength.score < 4}
                    style={{
                      ...styles.resetButton,
                      backgroundColor: loading || passwordStrength.score < 4 ? '#9ca3af' : '#1e40af',
                      cursor: loading || passwordStrength.score < 4 ? 'not-allowed' : 'pointer'
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
              ) : !isSuccess && !isResetMode ? (
                // Request Reset Mode
                <form onSubmit={handleRequestReset} style={styles.form}>
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
                      backgroundColor: loading ? '#9ca3af' : '#1e40af',
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? (
                      <span style={styles.loadingContent}>
                        <span style={styles.spinner}></span>
                        Sending Reset Link...
                      </span>
                    ) : (
                      <>
                        <span style={styles.buttonIcon}>📧</span>
                        Send Reset Link
                      </>
                    )}
                  </button>
                </form>
              ) : null}

              {/* Help Section */}
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

              {/* Back to Login */}
              <div style={styles.backToLogin}>
                <Link href="/sign-in" style={styles.backLink}>
                  ← Back to Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerSection}>
            <h4 style={styles.footerTitle}>Equal Housing Lender</h4>
            <p style={styles.footerText}>
              NMLS ID: 1847293
            </p>
          </div>
          <div style={styles.footerSection}>
            <h4 style={styles.footerTitle}>Security Notice</h4>
            <p style={styles.footerText}>
              Oakline Bank will never ask for your password via email or phone. 
              Always access your account through our official website.
            </p>
          </div>
        </div>
        <div style={styles.footerBottom}>
          <p style={styles.copyright}>
            © 2024 Oakline Bank. All rights reserved. Member FDIC. Routing: 075915826
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
  logo: {
    height: '50px',
    width: 'auto'
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
    backgroundColor: 'white',
    padding: '2rem 1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1
  },
  resetCard: {
    width: '100%',
    maxWidth: '500px',
    backgroundColor: 'white',
    borderRadius: '20px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    padding: '2.5rem',
    border: '2px solid #e2e8f0'
  },
  resetHeader: {
    textAlign: 'center',
    marginBottom: '2rem'
  },
  cardLogo: {
    marginBottom: '1rem'
  },
  cardLogoImg: {
    height: '40px',
    width: 'auto'
  },
  resetTitle: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: '0.5rem'
  },
  resetSubtitle: {
    fontSize: '1rem',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.5'
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
    color: '#374151'
  },
  passwordRequirements: {
    fontSize: '0.8rem',
    color: '#6b7280',
    marginTop: '-0.25rem',
    marginBottom: '0.5rem',
    fontStyle: 'italic'
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
  passwordInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  togglePassword: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.2rem',
    padding: '0.5rem'
  },
  passwordStrength: {
    marginTop: '0.5rem'
  },
  strengthBar: {
    height: '6px',
    backgroundColor: '#e2e8f0',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '0.75rem'
  },
  strengthFill: {
    height: '100%',
    transition: 'all 0.3s ease',
    borderRadius: '3px'
  },
  strengthFeedback: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.5rem',
    fontSize: '0.8rem'
  },
  feedbackItem: {
    padding: '0.25rem 0'
  },
  passwordMismatch: {
    fontSize: '0.8rem',
    color: '#ef4444',
    marginTop: '0.25rem'
  },
  resetButton: {
    width: '100%',
    padding: '1rem',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    marginTop: '0.5rem'
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
    fontSize: '1rem'
  },
  successMessage: {
    textAlign: 'center',
    padding: '1.5rem',
    backgroundColor: '#d1fae5',
    borderRadius: '12px',
    border: '2px solid #10b981',
    marginBottom: '1.5rem'
  },
  successIcon: {
    fontSize: '3rem',
    marginBottom: '0.5rem'
  },
  successText: {
    fontSize: '1rem',
    color: '#065f46',
    margin: 0,
    lineHeight: '1.5',
    fontWeight: '500'
  },
  errorMessage: {
    marginBottom: '1rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#fef2f2',
    border: '2px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '0.9rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  errorIcon: {
    fontSize: '1rem'
  },
  helpSection: {
    marginTop: '2rem',
    padding: '1.5rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  helpTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: '1rem',
    textAlign: 'center'
  },
  helpOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  helpLink: {
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '500',
    textAlign: 'center',
    padding: '0.5rem',
    transition: 'color 0.3s ease'
  },
  backToLogin: {
    marginTop: '1.5rem',
    textAlign: 'center',
    paddingTop: '1rem',
    borderTop: '1px solid #e2e8f0'
  },
  backLink: {
    color: '#1e40af',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '600',
    transition: 'color 0.3s ease'
  },
  footer: {
    backgroundColor: '#1f2937',
    color: 'white',
    padding: '2rem 1.5rem 1rem'
  },
  footerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    textAlign: 'center'
  },
  footerSection: {
    marginBottom: '1rem'
  },
  footerTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: '0.5rem'
  },
  footerText: {
    fontSize: '0.9rem',
    lineHeight: '1.5',
    color: '#d1d5db'
  },
  footerBottom: {
    borderTop: '1px solid #374151',
    paddingTop: '1rem',
    textAlign: 'center'
  },
  copyright: {
    fontSize: '0.8rem',
    color: '#9ca3af',
    margin: 0
  }
};
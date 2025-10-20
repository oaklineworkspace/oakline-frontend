
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password?mode=reset`,
      });

      if (error) throw error;

      setIsSuccess(true);
      setMessage('Password reset instructions have been sent to your email address.');
    } catch (error) {
      setMessage(`Error: ${error.message}`);
      setIsSuccess(false);
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
              <span style={styles.tagline}>Secure Password Recovery</span>
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
              <h1 style={styles.heroTitle}>Secure Password Recovery</h1>
              <p style={styles.heroSubtitle}>
                Reset your password securely with our advanced verification system. 
                Your account security is our top priority.
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
                  <span>Instant Reset Link</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reset Form Section */}
          <div style={styles.resetSection}>
            <div style={styles.resetCard}>
              <div style={styles.resetHeader}>
                <div style={styles.cardLogo}>
                  <img src="/images/logo-primary.png" alt="Oakline Bank" style={styles.cardLogoImg} />
                </div>
                <h2 style={styles.resetTitle}>Reset Your Password</h2>
                <p style={styles.resetSubtitle}>
                  Enter your email address and we'll send you a secure link to reset your password
                </p>
              </div>

              {!isSuccess ? (
                <form onSubmit={handleSubmit} style={styles.form}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Email Address</label>
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
              ) : (
                <div style={styles.successMessage}>
                  <div style={styles.successIcon}>✅</div>
                  <h3 style={styles.successTitle}>Reset Link Sent!</h3>
                  <p style={styles.successText}>
                    We've sent password reset instructions to <strong>{email}</strong>
                  </p>
                  <p style={styles.successSubtext}>
                    Please check your email and follow the link to reset your password. 
                    The link will expire in 24 hours for security.
                  </p>
                </div>
              )}

              {message && !isSuccess && (
                <div style={styles.errorMessage}>
                  <span style={styles.errorIcon}>⚠️</span>
                  {message}
                </div>
              )}

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
                  <a href="tel:+1-800-OAKLINE" style={styles.helpLink}>
                    📞 Call: 1-800-OAKLINE
                  </a>
                </div>
              </div>

              {/* Back to Login */}
              <div style={styles.backToLogin}>
                <Link href="/login" style={styles.backLink}>
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
    padding: '2rem 1rem'
  },
  successIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },
  successTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#16a34a',
    marginBottom: '1rem'
  },
  successText: {
    fontSize: '1rem',
    color: '#374151',
    marginBottom: '1rem',
    lineHeight: '1.6'
  },
  successSubtext: {
    fontSize: '0.9rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  errorMessage: {
    marginTop: '1rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
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

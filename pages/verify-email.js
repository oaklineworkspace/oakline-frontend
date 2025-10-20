
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function VerifyEmail() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const router = useRouter();
  const { token_hash, type } = router.query;

  useEffect(() => {
    // Check if user is already logged in
    checkUser();
    
    // Handle email verification token
    if (token_hash && type === 'email') {
      verifyEmailToken(token_hash);
    }
  }, [token_hash, type]);

  useEffect(() => {
    // Cooldown timer
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email);
        setIsVerified(user.email_confirmed_at !== null);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  const verifyEmailToken = async (token) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });

      if (error) throw error;

      setIsVerified(true);
      setMessage('Email verified successfully! You can now access all features.');
      
      // Redirect to dashboard after verification
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
      
    } catch (error) {
      setError(`Email verification failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    if (!email || resendCooldown > 0) return;
    
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`
        }
      });

      if (error) throw error;

      setMessage('Verification email sent! Please check your inbox and spam folder.');
      setResendCooldown(60); // 60 second cooldown
    } catch (error) {
      setError(`Failed to send verification email: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({ email: email });
      
      if (error) throw error;
      
      setMessage('Email update initiated. Please check your new email for verification.');
    } catch (error) {
      setError(`Failed to update email: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/" style={styles.logoContainer}>
            <img src="/images/logo-primary.png" alt="Oakline Bank" style={styles.logo} />
            <div style={styles.brandInfo}>
              <span style={styles.bankName}>Oakline Bank</span>
              <span style={styles.tagline}>Email Verification</span>
            </div>
          </Link>
          
          <div style={styles.headerActions}>
            <Link href="/sign-in" style={styles.headerButton}>Sign In</Link>
            <Link href="/dashboard" style={styles.headerButton}>Dashboard</Link>
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
                {isVerified ? 'Email Verified!' : 'Verify Your Email'}
              </h1>
              <p style={styles.heroSubtitle}>
                {isVerified 
                  ? 'Your email has been successfully verified. You now have full access to your account.'
                  : 'Please verify your email address to ensure account security and access all features.'
                }
              </p>
              
              <div style={styles.verificationFeatures}>
                <div style={styles.feature}>
                  <span style={styles.featureIcon}>🔐</span>
                  <span>Account Security</span>
                </div>
                <div style={styles.feature}>
                  <span style={styles.featureIcon}>📧</span>
                  <span>Email Notifications</span>
                </div>
                <div style={styles.feature}>
                  <span style={styles.featureIcon}>✅</span>
                  <span>Full Access</span>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Section */}
          <div style={styles.verificationSection}>
            <div style={styles.verificationCard}>
              <div style={styles.verificationHeader}>
                <div style={styles.cardLogo}>
                  <img src="/images/logo-primary.png" alt="Oakline Bank" style={styles.cardLogoImg} />
                </div>
                
                {isVerified ? (
                  <div style={styles.successState}>
                    <div style={styles.successIcon}>✅</div>
                    <h2 style={styles.verificationTitle}>Email Verified Successfully!</h2>
                    <p style={styles.verificationSubtitle}>
                      Your email <strong>{email}</strong> has been verified. 
                      You now have full access to your Oakline Bank account.
                    </p>
                    
                    <div style={styles.verifiedActions}>
                      <Link href="/dashboard" style={styles.dashboardButton}>
                        Go to Dashboard
                      </Link>
                      <Link href="/profile" style={styles.profileButton}>
                        Update Profile
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div style={styles.pendingState}>
                    <div style={styles.pendingIcon}>📧</div>
                    <h2 style={styles.verificationTitle}>Check Your Email</h2>
                    <p style={styles.verificationSubtitle}>
                      {email ? (
                        <>We've sent a verification link to <strong>{email}</strong></>
                      ) : (
                        'Please check your email for the verification link'
                      )}
                    </p>
                  </div>
                )}
              </div>

              {message && (
                <div style={styles.message}>
                  <span style={styles.messageIcon}>ℹ️</span>
                  {message}
                </div>
              )}

              {error && (
                <div style={styles.error}>
                  <span style={styles.errorIcon}>⚠️</span>
                  {error}
                </div>
              )}

              {!isVerified && (
                <div style={styles.actionsSection}>
                  <h3 style={styles.actionsTitle}>Need Help?</h3>
                  
                  <div style={styles.actionGrid}>
                    <button 
                      onClick={resendVerificationEmail}
                      disabled={loading || resendCooldown > 0}
                      style={{
                        ...styles.actionButton,
                        opacity: (loading || resendCooldown > 0) ? 0.6 : 1,
                        cursor: (loading || resendCooldown > 0) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {loading ? (
                        <span style={styles.loadingContent}>
                          <span style={styles.spinner}></span>
                          Sending...
                        </span>
                      ) : resendCooldown > 0 ? (
                        `Resend in ${resendCooldown}s`
                      ) : (
                        <>
                          <span style={styles.buttonIcon}>📧</span>
                          Resend Verification Email
                        </>
                      )}
                    </button>
                    
                    <form onSubmit={handleEmailChange} style={styles.emailUpdateForm}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Update Email Address</label>
                        <div style={styles.emailInputGroup}>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={styles.emailInput}
                            placeholder="Enter new email address"
                            required
                          />
                          <button 
                            type="submit"
                            disabled={loading}
                            style={styles.updateButton}
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Help Section */}
              <div style={styles.helpSection}>
                <h3 style={styles.helpTitle}>Still Need Help?</h3>
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

              {/* Instructions */}
              <div style={styles.instructions}>
                <h3 style={styles.instructionsTitle}>Verification Instructions</h3>
                <ol style={styles.instructionsList}>
                  <li>Check your email inbox for a message from Oakline Bank</li>
                  <li>Click the "Verify Email" button in the email</li>
                  <li>You'll be redirected back to confirm verification</li>
                  <li>If you don't see the email, check your spam folder</li>
                </ol>
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
              Email verification helps protect your account from unauthorized access. 
              We'll never ask you to share your verification code with others.
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
    flexDirection: 'column'
  },
  heroSection: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    padding: '2rem 1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '25vh'
  },
  heroContent: {
    maxWidth: '600px',
    textAlign: 'center'
  },
  heroTitle: {
    fontSize: '2.2rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
    lineHeight: '1.2'
  },
  heroSubtitle: {
    fontSize: '1.1rem',
    marginBottom: '2rem',
    lineHeight: '1.6',
    opacity: 0.9
  },
  verificationFeatures: {
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
    borderRadius: '20px'
  },
  featureIcon: {
    fontSize: '1.2rem'
  },
  verificationSection: {
    backgroundColor: 'white',
    padding: '2rem 1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1
  },
  verificationCard: {
    width: '100%',
    maxWidth: '600px',
    backgroundColor: 'white',
    borderRadius: '20px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    padding: '2.5rem',
    border: '2px solid #e2e8f0'
  },
  verificationHeader: {
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
  successState: {
    textAlign: 'center'
  },
  successIcon: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },
  pendingState: {
    textAlign: 'center'
  },
  pendingIcon: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },
  verificationTitle: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: '1rem'
  },
  verificationSubtitle: {
    fontSize: '1rem',
    color: '#64748b',
    lineHeight: '1.6',
    marginBottom: '2rem'
  },
  verifiedActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  dashboardButton: {
    padding: '1rem 2rem',
    backgroundColor: '#10b981',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s ease'
  },
  profileButton: {
    padding: '1rem 2rem',
    backgroundColor: '#6b7280',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s ease'
  },
  message: {
    marginBottom: '1.5rem',
    padding: '1rem',
    backgroundColor: '#dcfce7',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    color: '#166534',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  messageIcon: {
    fontSize: '1rem'
  },
  error: {
    marginBottom: '1.5rem',
    padding: '1rem',
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  errorIcon: {
    fontSize: '1rem'
  },
  actionsSection: {
    marginTop: '2rem',
    padding: '2rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  actionsTitle: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: '1.5rem',
    textAlign: 'center'
  },
  actionGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  actionButton: {
    width: '100%',
    padding: '1rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'all 0.3s ease'
  },
  loadingContent: {
    display: 'flex',
    alignItems: 'center',
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
  emailUpdateForm: {
    width: '100%'
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
  emailInputGroup: {
    display: 'flex',
    gap: '0.5rem'
  },
  emailInput: {
    flex: 1,
    padding: '0.75rem 1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '1rem'
  },
  updateButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  helpSection: {
    marginTop: '2rem',
    padding: '1.5rem',
    backgroundColor: '#f1f5f9',
    borderRadius: '12px'
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
    justifyContent: 'space-around',
    gap: '1rem',
    flexWrap: 'wrap'
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
  instructions: {
    marginTop: '2rem',
    padding: '1.5rem',
    backgroundColor: '#fef3c7',
    borderRadius: '12px',
    border: '1px solid #f59e0b'
  },
  instructionsTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: '1rem'
  },
  instructionsList: {
    color: '#92400e',
    fontSize: '0.9rem',
    lineHeight: '1.6',
    paddingLeft: '1.5rem'
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

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import StatusMessageBanner from '../components/StatusMessageBanner';
import { supabase } from '../lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState(''); // 'auth_error' or 'restriction_error'
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);

  useEffect(() => {
    setIsMounted(true);

    const urlParams = new URLSearchParams(window.location.search);
    const blocked = urlParams.get('blocked');
    const reason = urlParams.get('reason');
    const urlError = urlParams.get('error');

    if (blocked) {
      setError({
        type: blocked,
        reason: reason || ''
      });
    } else if (urlError === 'verification_failed' || urlError === 'status_check_failed') {
      setError('Unable to verify account status. Please try again or contact support.');
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setErrorType('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Stage 1: Verifying credentials
      setLoadingStage(0);
      await new Promise(resolve => setTimeout(resolve, 800));

      const { data, error: authError } = await signIn(formData.email, formData.password);

      if (authError) {
        // Check if the error message indicates the user is banned
        if (authError.message && authError.message.toLowerCase().includes('banned')) {
          // Fetch the actual ban reason from profiles table
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('ban_reason, is_banned')
              .eq('email', formData.email)
              .single();

            if (profile && profile.is_banned && profile.ban_reason) {
              setError(profile.ban_reason);
            } else {
              setError('Your account has been restricted. Please contact support for more information.');
            }
          } catch (profileError) {
            console.error('Error fetching ban reason:', profileError);
            setError('Your account has been restricted. Please contact support for more information.');
          }
          setLoading(false);
          setLoadingStage(0);
          return;
        } else {
          // Show the actual auth error (e.g., invalid credentials)
          setLoading(false);
          setLoadingStage(0);
          setError(authError.message || 'Invalid email or password. Please try again.');
          setErrorType('auth_error');
          return;
        }
      }

      if (data.user) {
        // Stage 2: Checking account status
        setLoadingStage(1);
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: { session: currentSession } } = await supabase.auth.getSession();

        const statusResponse = await fetch('/api/check-account-status', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession?.access_token}`
          },
          body: JSON.stringify({ userId: data.user.id })
        });

        if (!statusResponse.ok) {
          await supabase.auth.signOut({ scope: 'local' });
          setLoading(false);
          setLoadingStage(0);
          setError('Unable to verify account status. Please try again or contact support.');
          return;
        }

        const accountStatus = await statusResponse.json();
        const supportEmail = accountStatus?.supportEmail || 'support@theoaklinebank.com';

        if (!accountStatus || accountStatus.isBlocked === undefined) {
          await supabase.auth.signOut({ scope: 'local' });
          setLoading(false);
          setLoadingStage(0);
          setError('Account verification failed. Please try again or contact support.');
          return;
        }

        if (accountStatus.isBlocked) {
          await supabase.auth.signOut({ scope: 'local' });
          setLoading(false);
          setLoadingStage(0);

          // Use restriction_display_message for customer-facing message
          const displayMessage = accountStatus.restriction_display_message || 
                                accountStatus.reason || 
                                accountStatus.ban_reason || 
                                accountStatus.locked_reason || 
                                'Your account access has been restricted.';

          setError({
            type: accountStatus.blockingType,
            reason: displayMessage,
            supportEmail: supportEmail
          });
          setErrorType('restriction_error');
          return;
        }

        // Additional check: verify profile status after successful auth
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_banned, status, ban_reason, restriction_display_message')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
        }

        // Check for any account restrictions
        let restrictionType = null;
        let restrictionMessage = null;

        if (profile) {
          if (profile.is_banned === true) {
            restrictionType = 'banned';
            restrictionMessage = profile.ban_reason || 'Your account has been permanently banned.';
          } else if (profile.status === 'suspended') {
            restrictionType = 'suspended';
            restrictionMessage = profile.restriction_display_message || 'Your account has been temporarily suspended.';
          } else if (profile.status === 'closed') {
            restrictionType = 'closed';
            restrictionMessage = profile.restriction_display_message || 'Your account has been closed.';
          }
        }

        // If any restriction is found, sign them out and display banner
        if (restrictionType) {
          await supabase.auth.signOut();
          setError({
            type: restrictionType,
            reason: restrictionMessage
          });
          setErrorType('restriction_error');
          setLoading(false);
          setLoadingStage(0);
          return;
        }


        // Stage 3: Authenticating account
        setLoadingStage(2);
        await new Promise(resolve => setTimeout(resolve, 700));

        // Stage 4: Securing connection
        setLoadingStage(3);
        await new Promise(resolve => setTimeout(resolve, 600));

        // Navigate to dashboard
        router.push('/dashboard');
      }

    } catch (error) {
      setLoadingStage(0);

      // Handle banned user (backwards compatibility)
      if (error.message === 'ACCOUNT_BANNED') {
        setError({
          type: 'banned',
          reason: error.ban_reason,
          bankDetails: error.bank_details
        });
      } else {
        setError(error.message || 'Sign in failed. Please check your credentials.');
      }

      setLoading(false);
    }
  };

  if (!isMounted) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.spinner}></div>
      </div>
    );
  }

  return (
    <>
      {/* Full-Screen Banned Message - Replaces everything when user is banned */}
      {error && typeof error === 'object' && error.type ? (
        <div style={styles.fullScreenBannedContainer}>
          <StatusMessageBanner
            type={error.type}
            reason={error.reason}
            contactEmail={error.supportEmail || "support@theoaklinebank.com"}
            onBack={() => {
              setError('');
              setFormData({ email: '', password: '' });
            }}
          />
        </div>
      ) : loading ? (
        /* Professional Full-Screen Loading Overlay */
        <div style={styles.verificationOverlay}>
          <div style={styles.verificationContent}>
            {/* Bank Logo */}
            <div style={styles.logoContainerLoading}>
              <img 
                src="/images/Oakline_Bank_logo_design_c1b04ae0.png" 
                alt="Oakline Bank" 
                style={styles.logoImageLoading}
              />
            </div>

            <div style={styles.loadingBrandInfo}>
              <h1 style={styles.loadingBrandName}>Oakline Bank</h1>
              <p style={styles.loadingBrandTagline}>Secure Banking Platform</p>
            </div>

            {/* Elegant Progress Bar */}
            <div style={styles.progressBarContainer}>
              <div style={styles.progressBarTrack}>
                <div 
                  style={{
                    ...styles.progressBarFill,
                    width: `${((loadingStage + 1) / 4) * 100}%`
                  }}
                ></div>
              </div>
              <div style={styles.progressPercentage}>
                {Math.round(((loadingStage + 1) / 4) * 100)}%
              </div>
            </div>

            {/* Stage Message */}
            <div style={styles.loadingMessageContainer}>
              <h2 style={styles.verificationTitle}>
                {loadingStage === 0 && 'Verifying Credentials'}
                {loadingStage === 1 && 'Authenticating Account'}
                {loadingStage === 2 && 'Securing Connection'}
                {loadingStage === 3 && 'Preparing Dashboard'}
              </h2>

              <p style={styles.verificationSubtitle}>
                Please wait while we securely sign you in to your account
              </p>
            </div>

            {/* Animated Security Badge */}
            <div style={styles.securityBadge}>
              <div style={styles.securityIconWrapper}>
                <span style={styles.securityIcon}>🔐</span>
              </div>
              <div>
                <p style={styles.securityText}>
                  Bank-Level Security
                </p>
                <p style={styles.securitySubtext}>
                  256-bit SSL Encryption
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Main Login Page */
        <div style={styles.pageContainer}>
          {/* Professional Header - Logo on Left */}
          <header style={styles.header}>
            <div style={styles.headerContent}>
              <Link href="/" style={styles.logoLink}>
                <img 
                  src="/images/Oakline_Bank_logo_design_c1b04ae0.png" 
                  alt="Oakline Bank" 
                  style={styles.logoImage}
                />
                <div style={styles.brandInfo}>
                  <h1 style={styles.brandName}>Oakline Bank</h1>
                  <span style={styles.brandTagline}>Secure Banking Platform</span>
                </div>
              </Link>
            </div>
          </header>

          {/* Security Warning Scrolling Banner */}
          <div style={styles.securityWarningBanner}>
            <div style={styles.scrollingText} className="scrollingText">
              <span style={styles.warningText}>
                🔒 IMPORTANT SECURITY NOTICE: Never share your password, PIN, or account details with anyone. Oakline Bank will NEVER ask for your password via email, phone, or text. Protect your account - Keep your credentials confidential. 🔒
              </span>
            </div>
          </div>

          {/* Login Card Container */}
          <div style={styles.mainContent}>
          <div style={styles.loginCard}>
            {/* Card Header */}
            <div style={styles.cardHeader}>
              <div style={styles.lockIcon}>🔒</div>
              <h2 style={styles.cardTitle}>Sign In</h2>
              <p style={styles.cardSubtitle}>Enter your credentials to access your account</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} style={styles.form}>
              {/* Email Input */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Address</label>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>📧</span>
                  <input
                    type="email"
                    name="email"
                    placeholder="your.email@example.com"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    style={styles.input}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Password</label>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Enter your password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    style={styles.input}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggle}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div style={styles.formOptions}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span style={styles.checkboxText}>Remember me</span>
                </label>
                <Link href="/reset-password" style={styles.forgotLink}>
                  Forgot password?
                </Link>
              </div>

              {/* Error Message - Simple auth errors */}
              {error && typeof error === 'string' && errorType === 'auth_error' && (
                <div style={styles.simpleErrorMessage}>
                  <span style={styles.errorIcon}>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Error Message - Professional restriction banner */}
              {error && typeof error === 'string' && errorType === 'restriction_error' && (
                <div style={styles.restrictionBanner}>
                  <div style={styles.restrictionHeader}>
                    <span style={styles.restrictionIcon}>⚠️</span>
                    <span style={styles.restrictionTitle}>Account Access Restricted</span>
                  </div>
                  <p style={styles.restrictionReason}>{error}</p>
                  <div style={styles.restrictionContact}>
                    <p style={styles.contactPrompt}>For assistance, please contact our security team:</p>
                    <div style={styles.contactDetails}>
                      <div style={styles.contactItem}>
                        <span style={styles.contactIcon}>✉️</span>
                        <a href="mailto:security@theoaklinebank.com" style={styles.contactLink}>
                          security@theoaklinebank.com
                        </a>
                      </div>
                    </div>
                    <p style={styles.supportHours}>
                      Available Monday - Friday, 9:00 AM - 5:00 PM EST
                    </p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !formData.email || !formData.password}
                style={{
                  ...styles.submitButton,
                  opacity: (loading || !formData.email || !formData.password) ? 0.6 : 1,
                  cursor: (loading || !formData.email || !formData.password) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Divider */}
            <div style={styles.divider}>
              <span style={styles.dividerLine}></span>
              <span style={styles.dividerText}>or</span>
              <span style={styles.dividerLine}></span>
            </div>

            {/* Sign Up Link */}
            <div style={styles.signupSection}>
              <p style={styles.signupText}>
                Don't have an account?{' '}
                <Link href="/apply" style={styles.signupLink}>
                  Open Account
                </Link>
              </p>
            </div>

            {/* Trust Badges */}
            <div style={styles.trustBadges}>
              <div style={styles.trustBadge}>
                <span style={styles.trustIcon}>🔐</span>
                <span style={styles.trustText}>SSL Secured</span>
              </div>
              <div style={styles.trustBadge}>
                <span style={styles.trustIcon}>🏛️</span>
                <span style={styles.trustText}>FDIC Insured</span>
              </div>
              <div style={styles.trustBadge}>
                <span style={styles.trustIcon}>✓</span>
                <span style={styles.trustText}>SOC 2 Certified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
          <footer style={styles.footer}>
            <p style={styles.footerText}>
              © 2025 Oakline Bank. All rights reserved. Member FDIC.
            </p>
          </footer>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scroll {
          0% { 
            transform: translateX(0); 
          }
          100% { 
            transform: translateX(-50%); 
          }
        }

        @media (hover: hover) {
          .scrollingText:hover {
            animation-play-state: paused;
          }
        }

        input[type="checkbox"] {
          appearance: auto;
          -webkit-appearance: auto;
        }

        input, select, textarea {
          font-size: 16px !important;
        }

        @media (max-width: 768px) {
          .headerContent {
            flex-direction: column;
            gap: 0.75rem;
          }
        }
      `}</style>
    </>
  );
}

const styles = {
  loadingScreen: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid rgba(255,255,255,0.3)',
    borderTop: '5px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  verificationOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    animation: 'fadeIn 0.3s ease'
  },
  verificationContent: {
    textAlign: 'center',
    maxWidth: '550px',
    padding: '3rem 2rem',
    width: '90%',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '24px',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
  },
  logoContainerLoading: {
    marginBottom: '1.5rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  logoImageLoading: {
    height: '80px',
    width: 'auto',
    animation: 'pulse 2s ease-in-out infinite'
  },
  loadingBrandInfo: {
    textAlign: 'center',
    marginBottom: '2rem'
  },
  loadingBrandName: {
    fontSize: '2rem',
    fontWeight: '700',
    color: 'white',
    margin: '0.5rem 0 0.25rem 0',
    letterSpacing: '1px'
  },
  loadingBrandTagline: {
    fontSize: '0.95rem',
    color: 'rgba(255, 255, 255, 0.8)',
    margin: 0,
    fontWeight: '500'
  },
  progressBarContainer: {
    margin: '2.5rem 0',
    width: '100%'
  },
  progressBarTrack: {
    width: '100%',
    height: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '10px',
    overflow: 'hidden',
    marginBottom: '1rem'
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #059669 0%, #10b981 100%)',
    borderRadius: '10px',
    transition: 'width 0.5s ease',
    boxShadow: '0 0 20px rgba(5, 150, 105, 0.6)'
  },
  progressPercentage: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#10b981',
    textAlign: 'center'
  },
  loadingMessageContainer: {
    margin: '2rem 0'
  },
  verificationTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'white',
    marginBottom: '0.75rem',
    margin: '0 0 0.75rem 0'
  },
  verificationSubtitle: {
    fontSize: '1rem',
    color: 'rgba(255, 255, 255, 0.85)',
    margin: 0,
    lineHeight: '1.6'
  },
  securityBadge: {
    padding: '1.5rem 2rem',
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: '16px',
    backdropFilter: 'blur(10px)',
    border: '2px solid rgba(16, 185, 129, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.25rem',
    maxWidth: '380px',
    margin: '0 auto'
  },
  securityIconWrapper: {
    fontSize: '2.5rem'
  },
  securityIcon: {
    fontSize: '2rem'
  },
  securityText: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
    lineHeight: '1.2'
  },
  securitySubtext: {
    fontSize: '0.8rem',
    color: 'rgba(255, 255, 255, 0.7)',
    margin: '0.25rem 0 0 0',
    lineHeight: '1.2'
  },
  pageContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(135deg, #f8f9fa 0%, #f0f2f5 100%)'
  },
  header: {
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    padding: '1.5rem 2rem',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    width: '100%'
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    textDecoration: 'none',
    color: 'white'
  },
  logoImage: {
    height: '50px',
    width: 'auto'
  },
  brandInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  brandName: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: 'white',
    margin: 0
  },
  brandTagline: {
    fontSize: '0.85rem',
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500'
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem 1rem',
    maxWidth: '100%'
  },
  loginCard: {
    background: 'white',
    borderRadius: '20px',
    boxShadow: '0 15px 45px rgba(0, 0, 0, 0.1)',
    maxWidth: '500px',
    width: '100%',
    overflow: 'hidden',
    border: '1px solid rgba(0, 0, 0, 0.05)'
  },
  cardHeader: {
    background: 'linear-gradient(135deg, #f8f9fa 0%, #f0f2f5 100%)',
    padding: '2rem 2rem 1.5rem',
    textAlign: 'center',
    borderBottom: '1px solid #e2e8f0'
  },
  lockIcon: {
    fontSize: '2.5rem',
    marginBottom: '0.5rem'
  },
  cardTitle: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#1a202c',
    margin: '0.5rem 0 0.5rem 0'
  },
  cardSubtitle: {
    fontSize: '0.9rem',
    color: '#718096',
    margin: 0
  },
  form: {
    padding: '2rem'
  },
  inputGroup: {
    marginBottom: '1.5rem'
  },
  label: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '0.5rem'
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    padding: '0 1rem',
    background: '#f7fafc',
    transition: 'all 0.3s'
  },
  inputIcon: {
    fontSize: '1.25rem',
    marginRight: '0.75rem',
    color: '#4a5568'
  },
  input: {
    flex: 1,
    padding: '0.875rem 0',
    border: 'none',
    background: 'transparent',
    fontSize: '0.95rem',
    color: '#2d3748',
    outline: 'none'
  },
  passwordToggle: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.1rem',
    padding: '0 0.5rem',
    color: '#4a5568'
  },
  formOptions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    fontSize: '0.85rem'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    color: '#2d3748'
  },
  checkbox: {
    cursor: 'pointer'
  },
  checkboxText: {
    fontSize: '0.85rem',
    color: '#4a5568'
  },
  forgotLink: {
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: '600'
  },
  simpleErrorMessage: {
    background: '#fee2e2',
    border: '2px solid #fca5a5',
    color: '#991b1b',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    fontSize: '0.9rem'
  },
  errorIcon: {
    fontSize: '1.25rem',
    flexShrink: 0
  },
  restrictionBanner: {
    background: 'linear-gradient(135deg, #001f3f 0%, #003d7a 100%)',
    border: '2px solid #0d47a1',
    color: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    marginBottom: '1.5rem'
  },
  restrictionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1rem'
  },
  restrictionIcon: {
    fontSize: '1.5rem'
  },
  restrictionTitle: {
    fontWeight: '700',
    fontSize: '1rem'
  },
  restrictionReason: {
    margin: '0 0 1rem 0',
    lineHeight: '1.5',
    fontSize: '0.95rem'
  },
  restrictionContact: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '1rem',
    borderLeft: '3px solid #64b5f6'
  },
  contactPrompt: {
    margin: '0 0 0.75rem 0',
    fontSize: '0.85rem',
    color: 'rgba(255, 255, 255, 0.9)'
  },
  contactDetails: {
    marginBottom: '0.75rem'
  },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  contactIcon: {
    fontSize: '1rem'
  },
  contactLink: {
    color: '#e3f2fd',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '0.9rem'
  },
  supportHours: {
    margin: '0.75rem 0 0 0',
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic'
  },
  submitButton: {
    width: '100%',
    padding: '1.125rem 1.5rem',
    background: 'linear-gradient(135deg, #1a365d 0%, #2563eb 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.05rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(26, 54, 93, 0.3)',
    marginTop: '0.5rem'
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    margin: '1.5rem 0',
    width: '100%',
    background: 'white',
    padding: '0 2rem'
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#e2e8f0'
  },
  dividerText: {
    color: '#94a3b8',
    fontSize: '0.85rem',
    fontWeight: '500'
  },
  signupSection: {
    textAlign: 'center',
    marginBottom: '1.5rem',
    width: '100%',
    background: 'white',
    padding: '0 2rem'
  },
  signupText: {
    color: '#64748b',
    fontSize: '0.9rem',
    margin: 0
  },
  signupLink: {
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: '700',
    transition: 'color 0.2s'
  },
  trustBadges: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #e2e8f0',
    flexWrap: 'wrap',
    width: '100%',
    background: 'white',
    padding: '1.5rem 2rem 2rem',
    borderRadius: '0 0 20px 20px'
  },
  trustBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem'
  },
  trustIcon: {
    fontSize: '1.5rem'
  },
  trustText: {
    fontSize: '0.7rem',
    color: '#64748b',
    fontWeight: '600'
  },
  footer: {
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    padding: '1.5rem',
    textAlign: 'center',
    borderTop: '2px solid #059669'
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '0.85rem',
    margin: 0
  },
  fullScreenBannedContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    background: 'linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
    zIndex: 10000,
    overflow: 'auto'
  },
  securityWarningBanner: {
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    overflow: 'hidden',
    padding: '0.875rem 0',
    borderTop: '3px solid #059669',
    borderBottom: '3px solid #059669',
    position: 'relative',
    height: '3.5rem',
    display: 'flex',
    alignItems: 'center'
  },
  scrollingText: {
    display: 'flex',
    whiteSpace: 'nowrap',
    animation: 'scroll 38s linear infinite',
    willChange: 'transform',
    gap: '0'
  },
  warningText: {
    color: 'white',
    fontSize: '0.95rem',
    fontWeight: '700',
    paddingRight: '150px',
    display: 'inline-block',
    letterSpacing: '0.5px',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
    lineHeight: '1.4'
  }
};

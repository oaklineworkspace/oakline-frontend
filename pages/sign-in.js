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
          throw authError; // Throw other errors to be caught by the catch block
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
          setError('Unable to verify account status. Please contact support at support@theoaklinebank.com.');
          return;
        }

        const accountStatus = await statusResponse.json();

        if (!accountStatus || accountStatus.isBlocked === undefined) {
          await supabase.auth.signOut({ scope: 'local' });
          setLoading(false);
          setLoadingStage(0);
          setError('Account verification failed. Please contact support at support@theoaklinebank.com.');
          return;
        }

        if (accountStatus.isBlocked) {
          await supabase.auth.signOut({ scope: 'local' });
          setLoading(false);
          setLoadingStage(0);

          let blockReason = '';
          if (accountStatus.blockingType === 'banned') {
            blockReason = accountStatus.ban_reason;
          } else if (accountStatus.blockingType === 'locked') {
            blockReason = accountStatus.locked_reason;
          }

          setError({
            type: accountStatus.blockingType,
            reason: blockReason
          });
          return;
        }

        // Additional check: verify profile status after successful auth
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_banned, status, ban_reason')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
        }

        // If user is banned or has restricted status, sign them out
        if (profile && (profile.is_banned === true || ['suspended', 'closed'].includes(profile.status))) {
          await supabase.auth.signOut();

          // Show the actual ban reason from profiles table
          if (profile.ban_reason) {
            setError(profile.ban_reason);
          } else if (profile.is_banned) {
            setError('Your account has been permanently banned. Please contact support at +1 (636) 635-6122 for assistance.');
          } else if (profile.status === 'suspended') {
            setError('Your account has been temporarily suspended. Please contact support at +1 (636) 635-6122 for assistance.');
          } else {
            setError('Your account access has been restricted. Please contact support at +1 (636) 635-6122 for assistance.');
          }
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
      {/* Professional Full-Screen Loading Overlay */}
      {loading && (
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
      )}

      {/* Main Login Page */}
      <div style={{
        ...styles.pageContainer,
        opacity: loading ? 0 : 1,
        visibility: loading ? 'hidden' : 'visible',
        transition: 'opacity 0.3s ease, visibility 0.3s ease'
      }}>
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

        {/* Banned User Message Banner - Shows in place of scrolling security banner */}
        {error && typeof error === 'object' && error.type ? (
          <div style={styles.bannedMessageWrapper}>
            <StatusMessageBanner
              type={error.type}
              reason={error.reason}
              contactEmail="support@theoaklinebank.com"
            />
          </div>
        ) : (
          /* Security Warning Scrolling Banner */
          <div style={styles.securityWarningBanner}>
            <div style={styles.scrollingText} className="scrollingText">
              <span style={styles.warningText}>
                🔒 IMPORTANT SECURITY NOTICE: Never share your password, PIN, or account details with anyone. Oakline Bank will NEVER ask for your password via email, phone, or text. Protect your account - Keep your credentials confidential. 🔒
              </span>
            </div>
          </div>
        )}

        {/* Login Card Container - Only show if not banned */}
        <div style={{
          ...styles.mainContent,
          display: (error && typeof error === 'object' && error.type) ? 'none' : 'flex'
        }}>
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

              {/* Error Message - Only show simple errors here */}
              {error && typeof error === 'string' && (
                <div style={styles.errorMessage}>
                  <span style={styles.errorIcon}>⚠️</span>
                  <span>{error}</span>
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
    margin: '2rem auto 0',
    boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)'
  },
  securityIconWrapper: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'rgba(16, 185, 129, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
  },
  securityIcon: {
    fontSize: '1.75rem'
  },
  securityText: {
    fontSize: '1.05rem',
    color: '#10b981',
    margin: '0 0 0.25rem 0',
    fontWeight: '700',
    textAlign: 'left'
  },
  securitySubtext: {
    fontSize: '0.9rem',
    color: '#10b981',
    margin: 0,
    fontWeight: '600',
    textAlign: 'left'
  },
  pageContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: 'linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)'
  },
  header: {
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    borderBottom: '4px solid #059669',
    boxShadow: '0 6px 20px rgba(26, 62, 111, 0.4)',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1.25rem 2rem',
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center'
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    textDecoration: 'none',
    color: 'white',
    transition: 'transform 0.2s ease'
  },
  logoImage: {
    height: '70px',
    width: 'auto',
    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.2))'
  },
  brandInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  brandName: {
    fontSize: '2rem',
    fontWeight: '700',
    margin: 0,
    color: 'white',
    letterSpacing: '1px',
    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
  },
  brandTagline: {
    fontSize: '0.9rem',
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
    letterSpacing: '0.3px'
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem 1rem',
    width: '100%'
  },
  loginCard: {
    width: '100%',
    maxWidth: '500px',
    backgroundColor: 'white',
    borderRadius: '24px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    overflow: 'hidden',
    border: '1px solid rgba(26, 62, 111, 0.1)'
  },
  cardHeader: {
    textAlign: 'center',
    padding: '2.5rem 2rem',
    background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
    borderBottom: '2px solid #e2e8f0'
  },
  lockIcon: {
    fontSize: '3.5rem',
    marginBottom: '1.25rem',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
  },
  cardTitle: {
    fontSize: '2.25rem',
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: '0.75rem',
    margin: 0,
    letterSpacing: '0.5px'
  },
  cardSubtitle: {
    fontSize: '1rem',
    color: '#64748b',
    margin: 0,
    marginTop: '0.5rem',
    fontWeight: '500'
  },
  form: {
    width: '100%',
    background: 'white',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#1a365d'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute',
    left: '1rem',
    fontSize: '1.2rem',
    pointerEvents: 'none'
  },
  input: {
    width: '100%',
    padding: '1.125rem 1.5rem 1.125rem 3.25rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '16px',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    outline: 'none',
    backgroundColor: '#f8fafc',
    color: '#1e293b',
    fontWeight: '500'
  },
  passwordToggle: {
    position: 'absolute',
    right: '1rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.4rem',
    padding: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s ease',
    zIndex: 10
  },
  formOptions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.85rem',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer'
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
    accentColor: '#2563eb'
  },
  checkboxText: {
    color: '#475569',
    fontWeight: '500'
  },
  forgotLink: {
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: '600',
    transition: 'color 0.2s'
  },
  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem 1.25rem',
    backgroundColor: '#fee2e2',
    border: '2px solid #fca5a5',
    borderRadius: '12px',
    color: '#dc2626',
    fontSize: '0.9rem',
    fontWeight: '600'
  },
  errorIcon: {
    fontSize: '1.2rem'
  },
  bannedMessage: {
    backgroundColor: '#fef2f2',
    border: '2px solid #dc2626',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1rem'
  },
  bannedHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #fca5a5'
  },
  bannedIcon: {
    fontSize: '2rem'
  },
  bannedTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#991b1b',
    margin: 0
  },
  bannedText: {
    fontSize: '0.95rem',
    color: '#7f1d1d',
    lineHeight: '1.6',
    marginBottom: '1.25rem'
  },
  bannedContactSection: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '1.25rem',
    border: '1px solid #fca5a5'
  },
  bannedContactTitle: {
    fontSize: '0.95rem',
    color: '#991b1b',
    marginBottom: '1rem',
    margin: '0 0 1rem 0'
  },
  contactMethods: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1rem'
  },
  contactMethod: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '0.75rem',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    border: '1px solid #fee2e2'
  },
  contactIcon: {
    fontSize: '1.5rem'
  },
  contactLabel: {
    fontSize: '0.75rem',
    color: '#7f1d1d',
    fontWeight: '600',
    marginBottom: '0.25rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  contactValue: {
    fontSize: '0.95rem',
    color: '#dc2626',
    fontWeight: '600',
    textDecoration: 'none',
    display: 'block'
  },
  bannedFooter: {
    fontSize: '0.8rem',
    color: '#7f1d1d',
    fontStyle: 'italic',
    margin: '0.75rem 0 0 0',
    paddingTop: '0.75rem',
    borderTop: '1px solid #fee2e2',
    lineHeight: '1.5'
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
  bannedMessageWrapper: {
    width: '100%',
    padding: '1.5rem',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
    position: 'sticky',
    top: 0,
    zIndex: 101, // Ensure it's above the header
    boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
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
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';

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

      const { data, error } = await signIn(formData.email, formData.password);

      if (error) throw error;

      if (data.user) {
        // Stage 2: Authenticating account
        setLoadingStage(1);
        await new Promise(resolve => setTimeout(resolve, 700));

        // Stage 3: Securing connection
        setLoadingStage(2);
        await new Promise(resolve => setTimeout(resolve, 700));

        // Stage 4: Loading dashboard
        setLoadingStage(3);
        await new Promise(resolve => setTimeout(resolve, 800));

        // Navigate to dashboard
        window.location.href = '/dashboard';
      }

    } catch (error) {
      setLoadingStage(0);
      setError(error.message || 'Sign in failed. Please check your credentials.');
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
      {/* Full-Screen Verification Overlay - Shown when loading */}
      {loading && (
        <div style={styles.verificationOverlay}>
          <div style={styles.verificationContent}>
            {/* Animated Logo */}
            <div style={styles.logoContainer}>
              <div style={styles.animatedLogo}>🏦</div>
            </div>

            {/* Progress Spinner */}
            <div style={styles.progressSpinner}></div>

            {/* Stage Message */}
            <h2 style={styles.verificationTitle}>
              {loadingStage === 0 && 'Verifying Credentials'}
              {loadingStage === 1 && 'Authenticating Account'}
              {loadingStage === 2 && 'Securing Connection'}
              {loadingStage === 3 && 'Loading Dashboard'}
            </h2>

            <p style={styles.verificationSubtitle}>
              Please wait while we securely sign you in...
            </p>

            {/* Progress Dots */}
            <div style={styles.progressDots}>
              {[0, 1, 2, 3].map((stage) => (
                <div
                  key={stage}
                  style={{
                    ...styles.progressDot,
                    backgroundColor: stage <= loadingStage ? '#ffffff' : 'rgba(255, 255, 255, 0.3)',
                    transform: stage === loadingStage ? 'scale(1.4)' : 'scale(1)',
                    boxShadow: stage === loadingStage ? '0 0 20px rgba(255, 255, 255, 0.8)' : 'none'
                  }}
                ></div>
              ))}
            </div>

            {/* Security Badge */}
            <div style={styles.securityBadge}>
              <div style={styles.securityIcon}>🔐</div>
              <p style={styles.securityText}>
                256-bit SSL Encryption Active
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Login Page - Hidden when loading */}
      <div style={{
        ...styles.pageContainer,
        opacity: loading ? 0 : 1,
        transform: loading ? 'scale(0.95)' : 'scale(1)',
        transition: 'all 0.3s ease',
        pointerEvents: loading ? 'none' : 'auto'
      }}>
        <div style={styles.loginCard}>
          {/* Header with Logo */}
          <div style={styles.header}>
            <div style={styles.logoIcon}>🏦</div>
            <h1 style={styles.brandName}>Oakline Bank</h1>
            <p style={styles.tagline}>Sign in to your account</p>
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
                  {showPassword ? '🙈' : '🙉'}
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
                🔐 Forgot password?
              </Link>
            </div>

            {/* Error Message */}
            {error && (
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
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        input[type="checkbox"] {
          appearance: auto;
          -webkit-appearance: auto;
        }

        /* Ensure inputs don't zoom on mobile */
        input, select, textarea {
          font-size: 16px !important;
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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    animation: 'fadeIn 0.3s ease'
  },
  verificationContent: {
    textAlign: 'center',
    maxWidth: '500px',
    padding: '2rem'
  },
  logoContainer: {
    marginBottom: '2rem'
  },
  animatedLogo: {
    fontSize: '4rem',
    animation: 'pulse 2s ease-in-out infinite'
  },
  progressSpinner: {
    width: '80px',
    height: '80px',
    border: '6px solid rgba(255, 255, 255, 0.2)',
    borderTop: '6px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 2rem'
  },
  verificationTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    color: 'white',
    marginBottom: '1rem',
    margin: 0
  },
  verificationSubtitle: {
    fontSize: '1.1rem',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: '2.5rem',
    lineHeight: '1.6'
  },
  progressDots: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    marginBottom: '3rem'
  },
  progressDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    transition: 'all 0.3s ease'
  },
  securityBadge: {
    padding: '1.25rem 1.5rem',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem'
  },
  securityIcon: {
    fontSize: '1.5rem'
  },
  securityText: {
    fontSize: '0.9rem',
    color: 'rgba(255, 255, 255, 0.95)',
    margin: 0,
    fontWeight: '500'
  },
  pageContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '1rem'
  },
  loginCard: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: 'white',
    borderRadius: '24px',
    padding: '3rem 2.5rem',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
  },
  header: {
    textAlign: 'center',
    marginBottom: '2.5rem'
  },
  logoIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },
  brandName: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem',
    margin: 0
  },
  tagline: {
    fontSize: '0.95rem',
    color: '#64748b',
    margin: 0
  },
  form: {
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
    color: '#334155'
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
    padding: '1rem 1.25rem 1rem 3rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '16px',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    outline: 'none',
    backgroundColor: '#f8fafc',
    color: '#1e293b'
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
    accentColor: '#667eea'
  },
  checkboxText: {
    color: '#475569',
    fontWeight: '500'
  },
  forgotLink: {
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: '600',
    transition: 'color 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem'
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
  submitButton: {
    width: '100%',
    padding: '1.125rem 1.5rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.05rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 25px rgba(102, 126, 234, 0.4)',
    marginTop: '0.5rem'
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    margin: '1.5rem 0'
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
    marginBottom: '1.5rem'
  },
  signupText: {
    color: '#64748b',
    fontSize: '0.9rem',
    margin: 0
  },
  signupLink: {
    color: '#667eea',
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
    flexWrap: 'wrap'
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
  }
};
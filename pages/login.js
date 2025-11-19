
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

        // Stage 4: Finalizing login
        setLoadingStage(3);
        await new Promise(resolve => setTimeout(resolve, 600));

        // Navigate to dashboard - no loading stage needed on dashboard
        router.push('/dashboard');
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

            {/* Animated Progress Ring */}
            <div style={styles.progressRingContainer}>
              <svg style={styles.progressRing} width="120" height="120">
                <circle
                  style={styles.progressRingCircleBackground}
                  cx="60"
                  cy="60"
                  r="54"
                />
                <circle
                  style={{
                    ...styles.progressRingCircle,
                    strokeDashoffset: 339.292 - (339.292 * (loadingStage + 1)) / 4
                  }}
                  cx="60"
                  cy="60"
                  r="54"
                />
              </svg>
              <div style={styles.progressPercentage}>
                {Math.round(((loadingStage + 1) / 4) * 100)}%
              </div>
            </div>

            {/* Stage Message */}
            <h2 style={styles.verificationTitle}>
              {loadingStage === 0 && 'Verifying Credentials'}
              {loadingStage === 1 && 'Authenticating Account'}
              {loadingStage === 2 && 'Securing Connection'}
              {loadingStage === 3 && 'Finalizing Login'}
            </h2>

            <p style={styles.verificationSubtitle}>
              Please wait while we securely sign you in...
            </p>

            {/* Professional Progress Dots */}
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

      {/* Main Login Page */}
      <div style={{
        ...styles.pageContainer,
        opacity: loading ? 0 : 1,
        visibility: loading ? 'hidden' : 'visible',
        transition: 'opacity 0.3s ease, visibility 0.3s ease'
      }}>
        {/* Professional Header */}
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
                <span style={styles.brandTagline}>Secure Banking</span>
              </div>
            </Link>
            <div style={styles.headerRight}>
              <span style={styles.helpText}>Need Help?</span>
              <span style={styles.phoneNumber}>📞 1-800-OAKLINE</span>
            </div>
          </div>
        </header>

        {/* Login Card */}
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

        {/* Footer */}
        <footer style={styles.footer}>
          <p style={styles.footerText}>
            © 2024 Oakline Bank. All rights reserved. Member FDIC.
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

        @keyframes progressRing {
          0% { stroke-dashoffset: 339.292; }
          100% { stroke-dashoffset: 0; }
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
    background: 'linear-gradient(135deg, #1a365d 0%, #2563eb 100%)'
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
    background: 'linear-gradient(135deg, #1a365d 0%, #2563eb 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    animation: 'fadeIn 0.3s ease'
  },
  verificationContent: {
    textAlign: 'center',
    maxWidth: '500px',
    padding: '2rem',
    width: '100%'
  },
  logoContainerLoading: {
    marginBottom: '2rem',
    display: 'flex',
    justifyContent: 'center'
  },
  logoImageLoading: {
    height: '80px',
    width: 'auto',
    filter: 'brightness(0) invert(1)',
    animation: 'pulse 2s ease-in-out infinite'
  },
  progressRingContainer: {
    position: 'relative',
    margin: '2rem auto',
    width: '120px',
    height: '120px'
  },
  progressRing: {
    transform: 'rotate(-90deg)'
  },
  progressRingCircleBackground: {
    fill: 'none',
    stroke: 'rgba(255, 255, 255, 0.2)',
    strokeWidth: '8'
  },
  progressRingCircle: {
    fill: 'none',
    stroke: '#ffffff',
    strokeWidth: '8',
    strokeDasharray: '339.292',
    strokeLinecap: 'round',
    transition: 'stroke-dashoffset 0.5s ease'
  },
  progressPercentage: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'white'
  },
  verificationTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'white',
    marginBottom: '0.75rem',
    margin: 0
  },
  verificationSubtitle: {
    fontSize: '1rem',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: '2rem',
    lineHeight: '1.6'
  },
  progressDots: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    marginBottom: '2.5rem'
  },
  progressDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    transition: 'all 0.3s ease'
  },
  securityBadge: {
    padding: '1rem 1.5rem',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    maxWidth: '300px',
    margin: '0 auto'
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
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)'
  },
  header: {
    background: '#1a365d',
    borderBottom: '3px solid #2563eb',
    boxShadow: '0 2px 8px rgba(26, 54, 93, 0.2)',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1rem 1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    textDecoration: 'none',
    color: 'white'
  },
  logoImage: {
    height: '50px',
    width: 'auto'
  },
  brandInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  brandName: {
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: 0,
    color: 'white'
  },
  brandTagline: {
    fontSize: '0.75rem',
    color: '#bfdbfe',
    fontWeight: '500'
  },
  headerRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.25rem'
  },
  helpText: {
    fontSize: '0.75rem',
    color: '#bfdbfe'
  },
  phoneNumber: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'white'
  },
  loginCard: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem 1rem',
    width: '100%',
    maxWidth: '480px',
    margin: '0 auto'
  },
  cardHeader: {
    textAlign: 'center',
    marginBottom: '2rem',
    width: '100%',
    background: 'white',
    padding: '2rem',
    borderRadius: '16px 16px 0 0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  lockIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },
  cardTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: '0.5rem',
    margin: 0
  },
  cardSubtitle: {
    fontSize: '0.95rem',
    color: '#64748b',
    margin: 0,
    marginTop: '0.5rem'
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
    borderRadius: '0 0 16px 16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
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
    background: '#1a365d',
    padding: '1.5rem',
    textAlign: 'center'
  },
  footerText: {
    color: '#bfdbfe',
    fontSize: '0.85rem',
    margin: 0
  }
};

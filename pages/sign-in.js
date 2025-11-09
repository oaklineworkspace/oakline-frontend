import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';

// Define styles object if it's not defined elsewhere
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 50%, #1A3E6F 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    margin: 0,
    padding: 0
  },
  header: {
    color: 'white',
    padding: '1rem 2rem',
    backdropFilter: 'blur(10px)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center'
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    textDecoration: 'none',
    color: 'white'
  },
  logoIcon: { fontSize: '2rem' },
  logoTextContainer: { display: 'flex', flexDirection: 'column' },
  logoBankName: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: 'white'
  },
  logoSlogan: {
    fontSize: '0.9rem',
    color: '#FFC857',
    fontWeight: '500'
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    minHeight: 'calc(100vh - 100px)'
  },
  formContainer: {
    width: '100%',
    maxWidth: '450px',
    backgroundColor: 'white',
    borderRadius: '20px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
    padding: '2.5rem',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)'
  },
  iconContainer: {
    width: '80px',
    height: '80px',
    backgroundColor: '#1A3E6F',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    boxShadow: '0 8px 32px rgba(26, 62, 111, 0.3)'
  },
  icon: { fontSize: '2rem', color: 'white' },
  title: {
    fontSize: '2.2rem',
    fontWeight: '700',
    color: '#1A3E6F',
    marginBottom: '0.5rem',
    margin: 0,
    letterSpacing: '-0.02em'
  },
  subtitle: {
    fontSize: '1rem',
    color: '#64748b',
    margin: 0
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
    color: '#1A3E6F',
    marginBottom: '0.25rem'
  },
  input: {
    width: '100%',
    padding: '0.875rem 1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '1rem',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    outline: 'none',
    backgroundColor: '#ffffff',
    color: '#1f2937'
  },
  passwordInputContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  passwordInput: {
    width: '100%',
    padding: '0.875rem 3.5rem 0.875rem 1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '1rem',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    outline: 'none',
    backgroundColor: '#ffffff',
    color: '#1f2937'
  },
  passwordToggle: {
    position: 'absolute',
    right: '1rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.2rem',
    padding: '0.5rem',
    color: '#64748b',
    transition: 'color 0.3s ease',
    zIndex: 10
  },
  forgotPasswordLink: {
    color: '#1A3E6F',
    textDecoration: 'none',
    fontSize: '0.85rem',
    fontWeight: '500',
    alignSelf: 'flex-end',
    marginTop: '0.5rem'
  },
  rememberDeviceContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    margin: '0.5rem 0'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#059669',
    transform: 'scale(1.2)',
    border: '2px solid #059669',
    borderRadius: '3px'
  },
  rememberDeviceLabel: {
    fontSize: '0.9rem',
    color: '#374151',
    fontWeight: '500',
    cursor: 'pointer'
  },
  submitButton: {
    width: '100%',
    padding: '1rem 1.5rem',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    marginTop: '1rem',
    minHeight: '56px'
  },
  loadingContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem'
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid transparent',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  messageContainer: {
    marginTop: '1.5rem',
    padding: '1rem 1.25rem',
    borderRadius: '10px',
    textAlign: 'center',
    fontSize: '0.9rem',
    fontWeight: '600',
    borderLeft: '4px solid'
  },
  securityInfo: {
    marginTop: '1.5rem',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    textAlign: 'center'
  },
  securityText: {
    fontSize: '0.85rem',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.5'
  },
  signUpSection: {
    marginTop: '1.5rem',
    textAlign: 'center',
    padding: '1rem',
    borderTop: '1px solid #e2e8f0'
  },
  signUpText: {
    fontSize: '0.9rem',
    color: '#64748b',
    margin: 0
  },
  signUpLink: {
    color: '#1A3E6F',
    textDecoration: 'none',
    fontWeight: '600'
  },
  helpLinksContainer: {
    marginTop: '1rem',
    textAlign: 'center',
    backgroundColor: '#f1f5f9',
    padding: '1rem',
    borderRadius: '10px',
    border: '1px solid #e2e8f0'
  },
  helpLinksTitle: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#1A3E6F',
    margin: '0 0 0.5rem 0'
  },
  helpLinksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  helpLinkItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.8rem',
    color: '#374151'
  },
  helpLinkIcon: { fontSize: '0.9rem' },
  helpLinkText: { fontWeight: '500' },
  footer: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    width: '100%',
    padding: '1rem 2rem',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    borderTop: '1px solid rgba(255, 255, 255, 0.2)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    zIndex: 100,
    boxShadow: '0 -5px 15px rgba(0, 0, 0, 0.1)'
  },
  footerText: {
    fontSize: '0.9rem',
    color: '#1A3E6F',
    margin: 0,
    fontWeight: '600'
  },
  footerLinksContainer: { display: 'flex', gap: '0.75rem' },
  footerLink: { color: '#2A5490', textDecoration: 'none', fontSize: '0.85rem' },
  forgotPasswordSection: {
    textAlign: 'center',
    marginTop: '1.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e2e8f0'
  },
  forgotPasswordLink: {
    color: '#1A3E6F',
    textDecoration: 'none',
    fontSize: '0.85rem',
    fontWeight: '500',
    alignSelf: 'flex-end',
    marginTop: '0.5rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.3s ease'
  }
};


export default function SignInPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await signIn(formData.email, formData.password);

      if (error) throw error;

      if (data.user) {
        setMessage('Sign in successful! Redirecting to dashboard...');
        // Force navigation to dashboard in same tab
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      }

    } catch (error) {
      setMessage(`Sign in failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 50%, #1A3E6F 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/" style={styles.logoLink}>
            <div style={styles.logoIcon}>🏦</div>
            <div style={styles.logoTextContainer}>
              <span style={styles.logoBankName}>Oakline Bank</span>
              <span style={styles.logoSlogan}>Secure Banking Access</span>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.mainContent}>
        <div style={styles.formContainer}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={styles.iconContainer}>
              <span style={styles.icon}>🏦</span>
            </div>
            <h1 style={styles.title}>Welcome Back</h1>
            <p style={styles.subtitle}>Sign in to your Oakline Bank account</p>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                required
                value={formData.email}
                onChange={handleChange}
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.passwordInputContainer}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Enter your password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  style={styles.passwordInput}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.passwordToggle}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <Link href="/reset-password" style={styles.forgotPasswordLink}>
                Forgot your password?
              </Link>
            </div>

            <div style={styles.rememberDeviceContainer}>
              <input
                type="checkbox"
                id="rememberDevice"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                style={styles.checkbox}
              />
              <label
                htmlFor="rememberDevice"
                style={styles.rememberDeviceLabel}
              >
                Remember this device
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !formData.email || !formData.password}
              style={{
                ...styles.submitButton,
                background: (loading || !formData.email || !formData.password)
                  ? '#94a3b8'
                  : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                cursor: (loading || !formData.email || !formData.password) ? 'not-allowed' : 'pointer',
                boxShadow: (loading || !formData.email || !formData.password)
                  ? 'none'
                  : '0 8px 25px rgba(5, 150, 105, 0.4)',
              }}
              onMouseEnter={(e) => {
                if (!loading && formData.email && formData.password) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 12px 35px rgba(5, 150, 105, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && formData.email && formData.password) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 8px 25px rgba(5, 150, 105, 0.4)';
                }
              }}
            >
              {loading ? (
                <span style={styles.loadingContent}>
                  <div style={styles.spinner}></div>
                  Signing In...
                </span>
              ) : (
                <>
                  <span style={{ fontSize: '1.2rem' }}>🔐</span>
                  Sign In to My Account
                </>
              )}
            </button>
          </form>

          {message && (
            <div style={{
              ...styles.messageContainer,
              color: message.includes('failed') ? '#dc2626' : '#065f46',
              backgroundColor: message.includes('failed') ? '#fee2e2' : '#d1fae5',
              borderLeft: `4px solid ${message.includes('failed') ? '#dc2626' : '#065f46'}`
            }}>
              {message}
            </div>
          )}

          <div style={styles.securityInfo}>
            <p style={styles.securityText}>
              🔒 Your security is our priority. We use 256-bit SSL encryption.
            </p>
          </div>

          <div style={styles.signUpSection}>
            <p style={styles.signUpText}>
              Don't have an account?{' '}
              <Link href="/apply" style={styles.signUpLink}>
                Open Account Today
              </Link>
            </p>
          </div>

          <div style={styles.helpLinksContainer}>
            <h4 style={styles.helpLinksTitle}>Why Choose Oakline Bank?</h4>
            <div style={styles.helpLinksList}>
              <div style={styles.helpLinkItem}>
                <span style={styles.helpLinkIcon}>🏆</span>
                <span style={styles.helpLinkText}>Award-winning digital banking</span>
              </div>
              <div style={styles.helpLinkItem}>
                <span style={styles.helpLinkIcon}>🔒</span>
                <span style={styles.helpLinkText}>Bank-level security protection</span>
              </div>
              <div style={styles.helpLinkItem}>
                <span style={styles.helpLinkIcon}>📱</span>
                <span style={styles.helpLinkText}>Mobile banking excellence</span>
              </div>
              <div style={styles.helpLinkItem}>
                <span style={styles.helpLinkIcon}>💳</span>
                <span style={styles.helpLinkText}>23 account types available</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          © 2024 Oakline Bank. All rights reserved.
        </p>
        <div style={styles.footerLinksContainer}>
          <Link href="/privacy" style={styles.footerLink}>
            Privacy Policy
          </Link>
          <Link href="/terms" style={styles.footerLink}>
            Terms of Service
          </Link>
          <Link href="/contact" style={styles.footerLink}>
            Contact Us
          </Link>
        </div>
      </footer>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        input[type="checkbox"]:checked {
          background-color: #059669 !important;
          border-color: #059669 !important;
        }

        input[type="checkbox"]:focus {
          outline: 2px solid #059669;
          outline-offset: 2px;
        }

        input[type="checkbox"] {
          appearance: none;
          -webkit-appearance: none;
          background-color: white;
          border: 2px solid #059669;
          border-radius: 3px;
          display: inline-block;
          position: relative;
        }

        input[type="checkbox"]:checked::after {
          content: '✓';
          font-size: 14px;
          color: white;
          position: absolute;
          top: -2px;
          left: 1px;
        }
      `}</style>

      <style jsx>{`
        .helpLinks {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .helpLink {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: #64748b;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 500;
          padding: 0.5rem;
          border-radius: 6px;
          transition: all 0.3s ease;
        }

        .helpLink:hover {
          color: #1A3E6F;
          background-color: #f1f5f9;
        }

        .benefitsList {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .benefitItem {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #374151;
        }

        .benefitIcon {
          font-size: 0.9rem;
        }

        .benefitText {
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .helpLinks {
            gap: 1rem;
          }

          .helpLink {
            font-size: 0.8rem;
            padding: 0.4rem;
          }
        }
      `}</style>
    </div>
  );
}
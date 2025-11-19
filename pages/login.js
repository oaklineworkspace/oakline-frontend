import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';

export default function SignInPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);

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

    const loadingStages = [
      'Verifying credentials',
      'Authenticating account',
      'Securing connection',
      'Loading your dashboard'
    ];

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
      setMessage(`Sign in failed: ${error.message}`);
      setLoading(false);
    }
  };

  if (!isMounted) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid rgba(255,255,255,0.3)',
          borderTop: '5px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Login Form - Hidden when loading */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        backgroundColor: 'white',
        borderRadius: '24px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
        padding: '3rem 2.5rem',
        opacity: loading ? 0 : 1,
        transform: loading ? 'scale(0.95)' : 'scale(1)',
        transition: 'all 0.3s ease',
        pointerEvents: loading ? 'none' : 'auto',
        position: 'relative',
        zIndex: loading ? 1 : 10
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem'
          }}>🏦</div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1e293b',
            marginBottom: '0.5rem',
            margin: 0
          }}>Oakline Bank</h1>
          <p style={{
            fontSize: '0.95rem',
            color: '#64748b',
            margin: 0
          }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          {/* Email Input */}
          <div>
            <input
              type="email"
              name="email"
              placeholder="Email address"
              required
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              style={{
                width: '100%',
                padding: '1rem 1.25rem',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '1rem',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
                outline: 'none',
                backgroundColor: '#f8fafc',
                color: '#1e293b'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2563eb';
                e.target.style.backgroundColor = '#ffffff';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.backgroundColor = '#f8fafc';
              }}
            />
          </div>

          {/* Password Input */}
          <div>
            <div style={{ 
              position: 'relative', 
              display: 'flex', 
              alignItems: 'center' 
            }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Password"
                required
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '1rem 3.5rem 1rem 1.25rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                  outline: 'none',
                  backgroundColor: '#f8fafc',
                  color: '#1e293b'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb';
                  e.target.style.backgroundColor = '#ffffff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.backgroundColor = '#f8fafc';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
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
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                {showPassword ? '🙈' : '🙉'}
              </button>
            </div>

            {/* Forgot Password */}
            <Link 
              href="/reset-password" 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: '#2563eb',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: '600',
                marginTop: '0.75rem',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#1e40af'}
              onMouseLeave={(e) => e.target.style.color = '#2563eb'}
            >
              🔐 Forgot your password?
            </Link>
          </div>

          {/* Remember Device */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginTop: '0.25rem'
          }}>
            <input
              type="checkbox"
              id="rememberDevice"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              style={{
                width: '20px',
                height: '20px',
                cursor: 'pointer',
                accentColor: '#10b981',
                border: '2px solid #10b981',
                borderRadius: '4px'
              }}
            />
            <label 
              htmlFor="rememberDevice"
              style={{
                fontSize: '0.95rem',
                color: '#475569',
                fontWeight: '500',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              Remember this device
            </label>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading || !formData.email || !formData.password}
            style={{
              width: '100%',
              padding: '1.125rem 1.5rem',
              background: (loading || !formData.email || !formData.password) 
                ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' 
                : 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.05rem',
              fontWeight: '700',
              transition: 'all 0.3s ease',
              cursor: (loading || !formData.email || !formData.password) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '0.5rem',
              boxShadow: (loading || !formData.email || !formData.password) 
                ? 'none' 
                : '0 10px 25px rgba(37, 99, 235, 0.4)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (!loading && formData.email && formData.password) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 15px 35px rgba(37, 99, 235, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && formData.email && formData.password) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 10px 25px rgba(37, 99, 235, 0.4)';
              }
            }}
          >
            {(loading || !formData.email || !formData.password) ? (
              <span style={{ opacity: 0.7 }}>Sign In</span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Error Message */}
        {message && !loading && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            textAlign: 'center',
            fontSize: '0.9rem',
            fontWeight: '600',
            color: '#dc2626',
            backgroundColor: '#fee2e2',
            border: '2px solid #fca5a5'
          }}>
            {message}
          </div>
        )}

        {/* Footer Links */}
        <div style={{
          marginTop: '2rem',
          padding: '1.25rem 0 0',
          borderTop: '1px solid #e2e8f0',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: '0.9rem',
            color: '#64748b',
            margin: 0
          }}>
            Don't have an account?{' '}
            <Link 
              href="/apply" 
              style={{
                color: '#2563eb',
                textDecoration: 'none',
                fontWeight: '700'
              }}
              onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
            >
              Open Account
            </Link>
          </p>
        </div>
      </div>

      {/* Full-Screen Verification Overlay */}
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: '500px',
            padding: '2rem'
          }}>
            {/* Animated Spinner */}
            <div style={{
              width: '80px',
              height: '80px',
              border: '6px solid rgba(255, 255, 255, 0.2)',
              borderTop: '6px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 2.5rem'
            }}></div>

            {/* Main Message */}
            <h2 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: 'white',
              marginBottom: '1rem',
              margin: 0
            }}>
              {loadingStage === 0 && 'Verifying credentials'}
              {loadingStage === 1 && 'Authenticating account'}
              {loadingStage === 2 && 'Securing connection'}
              {loadingStage === 3 && 'Loading your dashboard'}
            </h2>

            <p style={{
              fontSize: '1.1rem',
              color: 'rgba(255, 255, 255, 0.9)',
              marginBottom: '2.5rem',
              lineHeight: '1.6'
            }}>
              Please wait while we securely sign you in...
            </p>

            {/* Progress Indicators */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem',
              marginTop: '2rem'
            }}>
              {[0, 1, 2, 3].map((stage) => (
                <div
                  key={stage}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: stage <= loadingStage 
                      ? 'white' 
                      : 'rgba(255, 255, 255, 0.3)',
                    transition: 'all 0.3s ease',
                    transform: stage === loadingStage ? 'scale(1.3)' : 'scale(1)',
                    boxShadow: stage === loadingStage 
                      ? '0 0 20px rgba(255, 255, 255, 0.8)' 
                      : 'none'
                  }}
                ></div>
              ))}
            </div>

            {/* Security Notice */}
            <div style={{
              marginTop: '3rem',
              padding: '1.25rem 1.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <p style={{
                fontSize: '0.9rem',
                color: 'rgba(255, 255, 255, 0.95)',
                margin: 0,
                lineHeight: '1.6',
                fontWeight: '500'
              }}>
                🔐 Your connection is secured with 256-bit SSL encryption
              </p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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
      `}</style>
    </div>
  );
}

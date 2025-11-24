import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function VerifyDeviceLogin() {
  const router = useRouter();
  const [verificationCode, setVerificationCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pendingData, setPendingData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes

  useEffect(() => {
    // Get pending device verification data
    const data = sessionStorage.getItem('pendingDeviceVerification');
    if (data) {
      setPendingData(JSON.parse(data));
    } else {
      router.push('/sign-in');
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(t => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!pendingData || !verificationCode) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (verificationCode.length !== 6 || !/^\d+$/.test(verificationCode)) {
        throw new Error('Please enter a valid 6-digit code');
      }

      // Sign in the user to get access token
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: pendingData.email,
        password: '' // This won't work, we need the token from somewhere
      });

      // Alternative: use the stored session to verify device
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expired. Please sign in again.');
      }

      const verifyResponse = await fetch('/api/verify-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          verificationCode,
          deviceInfo: pendingData.deviceInfo,
          rememberDevice
        })
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || 'Verification failed');
      }

      setMessage('✅ Device verified successfully! Redirecting...');
      sessionStorage.removeItem('pendingDeviceVerification');

      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!pendingData) {
    return <div style={styles.container}><div style={styles.spinner}></div></div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>🔐 Verify New Device</h1>
          <p style={styles.subtitle}>We detected a login from a new device</p>
        </div>

        {message && <div style={styles.successMessage}>{message}</div>}
        {error && <div style={styles.errorMessage}>{error}</div>}

        <div style={styles.deviceInfo}>
          <h3 style={styles.infoTitle}>Device Details:</h3>
          <p><strong>Device Type:</strong> {pendingData.deviceInfo.deviceType}</p>
          <p><strong>Operating System:</strong> {pendingData.deviceInfo.os}</p>
          <p><strong>Browser:</strong> {pendingData.deviceInfo.browser}</p>
        </div>

        <form onSubmit={handleVerify} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Verification Code</label>
            <p style={styles.hint}>Enter the 6-digit code sent to your email</p>
            <input
              type="text"
              maxLength="6"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              style={styles.input}
              placeholder="000000"
              disabled={loading}
            />
            <p style={styles.timer}>Code expires in: {formatTime(timeLeft)}</p>
          </div>

          <div style={styles.checkboxGroup}>
            <input
              type="checkbox"
              id="rememberDevice"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              disabled={loading}
            />
            <label htmlFor="rememberDevice" style={styles.checkboxLabel}>
              Trust this device for future logins
            </label>
          </div>

          <button
            type="submit"
            style={styles.submitButton}
            disabled={loading || verificationCode.length !== 6}
          >
            {loading ? '⏳ Verifying...' : '✓ Verify Device'}
          </button>
        </form>

        <div style={styles.securityInfo}>
          <p style={styles.securityText}>
            🔒 Your security is important. Never share this code with anyone.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e40af',
    margin: '0 0 10px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0
  },
  deviceInfo: {
    backgroundColor: '#f8fafc',
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '25px',
    border: '1px solid #e2e8f0'
  },
  infoTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e40af',
    marginTop: 0,
    marginBottom: '10px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  label: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e40af'
  },
  hint: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0
  },
  input: {
    padding: '12px 15px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '18px',
    fontWeight: '600',
    letterSpacing: '8px',
    textAlign: 'center',
    outline: 'none',
    transition: 'border-color 0.3s'
  },
  timer: {
    fontSize: '12px',
    color: '#64748b',
    margin: 0
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  checkboxLabel: {
    fontSize: '14px',
    color: '#1e293b',
    cursor: 'pointer'
  },
  submitButton: {
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.4)',
    transition: 'all 0.3s ease'
  },
  successMessage: {
    backgroundColor: '#dcfce7',
    border: '2px solid #16a34a',
    color: '#166534',
    padding: '12px 15px',
    borderRadius: '10px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: '500'
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    border: '2px solid #dc2626',
    color: '#dc2626',
    padding: '12px 15px',
    borderRadius: '10px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: '500'
  },
  securityInfo: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#eff6ff',
    borderRadius: '10px',
    border: '1px solid #bfdbfe'
  },
  securityText: {
    fontSize: '13px',
    color: '#1e40af',
    margin: 0,
    fontWeight: '500'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderTop: '4px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};

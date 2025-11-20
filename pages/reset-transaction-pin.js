import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

export default function ResetTransactionPin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPins, setShowPins] = useState({ new: false, confirm: false });
  const [countdown, setCountdown] = useState(0);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      setEmail(user.email);
    } catch (error) {
      console.error('Error checking user:', error);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expired. Please log in again.');
      }

      const response = await fetch('/api/request-pin-reset-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setMessage('A verification code has been sent to your email. Please check your inbox.');
      setCountdown(60);
      setStep(2);
    } catch (error) {
      console.error('Error requesting code:', error);
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      if (!verificationCode) {
        throw new Error('Please enter the verification code');
      }

      if (verificationCode.length !== 6) {
        throw new Error('Verification code must be 6 digits');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expired. Please log in again.');
      }

      // Verify the code exists and is valid
      const { data: codeData, error: codeError } = await supabase
        .from('pin_reset_codes')
        .select('*')
        .eq('email', email)
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (codeError || !codeData) {
        throw new Error('Invalid or expired verification code');
      }

      // Check if code has expired (15 minutes)
      const expiresAt = new Date(codeData.expires_at);
      if (new Date() > expiresAt) {
        throw new Error('Verification code has expired. Please request a new one.');
      }

      setMessage('Code verified successfully! Please enter your new PIN.');
      setStep(3);
    } catch (error) {
      console.error('Error verifying code:', error);
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      if (!newPin || !confirmPin) {
        throw new Error('Please enter and confirm your new PIN');
      }

      if (newPin.length !== 4 && newPin.length !== 6) {
        throw new Error('PIN must be 4 or 6 digits');
      }

      if (!/^\d+$/.test(newPin)) {
        throw new Error('PIN must contain only numbers');
      }

      if (newPin !== confirmPin) {
        throw new Error('PINs do not match');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expired. Please log in again.');
      }

      const response = await fetch('/api/reset-transaction-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email,
          verificationCode,
          newPin
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset PIN');
      }

      setMessage('✅ Transaction PIN reset successfully!');

      // Send email notification with better error handling
      try {
        const emailResponse = await fetch('/api/send-pin-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ actionType: 'reset' })
        });

        if (!emailResponse.ok) {
          console.error('Email notification failed:', await emailResponse.text());
        } else {
          console.log('Email notification sent successfully');
        }
      } catch (emailErr) {
        console.error('Email notification error:', emailErr);
      }

      setTimeout(() => {
        router.push('/security');
      }, 3000);
    } catch (error) {
      console.error('Error resetting PIN:', error);
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    const sanitized = value.replace(/\D/g, '').slice(0, 6);
    if (field === 'code') {
      setVerificationCode(sanitized);
    } else if (field === 'newPin') {
      setNewPin(sanitized);
    } else if (field === 'confirmPin') {
      setConfirmPin(sanitized);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Success Modal Overlay */}
      {message && (
        <div style={styles.modalOverlay}>
          <div style={styles.successModal}>
            <div style={styles.checkmarkCircle}>
              <div style={styles.checkmark}>✓</div>
            </div>
            <h2 style={styles.modalTitle}>Success!</h2>
            <p style={styles.modalMessage}>{message}</p>
            <p style={styles.modalSubtext}>
              A confirmation email has been sent to your registered email address.
            </p>
            <div style={styles.modalFooter}>
              <button 
                onClick={() => router.push('/security')}
                style={styles.goBackButton}
              >
                Go to Security Settings
              </button>
              <p style={styles.autoRedirectText}>Auto-redirecting in a few seconds...</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal Overlay */}
      {error && (
        <div style={styles.modalOverlay}>
          <div style={styles.errorModal}>
            <div style={styles.errorCircle}>
              <div style={styles.errorIcon}>✕</div>
            </div>
            <h2 style={styles.errorModalTitle}>Error!</h2>
            <p style={styles.errorModalMessage}>{error}</p>
            <button 
              onClick={() => setError('')}
              style={styles.errorModalButton}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      <div style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.title}>Reset Transaction PIN</h1>
          <button 
            style={styles.menuButton}
            onClick={() => router.push('/main-menu')}
          >
            ☰
          </button>
        </div>
        <button 
          style={styles.backButton}
          onClick={() => router.push('/security')}
        >
          ← Back to Security
        </button>
      </div>

      {/* Progress Indicator */}
      <div style={styles.progressContainer}>
        <div style={step >= 1 ? styles.progressStepActive : styles.progressStep}>
          <div style={styles.progressNumber}>1</div>
          <p style={styles.progressLabel}>Request Code</p>
        </div>
        <div style={styles.progressLine}></div>
        <div style={step >= 2 ? styles.progressStepActive : styles.progressStep}>
          <div style={styles.progressNumber}>2</div>
          <p style={styles.progressLabel}>Verify Code</p>
        </div>
        <div style={styles.progressLine}></div>
        <div style={step >= 3 ? styles.progressStepActive : styles.progressStep}>
          <div style={styles.progressNumber}>3</div>
          <p style={styles.progressLabel}>Reset PIN</p>
        </div>
      </div>

      {/* Step 1: Request Verification Code */}
      {step === 1 && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Request Verification Code</h2>
          <p style={styles.description}>
            For security purposes, we'll send a verification code to your registered email address to confirm your identity before resetting your Transaction PIN.
          </p>
          <form onSubmit={handleRequestCode}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                value={email}
                disabled
                style={styles.inputDisabled}
              />
              <p style={styles.hint}>We'll send the verification code to this email</p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              style={submitting ? styles.submitButtonDisabled : styles.submitButton}
            >
              {submitting ? 'Sending...' : 'Send Verification Code'}
            </button>
          </form>
        </div>
      )}

      {/* Step 2: Verify Code */}
      {step === 2 && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Enter Verification Code</h2>
          <p style={styles.description}>
            We've sent a 6-digit verification code to <strong>{email}</strong>. Please enter the code below.
          </p>
          <form onSubmit={handleVerifyCode}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Verification Code</label>
              <input
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => handleChange('code', e.target.value)}
                style={styles.codeInput}
                placeholder="Enter 6-digit code"
                required
              />
              <p style={styles.hint}>Check your email for the code</p>
            </div>
            <button
              type="submit"
              disabled={submitting || verificationCode.length !== 6}
              style={submitting || verificationCode.length !== 6 ? styles.submitButtonDisabled : styles.submitButton}
            >
              {submitting ? 'Verifying...' : 'Verify Code'}
            </button>
            {countdown > 0 ? (
              <p style={styles.resendHint}>Resend code in {countdown}s</p>
            ) : (
              <button
                type="button"
                onClick={handleRequestCode}
                style={styles.resendButton}
              >
                Resend Code
              </button>
            )}
          </form>
        </div>
      )}

      {/* Step 3: Reset PIN */}
      {step === 3 && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Set New Transaction PIN</h2>
          <p style={styles.description}>
            Create a new secure PIN for your transaction authorizations.
          </p>
          <form onSubmit={handleResetPin}>
            <div style={styles.formGroup}>
              <label style={styles.label}>New PIN</label>
              <div style={styles.pinInputWrapper}>
                <input
                  type={showPins.new ? 'text' : 'password'}
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => handleChange('newPin', e.target.value)}
                  style={styles.pinInput}
                  placeholder="Enter 4 or 6 digit PIN"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPins(prev => ({ ...prev, new: !prev.new }))}
                  style={styles.toggleButton}
                >
                  {showPins.new ? '🙈' : '👁️'}
                </button>
              </div>
              <p style={styles.hint}>Must be 4 or 6 digits (numbers only)</p>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Confirm New PIN</label>
              <div style={styles.pinInputWrapper}>
                <input
                  type={showPins.confirm ? 'text' : 'password'}
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => handleChange('confirmPin', e.target.value)}
                  style={styles.pinInput}
                  placeholder="Re-enter new PIN"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPins(prev => ({ ...prev, confirm: !prev.confirm }))}
                  style={styles.toggleButton}
                >
                  {showPins.confirm ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={styles.requirements}>
              <p style={styles.requirementsTitle}>PIN Requirements:</p>
              <ul style={styles.requirementsList}>
                <li style={newPin.length === 4 || newPin.length === 6 ? styles.valid : styles.invalid}>
                  {newPin.length === 4 || newPin.length === 6 ? '✓' : '○'} Must be 4 or 6 digits
                </li>
                <li style={/^\d+$/.test(newPin) && newPin ? styles.valid : styles.invalid}>
                  {/^\d+$/.test(newPin) && newPin ? '✓' : '○'} Numbers only
                </li>
                <li style={newPin === confirmPin && newPin ? styles.valid : styles.invalid}>
                  {newPin === confirmPin && newPin ? '✓' : '○'} PINs match
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={submitting || !newPin || !confirmPin || newPin !== confirmPin}
              style={submitting || !newPin || !confirmPin || newPin !== confirmPin ? styles.submitButtonDisabled : styles.submitButton}
            >
              {submitting ? 'Resetting PIN...' : 'Reset PIN'}
            </button>
          </form>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from {
            transform: translateY(-50px) scale(0.9);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
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
    paddingBottom: '40px'
  },
  header: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0
  },
  menuButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    padding: '10px 15px',
    borderRadius: '8px',
    fontSize: '18px',
    cursor: 'pointer'
  },
  backButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '70vh',
    color: '#64748b'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '15px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: '20px',
    backdropFilter: 'blur(4px)'
  },
  successModal: {
    backgroundColor: 'white',
    borderRadius: '24px',
    padding: '50px 40px',
    maxWidth: '520px',
    width: '100%',
    boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
    textAlign: 'center',
    animation: 'slideIn 0.4s ease-out',
    border: '3px solid #16a34a'
  },
  checkmarkCircle: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: '#dcfce7',
    border: '5px solid #16a34a',
    margin: '0 auto 25px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'scaleIn 0.5s ease-out',
    boxShadow: '0 8px 20px rgba(22, 163, 74, 0.3)'
  },
  checkmark: {
    fontSize: '60px',
    color: '#16a34a',
    fontWeight: 'bold',
    animation: 'scaleIn 0.6s ease-out 0.2s both'
  },
  modalTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#16a34a',
    margin: '0 0 20px 0',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  modalMessage: {
    fontSize: '18px',
    color: '#1e293b',
    margin: '0 0 10px 0',
    fontWeight: '500'
  },
  modalSubtext: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 25px 0',
    lineHeight: '1.5'
  },
  modalFooter: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '25px',
    marginTop: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    alignItems: 'center'
  },
  goBackButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '14px 32px',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
    transition: 'all 0.3s ease',
    width: '100%',
    maxWidth: '280px'
  },
  autoRedirectText: {
    fontSize: '13px',
    color: '#94a3b8',
    fontStyle: 'italic',
    margin: 0
  },
  errorModal: {
    backgroundColor: 'white',
    borderRadius: '24px',
    padding: '50px 40px',
    maxWidth: '520px',
    width: '100%',
    boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
    textAlign: 'center',
    animation: 'slideIn 0.4s ease-out',
    border: '3px solid #dc2626'
  },
  errorCircle: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: '#fee2e2',
    border: '5px solid #dc2626',
    margin: '0 auto 25px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'scaleIn 0.5s ease-out',
    boxShadow: '0 8px 20px rgba(220, 38, 38, 0.3)'
  },
  errorIcon: {
    fontSize: '60px',
    color: '#dc2626',
    fontWeight: 'bold',
    animation: 'scaleIn 0.6s ease-out 0.2s both'
  },
  errorModalTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#dc2626',
    margin: '0 0 20px 0',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  errorModalMessage: {
    fontSize: '18px',
    color: '#1e293b',
    margin: '0 0 30px 0',
    fontWeight: '500',
    lineHeight: '1.5'
  },
  errorModalButton: {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '14px 40px',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
    transition: 'all 0.3s ease'
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '30px 20px',
    maxWidth: '600px',
    margin: '0 auto'
  },
  progressStep: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: '0 0 auto'
  },
  progressStepActive: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: '0 0 auto'
  },
  progressNumber: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '18px',
    marginBottom: '8px'
  },
  progressLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
    margin: 0
  },
  progressLine: {
    flex: '1 1 auto',
    height: '2px',
    backgroundColor: '#e2e8f0',
    margin: '0 10px',
    marginBottom: '24px'
  },
  card: {
    backgroundColor: 'white',
    margin: '20px',
    borderRadius: '16px',
    padding: '25px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '15px'
  },
  description: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '25px',
    lineHeight: '1.6'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#1e40af',
    fontSize: '14px'
  },
  inputDisabled: {
    width: '100%',
    padding: '12px 15px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '16px',
    backgroundColor: '#f1f5f9',
    color: '#64748b'
  },
  codeInput: {
    width: '100%',
    padding: '12px 15px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '24px',
    fontWeight: '700',
    letterSpacing: '8px',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    outline: 'none'
  },
  pinInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  pinInput: {
    width: '100%',
    padding: '12px 50px 12px 15px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '18px',
    fontWeight: '600',
    letterSpacing: '4px',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    outline: 'none'
  },
  toggleButton: {
    position: 'absolute',
    right: '15px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '20px',
    padding: '5px'
  },
  hint: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '6px',
    marginLeft: '4px'
  },
  requirements: {
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    padding: '15px',
    marginBottom: '20px'
  },
  requirementsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '10px'
  },
  requirementsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },
  valid: {
    color: '#16a34a',
    fontSize: '14px',
    marginBottom: '6px'
  },
  invalid: {
    color: '#64748b',
    fontSize: '14px',
    marginBottom: '6px'
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.4)'
  },
  submitButtonDisabled: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#94a3b8',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'not-allowed',
    opacity: 0.7
  },
  resendHint: {
    textAlign: 'center',
    marginTop: '15px',
    fontSize: '14px',
    color: '#64748b'
  },
  resendButton: {
    width: '100%',
    marginTop: '15px',
    padding: '12px',
    background: 'transparent',
    color: '#3b82f6',
    border: '2px solid #3b82f6',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};

import { useEffect, useState } from 'react';

export default function SessionTimeoutModal({ 
  isOpen, 
  onClose, 
  onContinue, 
  type = 'warning',
  message = ''
}) {
  const [countdown, setCountdown] = useState(120);

  useEffect(() => {
    if (!isOpen || type !== 'warning') return;

    setCountdown(120);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, type]);

  if (!isOpen) return null;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isExpired = type === 'expired';

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <img 
              src="/images/Oakline_Bank_logo_design_c1b04ae0.png" 
              alt="Oakline Bank" 
              style={styles.logo}
            />
            <span style={styles.bankName}>Oakline Bank</span>
          </div>
        </div>

        <div style={styles.content}>
          <div style={{
            ...styles.iconCircle,
            backgroundColor: isExpired ? '#fef2f2' : '#fffbeb'
          }}>
            <span style={{
              ...styles.icon,
              color: isExpired ? '#dc2626' : '#f59e0b'
            }}>
              {isExpired ? '🔒' : '⏰'}
            </span>
          </div>

          <h2 style={styles.title}>
            {isExpired ? 'Session Expired' : 'Session Timeout Warning'}
          </h2>

          <p style={styles.message}>
            {isExpired 
              ? 'Your session has expired due to inactivity. For your security, please log in again to continue.'
              : `Your session will expire in ${formatTime(countdown)} due to inactivity.`
            }
          </p>

          {!isExpired && (
            <p style={styles.subMessage}>
              Click "Continue Session" to stay logged in.
            </p>
          )}

          <div style={styles.buttonContainer}>
            {isExpired ? (
              <button 
                onClick={onClose}
                style={styles.primaryButton}
              >
                Log In Again
              </button>
            ) : (
              <>
                <button 
                  onClick={onContinue}
                  style={styles.primaryButton}
                >
                  Continue Session
                </button>
                <button 
                  onClick={onClose}
                  style={styles.secondaryButton}
                >
                  Log Out Now
                </button>
              </>
            )}
          </div>
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            For your security, sessions automatically expire after a period of inactivity.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
    animation: 'modalSlideIn 0.3s ease-out',
  },
  header: {
    background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    width: '40px',
    height: '40px',
    objectFit: 'contain',
    borderRadius: '6px',
  },
  bankName: {
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
  },
  content: {
    padding: '32px 24px',
    textAlign: 'center',
  },
  iconCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
  },
  icon: {
    fontSize: '40px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: '12px',
    margin: '0 0 12px 0',
  },
  message: {
    fontSize: '16px',
    color: '#4a5568',
    lineHeight: '1.6',
    marginBottom: '8px',
    margin: '0 0 8px 0',
  },
  subMessage: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '24px',
    margin: '0 0 24px 0',
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  primaryButton: {
    width: '100%',
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff',
    background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 14px rgba(26, 54, 93, 0.3)',
  },
  secondaryButton: {
    width: '100%',
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#4a5568',
    backgroundColor: '#edf2f7',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  footer: {
    borderTop: '1px solid #e2e8f0',
    padding: '16px 24px',
    backgroundColor: '#f7fafc',
  },
  footerText: {
    fontSize: '13px',
    color: '#718096',
    textAlign: 'center',
    margin: 0,
  },
};

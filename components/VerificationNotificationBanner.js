import { useState } from 'react';
import Link from 'next/link';

export default function VerificationNotificationBanner({ onDismiss, verificationReason }) {
  const [visible, setVisible] = useState(true);

  const handleDismiss = () => {
    setVisible(false);
    if (onDismiss) onDismiss();
  };

  if (!visible) return null;

  return (
    <div style={styles.bannerContainer}>
      <div style={styles.banner}>
        <div style={styles.iconSection}>
          <div style={styles.icon}>🔐</div>
        </div>

        <div style={styles.contentSection}>
          <h3 style={styles.title}>Identity Verification Required</h3>
          
          {verificationReason && (
            <p style={styles.reason}>
              <strong>Reason:</strong> {verificationReason}
            </p>
          )}
          
          <p style={styles.message}>
            For your security, we need you to complete a video or selfie verification. 
            This helps us protect your account and comply with banking regulations.
          </p>
        </div>

        <div style={styles.actionSection}>
          <Link href="/verify-identity">
            <button style={styles.verifyButton}>
              Complete Verification
            </button>
          </Link>
          <button 
            style={styles.dismissButton}
            onClick={handleDismiss}
            title="Dismiss this message"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  bannerContainer: {
    width: '100%',
    padding: '0 16px',
    marginBottom: '24px',
  },
  banner: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(255, 193, 7, 0.15)',
  },
  iconSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: {
    fontSize: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentSection: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#664d03',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  reason: {
    margin: '8px 0',
    padding: '8px 12px',
    fontSize: '13px',
    color: '#664d03',
    backgroundColor: 'rgba(255, 193, 7, 0.3)',
    borderLeft: '3px solid #ff9800',
    borderRadius: '4px',
    lineHeight: '1.4',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  message: {
    margin: '8px 0 0 0',
    fontSize: '14px',
    color: '#856404',
    lineHeight: '1.5',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  actionSection: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexShrink: 0,
  },
  verifyButton: {
    padding: '8px 16px',
    backgroundColor: '#ffc107',
    color: '#000',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    '&:hover': {
      backgroundColor: '#ffb300',
      transform: 'translateY(-1px)',
    },
  },
  dismissButton: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    color: '#664d03',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    '&:hover': {
      color: '#000',
    },
  },
};

import { useState } from 'react';

export default function StatusMessageBanner({ type, reason, contactEmail = 'support@theoaklinebank.com' }) {
  const [copied, setCopied] = useState(false);

  const statusConfig = {
    banned: {
      emoji: '🚫',
      title: 'Account Restricted',
      message: 'Your account access has been restricted.',
      gradient: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)',
      bgColor: '#991b1b',
      borderColor: '#b91c1c'
    },
    suspended: {
      emoji: '⏸️',
      title: 'Account Suspended',
      message: 'Your account has been temporarily suspended.',
      gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
      bgColor: '#92400e',
      borderColor: '#d97706'
    },
    locked: {
      emoji: '🔒',
      title: 'Account Locked',
      message: 'Your account is locked for security reasons.',
      gradient: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
      bgColor: '#1e3a8a',
      borderColor: '#1e40af'
    },
    closed: {
      emoji: '❌',
      title: 'Account Closed',
      message: 'This account has been closed and cannot be accessed.',
      gradient: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
      bgColor: '#374151',
      borderColor: '#4b5563'
    }
  };

  const config = statusConfig[type] || statusConfig.banned;

  const handleContactSupport = () => {
    const subject = encodeURIComponent(`${config.title} - Support Request`);
    const body = encodeURIComponent(`Hello Support Team,\n\nI am contacting you regarding my ${type} account.\n\n${reason ? `Reason: ${reason}\n\n` : ''}Please assist me with this matter.\n\nThank you.`);
    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(contactEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div style={styles.container}>
      <div style={{ ...styles.banner, background: config.gradient, borderColor: config.borderColor }}>
        {/* Icon Section */}
        <div style={styles.iconSection}>
          <div style={{ ...styles.iconCircle, backgroundColor: config.bgColor }}>
            <span style={styles.emoji}>{config.emoji}</span>
          </div>
        </div>

        {/* Content Section */}
        <div style={styles.contentSection}>
          <h3 style={styles.title}>{config.title}</h3>
          <p style={styles.message}>{config.message}</p>
          
          {reason && (
            <div style={styles.reasonBox}>
              <strong style={styles.reasonLabel}>Reason:</strong>
              <span style={styles.reasonText}>{reason}</span>
            </div>
          )}

          {/* Contact Information */}
          <div style={styles.contactSection}>
            <div style={styles.contactInfo}>
              <span style={styles.contactLabel}>Need help?</span>
              <span style={styles.contactText}>Contact us at:</span>
              <div style={styles.emailContainer}>
                <span style={styles.emailText}>{contactEmail}</span>
                <button
                  onClick={copyEmail}
                  style={styles.copyButton}
                  title="Copy email address"
                >
                  {copied ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={styles.actionButtons}>
              <button
                onClick={handleContactSupport}
                style={styles.contactButton}
              >
                📧 Email Support
              </button>
              <a
                href="tel:+16366356122"
                style={styles.phoneButton}
              >
                📞 Call Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    maxWidth: '100%',
    margin: '0',
    padding: '0',
  },
  banner: {
    borderRadius: '12px',
    border: '2px solid',
    padding: '1.5rem',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    animation: 'slideDown 0.3s ease-out',
  },
  iconSection: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '1.5rem',
  },
  iconCircle: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  emoji: {
    fontSize: '32px',
  },
  contentSection: {
    textAlign: 'center',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '0.5rem',
    margin: '0 0 0.5rem 0',
  },
  message: {
    fontSize: '1rem',
    color: '#f3f4f6',
    marginBottom: '1.25rem',
    margin: '0 0 1.25rem 0',
    lineHeight: '1.6',
  },
  reasonBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1.5rem',
    textAlign: 'left',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  reasonLabel: {
    display: 'block',
    fontSize: '0.875rem',
    color: '#fbbf24',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  reasonText: {
    fontSize: '1rem',
    color: '#ffffff',
    lineHeight: '1.5',
  },
  contactSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '1.5rem',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  contactInfo: {
    marginBottom: '1rem',
  },
  contactLabel: {
    display: 'block',
    fontSize: '0.875rem',
    color: '#fbbf24',
    marginBottom: '0.25rem',
    fontWeight: '600',
  },
  contactText: {
    display: 'block',
    fontSize: '0.875rem',
    color: '#e5e7eb',
    marginBottom: '0.5rem',
  },
  emailContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  emailText: {
    fontSize: '1rem',
    color: '#ffffff',
    fontWeight: '600',
  },
  copyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '6px',
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: '500',
  },
  actionButtons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  contactButton: {
    backgroundColor: '#ffffff',
    color: '#1f2937',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
    flex: '1',
    minWidth: '150px',
  },
  phoneButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    border: '2px solid #ffffff',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    textDecoration: 'none',
    display: 'inline-block',
    flex: '1',
    minWidth: '150px',
    textAlign: 'center',
  },
};

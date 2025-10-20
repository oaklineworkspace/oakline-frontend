
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

export default function MfaSetup() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      await checkMfaStatus(user.id);
    } catch (error) {
      console.error('Error checking user:', error);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const checkMfaStatus = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_mfa_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (data && data.enabled) {
        setIsEnabled(true);
        setStep(4); // Show management screen
      }
    } catch (error) {
      console.error('Error checking MFA status:', error);
    }
  };

  const generateMfaSecret = async () => {
    try {
      // Generate a random secret for demonstration
      const randomSecret = Array.from(crypto.getRandomValues(new Uint8Array(20)))
        .map(b => b.toString(36))
        .join('')
        .substring(0, 32)
        .toUpperCase();
      
      setSecret(randomSecret);
      
      // Generate QR code URL (in production, use a proper QR code library)
      const qrUrl = `otpauth://totp/Oakline%20Bank:${user.email}?secret=${randomSecret}&issuer=Oakline%20Bank`;
      setQrCode(qrUrl);
      
      setStep(2);
    } catch (error) {
      setError('Failed to generate MFA secret');
    }
  };

  const verifyMfaCode = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      // In production, verify the TOTP code against the secret
      if (verificationCode.length !== 6) {
        throw new Error('Please enter a 6-digit code');
      }
      
      // Generate backup codes
      const codes = Array.from({ length: 8 }, () =>
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );
      setBackupCodes(codes);
      
      // Save MFA settings to database
      const { error } = await supabase
        .from('user_mfa_settings')
        .upsert({
          user_id: user.id,
          secret: secret,
          enabled: true,
          backup_codes: codes,
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      setIsEnabled(true);
      setStep(3);
      setMessage('Two-Factor Authentication enabled successfully!');
    } catch (error) {
      setError(error.message);
    }
  };

  const disableMfa = async () => {
    try {
      const { error } = await supabase
        .from('user_mfa_settings')
        .update({ enabled: false })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setIsEnabled(false);
      setStep(1);
      setMessage('Two-Factor Authentication disabled successfully');
    } catch (error) {
      setError('Failed to disable MFA');
    }
  };

  const regenerateBackupCodes = async () => {
    try {
      const codes = Array.from({ length: 8 }, () =>
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );
      
      const { error } = await supabase
        .from('user_mfa_settings')
        .update({ backup_codes: codes })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setBackupCodes(codes);
      setMessage('New backup codes generated successfully');
    } catch (error) {
      setError('Failed to generate new backup codes');
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading MFA settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.title}>Two-Factor Authentication</h1>
          <button 
            style={styles.menuButton}
            onClick={() => router.push('/main-menu')}
          >
            ☰
          </button>
        </div>
        <div style={styles.headerActions}>
          <button 
            style={styles.backButton}
            onClick={() => router.push('/security')}
          >
            ← Back to Security
          </button>
        </div>
      </div>

      {message && (
        <div style={styles.message}>{message}</div>
      )}

      {error && (
        <div style={styles.error}>{error}</div>
      )}

      <div style={styles.card}>
        {/* Step 1: Introduction */}
        {step === 1 && (
          <div style={styles.stepContent}>
            <div style={styles.stepHeader}>
              <h2 style={styles.stepTitle}>🛡️ Secure Your Account</h2>
              <p style={styles.stepDescription}>
                Two-Factor Authentication (2FA) adds an extra layer of security to your account.
                Even if someone knows your password, they won't be able to access your account without your phone.
              </p>
            </div>
            
            <div style={styles.benefitsList}>
              <div style={styles.benefit}>
                <span style={styles.benefitIcon}>🔐</span>
                <div>
                  <h3>Enhanced Security</h3>
                  <p>Protect your account from unauthorized access</p>
                </div>
              </div>
              <div style={styles.benefit}>
                <span style={styles.benefitIcon}>📱</span>
                <div>
                  <h3>Mobile App</h3>
                  <p>Use Google Authenticator or similar apps</p>
                </div>
              </div>
              <div style={styles.benefit}>
                <span style={styles.benefitIcon}>🔄</span>
                <div>
                  <h3>Backup Codes</h3>
                  <p>Access your account even without your phone</p>
                </div>
              </div>
            </div>
            
            <div style={styles.stepActions}>
              <button 
                style={styles.primaryButton}
                onClick={generateMfaSecret}
              >
                Set Up Two-Factor Authentication
              </button>
            </div>
          </div>
        )}

        {/* Step 2: QR Code Setup */}
        {step === 2 && (
          <div style={styles.stepContent}>
            <div style={styles.stepHeader}>
              <h2 style={styles.stepTitle}>📱 Set Up Your Authenticator App</h2>
              <p style={styles.stepDescription}>
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
            </div>
            
            <div style={styles.qrSection}>
              <div style={styles.qrPlaceholder}>
                <div style={styles.qrCode}>
                  <div style={styles.qrPattern}>
                    {/* QR Code placeholder pattern */}
                    {Array.from({ length: 25 }, (_, i) => (
                      <div key={i} style={{
                        ...styles.qrSquare,
                        backgroundColor: Math.random() > 0.5 ? '#000' : '#fff'
                      }} />
                    ))}
                  </div>
                  <p style={styles.qrText}>QR Code</p>
                </div>
              </div>
              
              <div style={styles.manualEntry}>
                <h3>Can't scan? Enter this code manually:</h3>
                <div style={styles.secretCode}>
                  <code>{secret}</code>
                  <button 
                    style={styles.copyButton}
                    onClick={() => navigator.clipboard.writeText(secret)}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
            
            <form onSubmit={verifyMfaCode}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Enter the 6-digit code from your authenticator app:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  style={styles.codeInput}
                  placeholder="000000"
                  required
                />
              </div>
              
              <div style={styles.stepActions}>
                <button 
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => setStep(1)}
                >
                  Back
                </button>
                <button 
                  type="submit"
                  style={styles.primaryButton}
                  disabled={verificationCode.length !== 6}
                >
                  Verify & Enable
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Backup Codes */}
        {step === 3 && (
          <div style={styles.stepContent}>
            <div style={styles.stepHeader}>
              <h2 style={styles.stepTitle}>💾 Save Your Backup Codes</h2>
              <p style={styles.stepDescription}>
                Store these backup codes in a safe place. You can use them to access your account if you lose your phone.
              </p>
            </div>
            
            <div style={styles.backupCodes}>
              {backupCodes.map((code, index) => (
                <div key={index} style={styles.backupCode}>
                  <code>{code}</code>
                </div>
              ))}
            </div>
            
            <div style={styles.importantNote}>
              <h3>⚠️ Important:</h3>
              <ul>
                <li>Each backup code can only be used once</li>
                <li>Store these codes in a secure location</li>
                <li>Don't share these codes with anyone</li>
              </ul>
            </div>
            
            <div style={styles.stepActions}>
              <button 
                style={styles.secondaryButton}
                onClick={() => {
                  const codes = backupCodes.join('\n');
                  const blob = new Blob([codes], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'oakline-bank-backup-codes.txt';
                  a.click();
                }}
              >
                Download Codes
              </button>
              <button 
                style={styles.primaryButton}
                onClick={() => setStep(4)}
              >
                I've Saved My Codes
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Management */}
        {step === 4 && isEnabled && (
          <div style={styles.stepContent}>
            <div style={styles.stepHeader}>
              <h2 style={styles.stepTitle}>✅ Two-Factor Authentication Enabled</h2>
              <p style={styles.stepDescription}>
                Your account is now protected with Two-Factor Authentication.
              </p>
            </div>
            
            <div style={styles.managementGrid}>
              <div style={styles.managementCard}>
                <h3>🔄 Regenerate Backup Codes</h3>
                <p>Generate new backup codes and invalidate the old ones</p>
                <button 
                  style={styles.secondaryButton}
                  onClick={regenerateBackupCodes}
                >
                  Generate New Codes
                </button>
              </div>
              
              <div style={styles.managementCard}>
                <h3>📱 Update Authenticator</h3>
                <p>Set up 2FA on a new device or app</p>
                <button 
                  style={styles.secondaryButton}
                  onClick={() => setStep(1)}
                >
                  Reconfigure
                </button>
              </div>
              
              <div style={styles.managementCard}>
                <h3>❌ Disable 2FA</h3>
                <p>Remove Two-Factor Authentication from your account</p>
                <button 
                  style={styles.dangerButton}
                  onClick={disableMfa}
                >
                  Disable 2FA
                </button>
              </div>
            </div>
            
            {backupCodes.length > 0 && (
              <div style={styles.backupCodesSection}>
                <h3>Your Current Backup Codes:</h3>
                <div style={styles.backupCodes}>
                  {backupCodes.map((code, index) => (
                    <div key={index} style={styles.backupCode}>
                      <code>{code}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '0',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    padding: '15px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: 0
  },
  menuButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer'
  },
  headerActions: {
    display: 'flex',
    gap: '10px'
  },
  backButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
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
  message: {
    backgroundColor: '#dcfce7',
    border: '1px solid #bbf7d0',
    color: '#166534',
    padding: '12px 15px',
    borderRadius: '8px',
    margin: '15px',
    fontSize: '14px'
  },
  error: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '12px 15px',
    borderRadius: '8px',
    margin: '15px',
    fontSize: '14px'
  },
  card: {
    backgroundColor: 'white',
    margin: '15px',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  stepContent: {
    textAlign: 'center'
  },
  stepHeader: {
    marginBottom: '30px'
  },
  stepTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '10px'
  },
  stepDescription: {
    fontSize: '16px',
    color: '#64748b',
    lineHeight: '1.6'
  },
  benefitsList: {
    display: 'grid',
    gap: '20px',
    marginBottom: '30px'
  },
  benefit: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    textAlign: 'left',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px'
  },
  benefitIcon: {
    fontSize: '32px'
  },
  qrSection: {
    marginBottom: '30px'
  },
  qrPlaceholder: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px'
  },
  qrCode: {
    width: '200px',
    height: '200px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff'
  },
  qrPattern: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '2px',
    width: '100px',
    height: '100px'
  },
  qrSquare: {
    width: '100%',
    height: '100%'
  },
  qrText: {
    marginTop: '10px',
    fontSize: '14px',
    color: '#64748b'
  },
  manualEntry: {
    textAlign: 'center'
  },
  secretCode: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '10px'
  },
  copyButton: {
    padding: '5px 10px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '10px'
  },
  codeInput: {
    width: '200px',
    padding: '15px',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '24px',
    textAlign: 'center',
    letterSpacing: '5px'
  },
  stepActions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  primaryButton: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  secondaryButton: {
    padding: '12px 24px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  dangerButton: {
    padding: '12px 24px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  backupCodes: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '10px',
    marginBottom: '20px'
  },
  backupCode: {
    padding: '10px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    textAlign: 'center'
  },
  importantNote: {
    textAlign: 'left',
    backgroundColor: '#fef3c7',
    border: '1px solid #f59e0b',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  managementGrid: {
    display: 'grid',
    gap: '20px',
    marginBottom: '30px'
  },
  managementCard: {
    padding: '20px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    textAlign: 'left'
  },
  backupCodesSection: {
    textAlign: 'left',
    marginTop: '30px',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px'
  }
};

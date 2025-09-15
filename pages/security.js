
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Security() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    emailAlerts: true,
    smsAlerts: false,
    loginAlerts: true,
    transactionAlerts: true,
    accountAccessAlerts: true,
    fraudAlerts: true,
    passwordChangeAlerts: true,
    deviceLoginAlerts: true,
    largeTransactionAlerts: true,
    internationalTransactionAlerts: false,
    accountLockAlerts: true,
    suspiciousActivityAlerts: true
  });
  const [sessions, setSessions] = useState([]);
  const router = useRouter();

  // Password Change Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

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
      await loadSecuritySettings(user.id);
      await loadActiveSessions();
    } catch (error) {
      console.error('Error checking user:', error);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const loadSecuritySettings = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_security_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (data) {
        setSecuritySettings(data);
      }
    } catch (error) {
      console.error('Error loading security settings:', error);
    }
  };

  const loadActiveSessions = async () => {
    // In a real implementation, you'd load active sessions from your backend
    const mockSessions = [
      {
        id: 1,
        device: 'Chrome on Windows',
        location: 'New York, NY',
        lastActive: new Date().toISOString(),
        current: true
      },
      {
        id: 2,
        device: 'Mobile App - iPhone',
        location: 'New York, NY',
        lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        current: false
      }
    ];
    setSessions(mockSessions);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setMessage('');
    setError('');

    try {
      // Validate passwords match
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('New passwords do not match');
      }

      // Validate password strength
      if (passwordData.newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword
      });

      if (verifyError) {
        throw new Error('Current password is incorrect');
      }

      // If verification successful, update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) throw updateError;

      setMessage('Password updated successfully!');
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const updateSecuritySetting = async (setting, value) => {
    try {
      const updatedSettings = { ...securitySettings, [setting]: value };
      setSecuritySettings(updatedSettings);

      // Save to database
      const { error } = await supabase
        .from('user_security_settings')
        .upsert({
          user_id: user.id,
          ...updatedSettings
        });

      if (error) throw error;
      setMessage('Security setting updated successfully');
    } catch (error) {
      setError('Failed to update security setting');
      // Revert on error
      setSecuritySettings(securitySettings);
    }
  };

  const terminateSession = async (sessionId) => {
    try {
      // In a real implementation, you'd call your backend to terminate the session
      setSessions(sessions.filter(s => s.id !== sessionId));
      setMessage('Session terminated successfully');
    } catch (error) {
      setError('Failed to terminate session');
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading security settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.title}>Security Settings</h1>
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
            onClick={() => router.push('/profile')}
          >
            ← Back to Profile
          </button>
        </div>
      </div>

      {message && (
        <div style={styles.message}>{message}</div>
      )}

      {error && (
        <div style={styles.error}>{error}</div>
      )}

      {/* Password Security */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🔐 Password & Authentication</h2>
        <div style={styles.securityItem}>
          <div style={styles.securityInfo}>
            <h3 style={styles.securityLabel}>Password</h3>
            <p style={styles.securityDescription}>
              Last changed: {new Date(user?.updated_at).toLocaleDateString()}
            </p>
          </div>
          <button 
            style={styles.primaryButton}
            onClick={() => setShowPasswordModal(true)}
          >
            Change Password
          </button>
        </div>

        <div style={styles.securityItem}>
          <div style={styles.securityInfo}>
            <h3 style={styles.securityLabel}>Two-Factor Authentication</h3>
            <p style={styles.securityDescription}>
              Add an extra layer of security to your account
            </p>
          </div>
          <button 
            style={securitySettings.twoFactorEnabled ? styles.enabledButton : styles.disabledButton}
            onClick={() => router.push('/mfa-setup')}
          >
            {securitySettings.twoFactorEnabled ? 'Enabled' : 'Setup 2FA'}
          </button>
        </div>
      </div>

      {/* Notification Settings */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🔔 Security Alerts</h2>
        
        <div style={styles.securityItem}>
          <div style={styles.securityInfo}>
            <h3 style={styles.securityLabel}>Email Alerts</h3>
            <p style={styles.securityDescription}>
              Receive security alerts via email
            </p>
          </div>
          <label style={styles.switch}>
            <input
              type="checkbox"
              checked={securitySettings.emailAlerts}
              onChange={(e) => updateSecuritySetting('emailAlerts', e.target.checked)}
            />
            <span style={{...styles.slider, backgroundColor: securitySettings.emailAlerts ? '#10b981' : '#cbd5e0'}}></span>
          </label>
        </div>

        <div style={styles.securityItem}>
          <div style={styles.securityInfo}>
            <h3 style={styles.securityLabel}>Login Notifications</h3>
            <p style={styles.securityDescription}>
              Get notified when someone signs into your account
            </p>
          </div>
          <label style={styles.switch}>
            <input
              type="checkbox"
              checked={securitySettings.loginAlerts}
              onChange={(e) => updateSecuritySetting('loginAlerts', e.target.checked)}
            />
            <span style={{...styles.slider, backgroundColor: securitySettings.loginAlerts ? '#10b981' : '#cbd5e0'}}></span>
          </label>
        </div>

        <div style={styles.securityItem}>
          <div style={styles.securityInfo}>
            <h3 style={styles.securityLabel}>Transaction Alerts</h3>
            <p style={styles.securityDescription}>
              Receive notifications for all transactions
            </p>
          </div>
          <label style={styles.switch}>
            <input
              type="checkbox"
              checked={securitySettings.transactionAlerts}
              onChange={(e) => updateSecuritySetting('transactionAlerts', e.target.checked)}
            />
            <span style={{...styles.slider, backgroundColor: securitySettings.transactionAlerts ? '#10b981' : '#cbd5e0'}}></span>
          </label>
        </div>

        <div style={styles.securityItem}>
          <div style={styles.securityInfo}>
            <h3 style={styles.securityLabel}>SMS Alerts</h3>
            <p style={styles.securityDescription}>
              Receive security alerts via SMS
            </p>
          </div>
          <label style={styles.switch}>
            <input
              type="checkbox"
              checked={securitySettings.smsAlerts}
              onChange={(e) => updateSecuritySetting('smsAlerts', e.target.checked)}
            />
            <span style={{...styles.slider, backgroundColor: securitySettings.smsAlerts ? '#10b981' : '#cbd5e0'}}></span>
          </label>
        </div>

        <div style={styles.securityItem}>
          <div style={styles.securityInfo}>
            <h3 style={styles.securityLabel}>Fraud Detection Alerts</h3>
            <p style={styles.securityDescription}>
              Get notified of suspicious or fraudulent activity
            </p>
          </div>
          <label style={styles.switch}>
            <input
              type="checkbox"
              checked={securitySettings.fraudAlerts}
              onChange={(e) => updateSecuritySetting('fraudAlerts', e.target.checked)}
            />
            <span style={{...styles.slider, backgroundColor: securitySettings.fraudAlerts ? '#10b981' : '#cbd5e0'}}></span>
          </label>
        </div>

        <div style={styles.securityItem}>
          <div style={styles.securityInfo}>
            <h3 style={styles.securityLabel}>Password Change Alerts</h3>
            <p style={styles.securityDescription}>
              Be notified when your password is changed
            </p>
          </div>
          <label style={styles.switch}>
            <input
              type="checkbox"
              checked={securitySettings.passwordChangeAlerts}
              onChange={(e) => updateSecuritySetting('passwordChangeAlerts', e.target.checked)}
            />
            <span style={{...styles.slider, backgroundColor: securitySettings.passwordChangeAlerts ? '#10b981' : '#cbd5e0'}}></span>
          </label>
        </div>

        <div style={styles.securityItem}>
          <div style={styles.securityInfo}>
            <h3 style={styles.securityLabel}>New Device Login Alerts</h3>
            <p style={styles.securityDescription}>
              Get alerted when you login from a new device
            </p>
          </div>
          <label style={styles.switch}>
            <input
              type="checkbox"
              checked={securitySettings.deviceLoginAlerts}
              onChange={(e) => updateSecuritySetting('deviceLoginAlerts', e.target.checked)}
            />
            <span style={{...styles.slider, backgroundColor: securitySettings.deviceLoginAlerts ? '#10b981' : '#cbd5e0'}}></span>
          </label>
        </div>

        <div style={styles.securityItem}>
          <div style={styles.securityInfo}>
            <h3 style={styles.securityLabel}>Large Transaction Alerts</h3>
            <p style={styles.securityDescription}>
              Receive alerts for transactions over $1,000
            </p>
          </div>
          <label style={styles.switch}>
            <input
              type="checkbox"
              checked={securitySettings.largeTransactionAlerts}
              onChange={(e) => updateSecuritySetting('largeTransactionAlerts', e.target.checked)}
            />
            <span style={{...styles.slider, backgroundColor: securitySettings.largeTransactionAlerts ? '#10b981' : '#cbd5e0'}}></span>
          </label>
        </div>

        <div style={styles.securityItem}>
          <div style={styles.securityInfo}>
            <h3 style={styles.securityLabel}>International Transaction Alerts</h3>
            <p style={styles.securityDescription}>
              Get notified of transactions made outside the US
            </p>
          </div>
          <label style={styles.switch}>
            <input
              type="checkbox"
              checked={securitySettings.internationalTransactionAlerts}
              onChange={(e) => updateSecuritySetting('internationalTransactionAlerts', e.target.checked)}
            />
            <span style={{...styles.slider, backgroundColor: securitySettings.internationalTransactionAlerts ? '#10b981' : '#cbd5e0'}}></span>
          </label>
        </div>

        <div style={styles.securityItem}>
          <div style={styles.securityInfo}>
            <h3 style={styles.securityLabel}>Account Lock Alerts</h3>
            <p style={styles.securityDescription}>
              Be notified when your account is locked or frozen
            </p>
          </div>
          <label style={styles.switch}>
            <input
              type="checkbox"
              checked={securitySettings.accountLockAlerts}
              onChange={(e) => updateSecuritySetting('accountLockAlerts', e.target.checked)}
            />
            <span style={{...styles.slider, backgroundColor: securitySettings.accountLockAlerts ? '#10b981' : '#cbd5e0'}}></span>
          </label>
        </div>

        <div style={styles.securityItem}>
          <div style={styles.securityInfo}>
            <h3 style={styles.securityLabel}>Suspicious Activity Alerts</h3>
            <p style={styles.securityDescription}>
              Receive alerts for unusual account activity patterns
            </p>
          </div>
          <label style={styles.switch}>
            <input
              type="checkbox"
              checked={securitySettings.suspiciousActivityAlerts}
              onChange={(e) => updateSecuritySetting('suspiciousActivityAlerts', e.target.checked)}
            />
            <span style={{...styles.slider, backgroundColor: securitySettings.suspiciousActivityAlerts ? '#10b981' : '#cbd5e0'}}></span>
          </label>
        </div>
      </div>

      {/* Active Sessions */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📱 Active Sessions</h2>
        <p style={styles.cardDescription}>
          Manage devices and locations where you're signed in
        </p>
        
        {sessions.map(session => (
          <div key={session.id} style={styles.sessionItem}>
            <div style={styles.sessionInfo}>
              <h3 style={styles.sessionDevice}>
                {session.device}
                {session.current && <span style={styles.currentSession}> (Current)</span>}
              </h3>
              <p style={styles.sessionDetails}>
                📍 {session.location} • Last active: {new Date(session.lastActive).toLocaleString()}
              </p>
            </div>
            {!session.current && (
              <button 
                style={styles.terminateButton}
                onClick={() => terminateSession(session.id)}
              >
                Terminate
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Security Actions */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🛡️ Additional Security</h2>
        
        <div style={styles.actionGrid}>
          <Link href="/reset-password" style={styles.actionButton}>
            <span style={styles.actionIcon}>🔄</span>
            <div>
              <h3 style={styles.actionTitle}>Reset Password</h3>
              <p style={styles.actionDesc}>Reset via email verification</p>
            </div>
          </Link>
          
          <button style={styles.actionButton} onClick={() => router.push('/profile')}>
            <span style={styles.actionIcon}>👤</span>
            <div>
              <h3 style={styles.actionTitle}>Account Recovery</h3>
              <p style={styles.actionDesc}>Update recovery options</p>
            </div>
          </button>
          
          <button style={styles.actionButton}>
            <span style={styles.actionIcon}>📄</span>
            <div>
              <h3 style={styles.actionTitle}>Security Report</h3>
              <p style={styles.actionDesc}>Download security activity</p>
            </div>
          </button>
          
          <button 
            style={styles.actionButton}
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/');
            }}
          >
            <span style={styles.actionIcon}>🚪</span>
            <div>
              <h3 style={styles.actionTitle}>Sign Out All</h3>
              <p style={styles.actionDesc}>Sign out from all devices</p>
            </div>
          </button>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Change Password</h2>
              <button 
                style={styles.closeButton}
                onClick={() => setShowPasswordModal(false)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handlePasswordChange}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Current Password</label>
                <input
                  type="password"
                  required
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  style={styles.input}
                  placeholder="Enter your current password"
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  style={styles.input}
                  placeholder="Enter new password (minimum 8 characters)"
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  style={styles.input}
                  placeholder="Confirm your new password"
                />
              </div>
              
              <div style={styles.modalActions}>
                <button 
                  type="button"
                  style={styles.cancelButton}
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={styles.saveButton}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.4s;
          border-radius: 50%;
        }
        
        input:checked + .slider:before {
          transform: translateX(26px);
        }
        
        .slider.round {
          border-radius: 24px;
        }
        
        .slider.round:before {
          border-radius: 50%;
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
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 15px 0'
  },
  cardDescription: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '20px'
  },
  securityItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 0',
    borderBottom: '1px solid #f1f5f9'
  },
  securityInfo: {
    flex: 1
  },
  securityLabel: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 5px 0'
  },
  securityDescription: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0
  },
  primaryButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  enabledButton: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  disabledButton: {
    padding: '8px 16px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  switch: {
    position: 'relative',
    display: 'inline-block',
    width: '50px',
    height: '24px'
  },
  slider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#cbd5e0',
    transition: '0.4s',
    borderRadius: '24px'
  },
  sessionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '10px'
  },
  sessionInfo: {
    flex: 1
  },
  sessionDevice: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 5px 0'
  },
  currentSession: {
    color: '#10b981',
    fontSize: '14px',
    fontWeight: 'normal'
  },
  sessionDetails: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0
  },
  terminateButton: {
    padding: '6px 12px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px'
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '15px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    textDecoration: 'none',
    color: '#1e293b',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  actionIcon: {
    fontSize: '24px'
  },
  actionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 3px 0'
  },
  actionDesc: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    width: '100%',
    maxWidth: '400px',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#64748b'
  },
  formGroup: {
    marginBottom: '15px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '5px'
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    boxSizing: 'border-box'
  },
  modalActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px'
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  saveButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  }
};

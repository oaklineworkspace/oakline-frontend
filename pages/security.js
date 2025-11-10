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
    fraudAlerts: true
  });

  // Password Change Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      await loadSecuritySettings(user.id);
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

  const handlePasswordChange = async () => {
    setPasswordLoading(true);
    setError('');
    setMessage('');

    try {
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        throw new Error('⚠️ All fields are required');
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('⚠️ New passwords do not match');
      }

      if (passwordData.currentPassword === passwordData.newPassword) {
        throw new Error('⚠️ New password must be different from current password');
      }

      if (passwordData.newPassword.length < 8) {
        throw new Error('⚠️ Password must be at least 8 characters long');
      }

      // Verify current password
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword
      });

      if (verifyError) {
        throw new Error('❌ Current password is incorrect');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) {
        throw new Error(`❌ Failed to update password: ${updateError.message}`);
      }

      setMessage('✅ Password updated successfully!');
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error('Password change error:', error);
      setError(error.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setPasswordLoading(false);
    }
  };

  const updateSecuritySetting = async (setting, value) => {
    try {
      const updatedSettings = { ...securitySettings, [setting]: value };
      setSecuritySettings(updatedSettings);

      const { error } = await supabase
        .from('user_security_settings')
        .upsert({
          user_id: user.id,
          ...updatedSettings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setMessage('✅ Security setting updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update security setting:', error);
      setError(`Failed to update security setting: ${error.message}`);
      setSecuritySettings(securitySettings);
      setTimeout(() => setError(''), 5000);
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
        <button 
          style={styles.backButton}
          onClick={() => router.push('/profile')}
        >
          ← Back to Profile
        </button>
      </div>

      {message && (
        <div style={styles.successMessage}>{message}</div>
      )}

      {error && (
        <div style={styles.errorMessage}>{error}</div>
      )}

      {/* Password & Authentication */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🔐 Password & Authentication</h2>

        <div style={styles.settingRow}>
          <div style={styles.settingInfo}>
            <h3 style={styles.settingLabel}>Change Password</h3>
            <p style={styles.settingDescription}>
              Update your account password regularly for better security
            </p>
          </div>
          <button 
            style={styles.actionButton}
            onClick={() => setShowPasswordModal(true)}
          >
            Change Password
          </button>
        </div>

        <div style={styles.settingRow}>
          <div style={styles.settingInfo}>
            <h3 style={styles.settingLabel}>Two-Factor Authentication</h3>
            <p style={styles.settingDescription}>
              Add an extra layer of security to your account
            </p>
          </div>
          <button 
            style={styles.actionButton}
            onClick={() => router.push('/mfa-setup')}
          >
            {securitySettings.twoFactorEnabled ? 'Manage 2FA' : 'Setup 2FA'}
          </button>
        </div>
      </div>

      {/* Security Alerts */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🔔 Security Alerts</h2>

        <div style={styles.settingRow}>
          <div style={styles.settingInfo}>
            <h3 style={styles.settingLabel}>Email Alerts</h3>
            <p style={styles.settingDescription}>
              Receive security alerts via email
            </p>
          </div>
          <label style={styles.toggleContainer}>
            <input
              type="checkbox"
              checked={securitySettings.emailAlerts}
              onChange={(e) => updateSecuritySetting('emailAlerts', e.target.checked)}
              style={styles.toggleInput}
            />
            <span style={securitySettings.emailAlerts ? styles.toggleOn : styles.toggleOff}></span>
          </label>
        </div>

        <div style={styles.settingRow}>
          <div style={styles.settingInfo}>
            <h3 style={styles.settingLabel}>Login Notifications</h3>
            <p style={styles.settingDescription}>
              Get notified when someone signs into your account
            </p>
          </div>
          <label style={styles.toggleContainer}>
            <input
              type="checkbox"
              checked={securitySettings.loginAlerts}
              onChange={(e) => updateSecuritySetting('loginAlerts', e.target.checked)}
              style={styles.toggleInput}
            />
            <span style={securitySettings.loginAlerts ? styles.toggleOn : styles.toggleOff}></span>
          </label>
        </div>

        <div style={styles.settingRow}>
          <div style={styles.settingInfo}>
            <h3 style={styles.settingLabel}>Transaction Alerts</h3>
            <p style={styles.settingDescription}>
              Receive notifications for all transactions
            </p>
          </div>
          <label style={styles.toggleContainer}>
            <input
              type="checkbox"
              checked={securitySettings.transactionAlerts}
              onChange={(e) => updateSecuritySetting('transactionAlerts', e.target.checked)}
              style={styles.toggleInput}
            />
            <span style={securitySettings.transactionAlerts ? styles.toggleOn : styles.toggleOff}></span>
          </label>
        </div>

        <div style={styles.settingRow}>
          <div style={styles.settingInfo}>
            <h3 style={styles.settingLabel}>Fraud Detection Alerts</h3>
            <p style={styles.settingDescription}>
              Get notified of suspicious or fraudulent activity
            </p>
          </div>
          <label style={styles.toggleContainer}>
            <input
              type="checkbox"
              checked={securitySettings.fraudAlerts}
              onChange={(e) => updateSecuritySetting('fraudAlerts', e.target.checked)}
              style={styles.toggleInput}
            />
            <span style={securitySettings.fraudAlerts ? styles.toggleOn : styles.toggleOff}></span>
          </label>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🛡️ Quick Actions</h2>
        <div style={styles.actionsGrid}>
          <Link href="/reset-password" style={styles.quickAction}>
            <span style={styles.actionIcon}>🔄</span>
            <div>
              <h3 style={styles.actionTitle}>Reset Password</h3>
              <p style={styles.actionDesc}>Reset via email</p>
            </div>
          </Link>

          <button 
            style={styles.quickAction}
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/');
            }}
          >
            <span style={styles.actionIcon}>🚪</span>
            <div>
              <h3 style={styles.actionTitle}>Sign Out</h3>
              <p style={styles.actionDesc}>Sign out from all devices</p>
            </div>
          </button>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div style={styles.modalOverlay} onClick={() => setShowPasswordModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Change Password</h2>
              <button 
                style={styles.closeButton}
                onClick={() => setShowPasswordModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handlePasswordChange(); }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Current Password</label>
                <div style={styles.passwordInputWrapper}>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    style={styles.input}
                    placeholder="Enter your current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={styles.togglePassword}
                  >
                    {showCurrentPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>New Password</label>
                <div style={styles.passwordInputWrapper}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    style={styles.input}
                    placeholder="Enter new password (minimum 8 characters)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={styles.togglePassword}
                  >
                    {showNewPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Confirm New Password</label>
                <div style={styles.passwordInputWrapper}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    style={styles.input}
                    placeholder="Confirm your new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.togglePassword}
                  >
                    {showConfirmPassword ? '🙈' : '👁️'}
                  </button>
                </div>
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
                  style={styles.submitButton}
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
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
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
  successMessage: {
    backgroundColor: '#dcfce7',
    border: '2px solid #16a34a',
    color: '#166534',
    padding: '15px 20px',
    borderRadius: '12px',
    margin: '20px',
    fontSize: '15px',
    fontWeight: '500'
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    border: '2px solid #dc2626',
    color: '#dc2626',
    padding: '15px 20px',
    borderRadius: '12px',
    margin: '20px',
    fontSize: '15px',
    fontWeight: '500'
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
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #e2e8f0'
  },
  settingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 0',
    borderBottom: '1px solid #f1f5f9'
  },
  settingInfo: {
    flex: 1,
    paddingRight: '20px'
  },
  settingLabel: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '5px'
  },
  settingDescription: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0
  },
  actionButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.4)',
    minWidth: '140px'
  },
  toggleContainer: {
    position: 'relative',
    display: 'inline-block',
    width: '56px',
    height: '28px',
    cursor: 'pointer'
  },
  toggleInput: {
    opacity: 0,
    width: 0,
    height: 0
  },
  toggleOff: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#cbd5e0',
    transition: '0.4s',
    borderRadius: '28px',
    '::before': {
      position: 'absolute',
      content: '""',
      height: '20px',
      width: '20px',
      left: '4px',
      bottom: '4px',
      backgroundColor: 'white',
      transition: '0.4s',
      borderRadius: '50%'
    }
  },
  toggleOn: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#10b981',
    transition: '0.4s',
    borderRadius: '28px',
    '::before': {
      position: 'absolute',
      content: '""',
      height: '20px',
      width: '20px',
      left: '32px',
      bottom: '4px',
      backgroundColor: 'white',
      transition: '0.4s',
      borderRadius: '50%'
    }
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px'
  },
  quickAction: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '20px',
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    textDecoration: 'none',
    color: '#1e293b',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  actionIcon: {
    fontSize: '28px'
  },
  actionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 5px 0',
    color: '#1e293b'
  },
  actionDesc: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '30px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
    paddingBottom: '15px',
    borderBottom: '2px solid #e2e8f0'
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1e40af',
    margin: 0
  },
  closeButton: {
    background: '#f1f5f9',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#64748b',
    padding: '8px',
    borderRadius: '8px',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
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
  passwordInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  input: {
    width: '100%',
    padding: '12px 15px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '15px',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    outline: 'none',
    backgroundColor: '#ffffff',
    color: '#1f2937'
  },
  togglePassword: {
    position: 'absolute',
    right: '15px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '20px',
    padding: '5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
    transition: 'color 0.3s ease'
  },
  modalActions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'flex-end',
    marginTop: '25px',
    paddingTop: '20px',
    borderTop: '1px solid #e2e8f0'
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: '#f1f5f9',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '600',
    color: '#64748b',
    fontSize: '15px',
    transition: 'all 0.3s ease'
  },
  submitButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '15px',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.4)',
    minWidth: '160px'
  }
};
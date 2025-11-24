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
    loginNotifications: 'all_logins', // Changed from loginAlerts to be more descriptive
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Email Change Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailVerificationStep, setEmailVerificationStep] = useState('choose'); // 'choose', 'code', 'ssn'
  const [emailData, setEmailData] = useState({
    newEmail: '',
    confirmEmail: ''
  });
  const [verificationData, setVerificationData] = useState({
    verificationCode: '',
    ssn: ''
  });
  const [emailLoading, setEmailLoading] = useState(false);
  const [codeHash, setCodeHash] = useState(null);
  const [showEmailSuccess, setShowEmailSuccess] = useState(false);
  const [emailSuccessMessage, setEmailSuccessMessage] = useState('');
  const [showEmailError, setShowEmailError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState('');

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
        setSecuritySettings({
          twoFactorEnabled: data.twofactorenabled || false,
          emailAlerts: data.emailalerts !== undefined ? data.emailalerts : true,
          smsAlerts: data.smsalerts || false,
          loginNotifications: data.login_notifications || 'all_logins', // Default to 'all_logins' if not set
          transactionAlerts: data.transactionalerts !== undefined ? data.transactionalerts : true,
          fraudAlerts: data.fraudalerts !== undefined ? data.fraudalerts : true
        });
      } else {
        // If no settings exist, set defaults and potentially create a new row
        setSecuritySettings({
          twoFactorEnabled: false,
          emailAlerts: true,
          smsAlerts: false,
          loginNotifications: 'all_logins',
          transactionAlerts: true,
          fraudAlerts: true
        });
      }
    } catch (error) {
      console.error('Error loading security settings:', error);
      setError('Failed to load security settings.');
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

  const sendVerificationCode = async () => {
    setEmailLoading(true);
    setShowEmailError(false);
    setEmailErrorMessage('');
    
    try {
      // Get fresh session with slight delay to ensure it's available
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('❌ Auth session missing! Please try refreshing the page.');
      }
      
      if (!session || !session.access_token) {
        throw new Error('❌ Session expired. Please log in again');
      }

      console.log('Sending verification code with session token...');

      const response = await fetch('/api/send-email-verification-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send code');
      }

      setCodeHash(result.codeHash);
      setEmailVerificationStep('code');
      setShowEmailError(false);
    } catch (error) {
      console.error('Send code error:', error);
      setEmailErrorMessage(error.message);
      setShowEmailError(true);
      setTimeout(() => setShowEmailError(false), 5000);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleEmailChange = async () => {
    setEmailLoading(true);
    setShowEmailError(false);
    setEmailErrorMessage('');

    try {
      if (!emailData.newEmail || !emailData.confirmEmail) {
        throw new Error('⚠️ All email fields are required');
      }

      if (emailData.newEmail !== emailData.confirmEmail) {
        throw new Error('⚠️ Email addresses do not match');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailData.newEmail)) {
        throw new Error('⚠️ Please enter a valid email address');
      }

      if (emailData.newEmail === user.email) {
        throw new Error('⚠️ New email must be different from current email');
      }

      // Validate verification method
      if (emailVerificationStep === 'code') {
        if (!verificationData.verificationCode || verificationData.verificationCode.length !== 6) {
          throw new Error('⚠️ Please enter a valid 6-digit verification code');
        }
      } else if (emailVerificationStep === 'ssn') {
        if (!verificationData.ssn || verificationData.ssn.length !== 4) {
          throw new Error('⚠️ Please enter the last 4 digits of your SSN');
        }
      }

      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('❌ Session expired. Please log in again');
      }

      // Build request body based on verification method
      const requestBody = {
        newEmail: emailData.newEmail
      };

      if (emailVerificationStep === 'code') {
        requestBody.verificationCode = verificationData.verificationCode;
      } else if (emailVerificationStep === 'ssn') {
        requestBody.ssn = verificationData.ssn;
      }

      // Call email change API
      const response = await fetch('/api/change-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to change email');
      }

      // Show success modal
      setEmailSuccessMessage('✅ Email changed successfully! Confirmation sent to your old email.');
      setShowEmailSuccess(true);
      setShowEmailModal(false);
      
      // Close success modal and refresh user data after 3 seconds
      setTimeout(() => {
        setShowEmailSuccess(false);
        setEmailVerificationStep('choose');
        setEmailData({
          newEmail: '',
          confirmEmail: ''
        });
        setVerificationData({
          verificationCode: '',
          ssn: ''
        });
        checkUser();
      }, 3000);
    } catch (error) {
      console.error('Email change error:', error);
      const errorMsg = error.message || 'Failed to change email. Please try again.';
      setEmailErrorMessage(errorMsg);
      setShowEmailError(true);
    } finally {
      setEmailLoading(false);
    }
  };

  const updateSecuritySetting = async (setting, value) => {
    try {
      const updatedSettings = { ...securitySettings, [setting]: value };
      setSecuritySettings(updatedSettings);

      const dbSettings = {
        user_id: user.id,
        twofactorenabled: updatedSettings.twoFactorEnabled,
        emailalerts: updatedSettings.emailAlerts,
        smsalerts: updatedSettings.smsAlerts,
        login_notifications: updatedSettings.loginNotifications, // Use the new key
        transactionalerts: updatedSettings.transactionAlerts,
        fraudalerts: updatedSettings.fraudAlerts,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_security_settings')
        .upsert(dbSettings, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setSuccessMessage('✅ Security setting updated successfully');
      setShowSuccessModal(true);
      
      // Auto-close modal after 3 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Failed to update security setting:', error);
      setError(`Failed to update security setting: ${error.message}`);
      // Revert local state if DB update fails
      await loadSecuritySettings(user.id); 
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
            <h3 style={styles.settingLabel}>Change Email</h3>
            <p style={styles.settingDescription}>
              Update your email if it has been stolen or compromised
            </p>
          </div>
          <button 
            style={styles.actionButton}
            onClick={() => setShowEmailModal(true)}
          >
            Change Email
          </button>
        </div>

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

        <div style={styles.settingRow}>
          <div style={styles.settingInfo}>
            <h3 style={styles.settingLabel}>Transaction PIN</h3>
            <p style={styles.settingDescription}>
              Set up a PIN to authorize wire transfers and sensitive transactions
            </p>
          </div>
          <button 
            style={styles.actionButton}
            onClick={() => router.push('/setup-transaction-pin')}
          >
            Setup PIN
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
            <span style={securitySettings.emailAlerts ? styles.toggleOn : styles.toggleOff}>
              {securitySettings.emailAlerts ? 'ON' : 'OFF'}
            </span>
          </label>
        </div>

        <div style={styles.settingRow}>
          <div style={styles.settingInfo}>
            <h3 style={styles.settingLabel}>Notify on All Logins</h3>
            <p style={styles.settingDescription}>
              Receive notifications for every login to your account
            </p>
          </div>
          <label style={styles.toggleContainer}>
            <input
              type="checkbox"
              checked={securitySettings.loginNotifications === 'all_logins'}
              onChange={(e) => updateSecuritySetting('loginNotifications', e.target.checked ? 'all_logins' : 'off')}
              style={styles.toggleInput}
            />
            <span style={securitySettings.loginNotifications === 'all_logins' ? styles.toggleOn : styles.toggleOff}>
              {securitySettings.loginNotifications === 'all_logins' ? 'ON' : 'OFF'}
            </span>
          </label>
        </div>

        <div style={styles.settingRow}>
          <div style={styles.settingInfo}>
            <h3 style={styles.settingLabel}>Notify on New Device Only</h3>
            <p style={styles.settingDescription}>
              Receive notifications only when logging in from a new device
            </p>
          </div>
          <label style={styles.toggleContainer}>
            <input
              type="checkbox"
              checked={securitySettings.loginNotifications === 'new_device'}
              onChange={(e) => updateSecuritySetting('loginNotifications', e.target.checked ? 'new_device' : 'off')}
              disabled={securitySettings.loginNotifications === 'all_logins'}
              style={styles.toggleInput}
            />
            <span style={securitySettings.loginNotifications === 'new_device' ? styles.toggleOn : (securitySettings.loginNotifications === 'all_logins' ? styles.toggleDisabled : styles.toggleOff)}>
              {securitySettings.loginNotifications === 'new_device' ? 'ON' : 'OFF'}
            </span>
          </label>
        </div>

        <div style={styles.settingRow}>
          <div style={styles.settingInfo}>
            <h3 style={styles.settingLabel}>Notify on New Location Only</h3>
            <p style={styles.settingDescription}>
              Receive notifications only when logging in from a new location
            </p>
          </div>
          <label style={styles.toggleContainer}>
            <input
              type="checkbox"
              checked={securitySettings.loginNotifications === 'new_login'}
              onChange={(e) => updateSecuritySetting('loginNotifications', e.target.checked ? 'new_login' : 'off')}
              disabled={securitySettings.loginNotifications === 'all_logins'}
              style={styles.toggleInput}
            />
            <span style={securitySettings.loginNotifications === 'new_login' ? styles.toggleOn : (securitySettings.loginNotifications === 'all_logins' ? styles.toggleDisabled : styles.toggleOff)}>
              {securitySettings.loginNotifications === 'new_login' ? 'ON' : 'OFF'}
            </span>
          </label>
        </div>

        <div style={styles.settingRow}>
          <div style={styles.settingInfo}>
            <h3 style={styles.settingLabel}>Notify on New Device & Location</h3>
            <p style={styles.settingDescription}>
              Receive notifications for both new devices and new locations
            </p>
          </div>
          <label style={styles.toggleContainer}>
            <input
              type="checkbox"
              checked={securitySettings.loginNotifications === 'both'}
              onChange={(e) => updateSecuritySetting('loginNotifications', e.target.checked ? 'both' : 'off')}
              disabled={securitySettings.loginNotifications === 'all_logins'}
              style={styles.toggleInput}
            />
            <span style={securitySettings.loginNotifications === 'both' ? styles.toggleOn : (securitySettings.loginNotifications === 'all_logins' ? styles.toggleDisabled : styles.toggleOff)}>
              {securitySettings.loginNotifications === 'both' ? 'ON' : 'OFF'}
            </span>
          </label>
        </div>

        <div style={styles.settingRow}>
          <div style={styles.settingInfo}>
            <h3 style={styles.settingLabel}>Transaction Alerts</h3>
            <p style={styles.settingDescription}>
              Receive notifications for all account transactions
            </p>
          </div>
          <label style={styles.toggleContainer}>
            <input
              type="checkbox"
              checked={securitySettings.transactionAlerts}
              onChange={(e) => updateSecuritySetting('transactionAlerts', e.target.checked)}
              style={styles.toggleInput}
            />
            <span style={securitySettings.transactionAlerts ? styles.toggleOn : styles.toggleOff}>
              {securitySettings.transactionAlerts ? 'ON' : 'OFF'}
            </span>
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
            <span style={securitySettings.fraudAlerts ? styles.toggleOn : styles.toggleOff}>
              {securitySettings.fraudAlerts ? 'ON' : 'OFF'}
            </span>
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

      {/* Success Modal Overlay */}
      {showSuccessModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.successModal}>
            <div style={styles.checkmarkCircle}>
              <div style={styles.checkmark}>✓</div>
            </div>
            <h2 style={styles.modalTitle}>Success!</h2>
            <p style={styles.modalMessage}>{successMessage}</p>
          </div>
        </div>
      )}

      {/* Email Change Success Modal */}
      {showEmailSuccess && (
        <div style={styles.modalOverlay}>
          <div style={styles.emailSuccessModal}>
            <div style={styles.emailCheckmarkCircle}>
              <div style={styles.emailCheckmark}>✓</div>
            </div>
            <h2 style={styles.emailModalTitle}>Success!</h2>
            <p style={styles.emailModalMessage}>{emailSuccessMessage}</p>
            <p style={styles.emailModalSubtext}>
              A confirmation email has been sent to your registered email address.
            </p>
            <p style={styles.emailAutoRedirectText}>Returning to security settings...</p>
          </div>
        </div>
      )}

      {/* Email Change Error Modal */}
      {showEmailError && (
        <div style={styles.emailErrorOverlay}>
          <div style={styles.emailErrorModal}>
            <div style={styles.emailErrorCircle}>
              <div style={styles.emailErrorIcon}>✕</div>
            </div>
            <h2 style={styles.emailErrorModalTitle}>Error!</h2>
            <p style={styles.emailErrorModalMessage}>{emailErrorMessage}</p>
            <button 
              onClick={() => setShowEmailError(false)}
              style={styles.emailErrorModalButton}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Email Change Modal */}
      {showEmailModal && (
        <div style={styles.modalOverlay} onClick={() => setShowEmailModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Change Email Address</h2>
              <button 
                style={styles.closeButton}
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailVerificationStep('choose');
                  setVerificationData({ verificationCode: '', ssn: '' });
                }}
              >
                ✕
              </button>
            </div>


            {emailVerificationStep === 'choose' && (
              <div style={styles.formGroup}>
                <div style={styles.infoBox}>
                  <span style={styles.infoIcon}>🔒</span>
                  <div>
                    <div style={styles.infoTitle}>Verify Your Identity</div>
                    <div style={styles.infoText}>
                      For your security, please verify your identity before changing your email.
                    </div>
                  </div>
                </div>

                <div style={{marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  <button
                    type="button"
                    onClick={() => sendVerificationCode()}
                    style={{...styles.submitButton, marginBottom: 0}}
                    disabled={emailLoading}
                  >
                    📧 Send Code to {user?.email?.split('@')[1] ? user.email.substring(0, 3) + '***@' + user.email.split('@')[1] : '***'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailVerificationStep('ssn')}
                    style={{...styles.cancelButton, marginBottom: 0, background: '#eff6ff', color: '#1e40af'}}
                  >
                    🆔 Verify with SSN
                  </button>
                </div>
              </div>
            )}

            {emailVerificationStep === 'code' && (
              <form onSubmit={(e) => { e.preventDefault(); }}>
                <div style={styles.formGroup}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                    <label style={styles.label}>Verification Code</label>
                    <button
                      type="button"
                      onClick={sendVerificationCode}
                      disabled={emailLoading}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#3b82f6',
                        cursor: emailLoading ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        textDecoration: 'underline',
                        opacity: emailLoading ? 0.6 : 1,
                        padding: 0
                      }}
                    >
                      {emailLoading ? '⏳ Sending...' : '🔄 Resend Code'}
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength="6"
                    value={verificationData.verificationCode}
                    onChange={(e) => setVerificationData({...verificationData, verificationCode: e.target.value.replace(/\D/g, '')})}
                    style={styles.input}
                    placeholder="Enter 6-digit code"
                  />
                  <p style={{fontSize: '12px', color: '#666', marginTop: '8px'}}>Code sent to {user?.email}</p>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>New Email Address</label>
                  <input
                    type="email"
                    required
                    value={emailData.newEmail}
                    onChange={(e) => setEmailData({...emailData, newEmail: e.target.value})}
                    style={styles.input}
                    placeholder="Enter new email address"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Confirm New Email</label>
                  <input
                    type="email"
                    required
                    value={emailData.confirmEmail}
                    onChange={(e) => setEmailData({...emailData, confirmEmail: e.target.value})}
                    style={styles.input}
                    placeholder="Confirm your new email address"
                  />
                </div>

                <div style={styles.modalActions}>
                  <button 
                    type="button"
                    style={styles.cancelButton}
                    onClick={() => {
                      setEmailVerificationStep('choose');
                      setVerificationData({ verificationCode: '', ssn: '' });
                    }}
                  >
                    Back
                  </button>
                  <button 
                    type="button"
                    onClick={handleEmailChange}
                    style={styles.submitButton}
                    disabled={emailLoading || !verificationData.verificationCode}
                  >
                    {emailLoading ? 'Updating...' : 'Change Email'}
                  </button>
                </div>
              </form>
            )}

            {emailVerificationStep === 'ssn' && (
              <form onSubmit={(e) => { e.preventDefault(); }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Last 4 Digits of SSN</label>
                  <input
                    type="text"
                    maxLength="4"
                    value={verificationData.ssn}
                    onChange={(e) => setVerificationData({...verificationData, ssn: e.target.value.replace(/\D/g, '')})}
                    style={styles.input}
                    placeholder="••••"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>New Email Address</label>
                  <input
                    type="email"
                    required
                    value={emailData.newEmail}
                    onChange={(e) => setEmailData({...emailData, newEmail: e.target.value})}
                    style={styles.input}
                    placeholder="Enter new email address"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Confirm New Email</label>
                  <input
                    type="email"
                    required
                    value={emailData.confirmEmail}
                    onChange={(e) => setEmailData({...emailData, confirmEmail: e.target.value})}
                    style={styles.input}
                    placeholder="Confirm your new email address"
                  />
                </div>

                <div style={styles.modalActions}>
                  <button 
                    type="button"
                    style={styles.cancelButton}
                    onClick={() => {
                      setEmailVerificationStep('choose');
                      setVerificationData({ verificationCode: '', ssn: '' });
                    }}
                  >
                    Back
                  </button>
                  <button 
                    type="button"
                    onClick={handleEmailChange}
                    style={styles.submitButton}
                    disabled={emailLoading || !verificationData.ssn}
                  >
                    {emailLoading ? 'Updating...' : 'Change Email'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

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
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .toggleOn::before {
          background-color: white;
        }
        .toggleOff::before {
          background-color: white;
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
    backgroundColor: '#e5e7eb',
    transition: '0.3s',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '0 8px',
    fontSize: '10px',
    fontWeight: '700',
    color: '#6b7280',
    '::before': {
      position: 'absolute',
      content: '""',
      height: '20px',
      width: '20px',
      left: '4px',
      bottom: '4px',
      backgroundColor: 'white',
      transition: '0.3s',
      borderRadius: '10px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
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
    transition: '0.3s',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '0 8px',
    fontSize: '10px',
    fontWeight: '700',
    color: 'white',
    '::before': {
      position: 'absolute',
      content: '""',
      height: '20px',
      width: '20px',
      left: '32px',
      bottom: '4px',
      backgroundColor: 'white',
      transition: '0.3s',
      borderRadius: '10px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    }
  },
  toggleDisabled: {
    position: 'absolute',
    cursor: 'not-allowed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#d1d5db',
    transition: '0.3s',
    borderRadius: '14px',
    opacity: 0.5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '0 8px',
    fontSize: '10px',
    fontWeight: '700',
    color: '#9ca3af',
    '::before': {
      position: 'absolute',
      content: '""',
      height: '20px',
      width: '20px',
      left: '4px',
      bottom: '4px',
      backgroundColor: 'white',
      transition: '0.3s',
      borderRadius: '10px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }
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
  successModal: {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: '40px 30px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    animation: 'slideIn 0.3s ease-out'
  },
  checkmarkCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#d1fae5',
    margin: '0 auto 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkmark: {
    fontSize: '48px',
    color: '#059669',
    fontWeight: 'bold'
  },
  modalTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#059669',
    margin: '0 0 15px 0'
  },
  modalMessage: {
    fontSize: '16px',
    color: '#374151',
    margin: '0',
    lineHeight: '1.5'
  },
  select: {
    minWidth: '200px',
    maxWidth: '300px',
    padding: '10px 15px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1e293b',
    backgroundColor: 'white',
    cursor: 'pointer',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  infoBox: {
    display: 'flex',
    gap: '15px',
    padding: '20px',
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    border: '1px solid #bfdbfe',
    marginTop: '20px',
    margin: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  infoIcon: {
    fontSize: '24px',
    flexShrink: 0,
    color: '#3b82f6'
  },
  infoTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: '8px'
  },
  infoText: {
    fontSize: '14px',
    color: '#1e40af',
    lineHeight: '1.6'
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
  },
  emailSuccessModal: {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: '40px 30px',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
    textAlign: 'center',
    animation: 'slideIn 0.4s ease-out'
  },
  emailCheckmarkCircle: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: '#dcfce7',
    border: '5px solid #16a34a',
    margin: '0 auto 25px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'scaleIn 0.5s ease-out'
  },
  emailCheckmark: {
    fontSize: '60px',
    color: '#16a34a',
    fontWeight: 'bold',
    animation: 'scaleIn 0.6s ease-out 0.2s both'
  },
  emailModalTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#16a34a',
    margin: '0 0 20px 0',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  emailModalMessage: {
    fontSize: '18px',
    color: '#1e293b',
    margin: '0 0 15px 0',
    fontWeight: '500',
    lineHeight: '1.5'
  },
  emailModalSubtext: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 20px 0',
    lineHeight: '1.5'
  },
  emailAutoRedirectText: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: 0,
    fontStyle: 'italic'
  },
  emailErrorModal: {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: '40px 30px',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
    textAlign: 'center',
    animation: 'slideIn 0.4s ease-out',
    border: '3px solid #dc2626',
    position: 'relative',
    zIndex: 10000
  },
  emailErrorCircle: {
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
  emailErrorIcon: {
    fontSize: '60px',
    color: '#dc2626',
    fontWeight: 'bold',
    animation: 'scaleIn 0.6s ease-out 0.2s both'
  },
  emailErrorModalTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#dc2626',
    margin: '0 0 20px 0',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  emailErrorModalMessage: {
    fontSize: '18px',
    color: '#1e293b',
    margin: '0 0 30px 0',
    fontWeight: '500',
    lineHeight: '1.5'
  },
  emailErrorModalButton: {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '12px 32px',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
    transition: 'all 0.3s ease',
    marginTop: '10px'
  },
  errorModalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px'
  },
  emailErrorOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10001,
    padding: '20px'
  }
};
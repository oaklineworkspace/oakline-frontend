import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('account');
  const router = useRouter();

  // Settings form data
  const [accountSettings, setAccountSettings] = useState({
    email_notifications: true,
    sms_notifications: true,
    push_notifications: true,
    marketing_emails: false,
    transaction_alerts: true,
    low_balance_alerts: true,
    security_alerts: true
  });

  const [securitySettings, setSecuritySettings] = useState({
    two_factor_enabled: false,
    biometric_login: false,
    session_timeout: '30',
    login_notifications: true
  });

  const [privacySettings, setPrivacySettings] = useState({
    data_sharing: false,
    analytics_tracking: true,
    third_party_sharing: false
  });

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push('/login');
        return;
      }

      setUser(session.user);

      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setUserProfile(profile);

      // Load existing settings if they exist
      if (profile) {
        setAccountSettings(prev => ({
          ...prev,
          ...profile.notification_settings
        }));
        setSecuritySettings(prev => ({
          ...prev,
          ...profile.security_settings
        }));
        setPrivacySettings(prev => ({
          ...prev,
          ...profile.privacy_settings
        }));
      }

    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (settingsType) => {
    setLoading(true);
    setMessage('');

    try {
      let updateData = {};

      switch (settingsType) {
        case 'account':
          updateData = { notification_settings: accountSettings };
          break;
        case 'security':
          updateData = { security_settings: securitySettings };
          break;
        case 'privacy':
          updateData = { privacy_settings: privacySettings };
          break;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      setMessage('✅ Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);

    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('❌ Error saving settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !user) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading Settings...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/" style={styles.logoContainer}>
            <div style={styles.logoPlaceholder}>🏦</div>
            <span style={styles.logoText}>Oakline Bank</span>
          </Link>
        </div>
        <div style={styles.loginPrompt}>
          <h1 style={styles.loginTitle}>Please Log In</h1>
          <p style={styles.loginMessage}>You need to be logged in to access settings</p>
          <Link href="/login" style={styles.loginButton}>Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Account Settings - Oakline Bank</title>
        <meta name="description" content="Manage your banking account settings and preferences" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>

      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/" style={styles.logoContainer}>
            <div style={styles.logoPlaceholder}>🏦</div>
            <span style={styles.logoText}>Oakline Bank</span>
          </Link>
          <div style={styles.headerInfo}>
            <Link href="/dashboard" style={styles.backButton}>← Dashboard</Link>
          </div>
        </div>

        <div style={styles.content}>
          <div style={styles.titleSection}>
            <div style={styles.settingsHeader}>
              <div style={styles.settingsIcon}>⚙️</div>
              <div>
                <h1 style={styles.title}>Account Settings</h1>
                <p style={styles.subtitle}>Manage your banking preferences and security</p>
              </div>
            </div>
          </div>

          {message && (
            <div style={{
              ...styles.message,
              backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
              color: message.includes('✅') ? '#155724' : '#721c24',
              borderColor: message.includes('✅') ? '#c3e6cb' : '#f5c6cb'
            }}>
              {message}
            </div>
          )}

          <div style={styles.tabContainer}>
            <div style={styles.tabs}>
              <button
                style={{
                  ...styles.tab,
                  ...(activeTab === 'account' ? styles.activeTab : {})
                }}
                onClick={() => setActiveTab('account')}
              >
                🔔 Notifications
              </button>
              <button
                style={{
                  ...styles.tab,
                  ...(activeTab === 'security' ? styles.activeTab : {})
                }}
                onClick={() => setActiveTab('security')}
              >
                🔒 Security
              </button>
              <button
                style={{
                  ...styles.tab,
                  ...(activeTab === 'privacy' ? styles.activeTab : {})
                }}
                onClick={() => setActiveTab('privacy')}
              >
                🛡️ Privacy
              </button>
              <button
                style={{
                  ...styles.tab,
                  ...(activeTab === 'linking' ? styles.activeTab : {})
                }}
                onClick={() => setActiveTab('linking')}
              >
                🔗 Link Accounts
              </button>
              <button
                style={{
                  ...styles.tab,
                  ...(activeTab === 'services' ? styles.activeTab : {})
                }}
                onClick={() => setActiveTab('services')}
              >
                🏦 Services
              </button>
            </div>
          </div>

          {/* Notifications Tab */}
          {activeTab === 'account' && (
            <div style={styles.tabContent}>
              <div style={styles.sectionTitle}>Notification Preferences</div>

              <div style={styles.settingGroup}>
                <h3 style={styles.groupTitle}>General Notifications</h3>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>Email Notifications</div>
                    <div style={styles.settingDesc}>Receive important updates via email</div>
                  </div>
                  <label style={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={accountSettings.email_notifications}
                      onChange={(e) => setAccountSettings(prev => ({
                        ...prev,
                        email_notifications: e.target.checked
                      }))}
                      style={styles.toggleInput}
                    />
                    <span style={styles.toggleSlider}></span>
                  </label>
                </div>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>SMS Notifications</div>
                    <div style={styles.settingDesc}>Receive text messages for critical alerts</div>
                  </div>
                  <label style={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={accountSettings.sms_notifications}
                      onChange={(e) => setAccountSettings(prev => ({
                        ...prev,
                        sms_notifications: e.target.checked
                      }))}
                      style={styles.toggleInput}
                    />
                    <span style={styles.toggleSlider}></span>
                  </label>
                </div>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>Transaction Alerts</div>
                    <div style={styles.settingDesc}>Get notified of all account transactions</div>
                  </div>
                  <label style={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={accountSettings.transaction_alerts}
                      onChange={(e) => setAccountSettings(prev => ({
                        ...prev,
                        transaction_alerts: e.target.checked
                      }))}
                      style={styles.toggleInput}
                    />
                    <span style={styles.toggleSlider}></span>
                  </label>
                </div>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>Low Balance Alerts</div>
                    <div style={styles.settingDesc}>Alert when account balance is low</div>
                  </div>
                  <label style={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={accountSettings.low_balance_alerts}
                      onChange={(e) => setAccountSettings(prev => ({
                        ...prev,
                        low_balance_alerts: e.target.checked
                      }))}
                      style={styles.toggleInput}
                    />
                    <span style={styles.toggleSlider}></span>
                  </label>
                </div>
              </div>

              <button
                style={styles.saveButton}
                onClick={() => handleSaveSettings('account')}
                disabled={loading}
              >
                {loading ? '🔄 Saving...' : '💾 Save Notification Settings'}
              </button>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div style={styles.tabContent}>
              <div style={styles.sectionTitle}>Security Settings</div>

              <div style={styles.settingGroup}>
                <h3 style={styles.groupTitle}>Account Security</h3>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>Two-Factor Authentication</div>
                    <div style={styles.settingDesc}>Add an extra layer of security to your account</div>
                  </div>
                  <label style={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={securitySettings.two_factor_enabled}
                      onChange={(e) => setSecuritySettings(prev => ({
                        ...prev,
                        two_factor_enabled: e.target.checked
                      }))}
                      style={styles.toggleInput}
                    />
                    <span style={styles.toggleSlider}></span>
                  </label>
                </div>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>Biometric Login</div>
                    <div style={styles.settingDesc}>Use fingerprint or face recognition</div>
                  </div>
                  <label style={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={securitySettings.biometric_login}
                      onChange={(e) => setSecuritySettings(prev => ({
                        ...prev,
                        biometric_login: e.target.checked
                      }))}
                      style={styles.toggleInput}
                    />
                    <span style={styles.toggleSlider}></span>
                  </label>
                </div>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>Session Timeout</div>
                    <div style={styles.settingDesc}>Automatically log out after inactivity</div>
                  </div>
                  <select
                    style={styles.select}
                    value={securitySettings.session_timeout}
                    onChange={(e) => setSecuritySettings(prev => ({
                      ...prev,
                      session_timeout: e.target.value
                    }))}
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>
              </div>

              <button
                style={styles.saveButton}
                onClick={() => handleSaveSettings('security')}
                disabled={loading}
              >
                {loading ? '🔄 Saving...' : '🔒 Save Security Settings'}
              </button>

              <div style={styles.settingGroup}>
                <h3 style={styles.groupTitle}>Account Access</h3>
                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>Change Password</div>
                    <div style={styles.settingDesc}>Update your account password</div>
                  </div>
                  <button style={styles.securityButton}>Change Password</button>
                </div>
                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>Multi-Factor Authentication (MFA)</div>
                    <div style={styles.settingDesc}>Manage your MFA devices and settings</div>
                  </div>
                  <button style={styles.securityButton}>Manage MFA</button>
                </div>
              </div>

              <button
                style={styles.logoutButton}
                onClick={() => { /* Handle logout */ }}
              >
                🚪 Log Out
              </button>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div style={styles.tabContent}>
              <div style={styles.sectionTitle}>Privacy Settings</div>

              <div style={styles.settingGroup}>
                <h3 style={styles.groupTitle}>Data & Privacy</h3>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>Data Sharing</div>
                    <div style={styles.settingDesc}>Allow sharing anonymized data for service improvements</div>
                  </div>
                  <label style={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={privacySettings.data_sharing}
                      onChange={(e) => setPrivacySettings(prev => ({
                        ...prev,
                        data_sharing: e.target.checked
                      }))}
                      style={styles.toggleInput}
                    />
                    <span style={styles.toggleSlider}></span>
                  </label>
                </div>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>Analytics Tracking</div>
                    <div style={styles.settingDesc}>Help us improve our services with usage analytics</div>
                  </div>
                  <label style={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={privacySettings.analytics_tracking}
                      onChange={(e) => setPrivacySettings(prev => ({
                        ...prev,
                        analytics_tracking: e.target.checked
                      }))}
                      style={styles.toggleInput}
                    />
                    <span style={styles.toggleSlider}></span>
                  </label>
                </div>
              </div>

              <button
                style={styles.saveButton}
                onClick={() => handleSaveSettings('privacy')}
                disabled={loading}
              >
                {loading ? '🔄 Saving...' : '🛡️ Save Privacy Settings'}
              </button>
            </div>
          )}

          {/* Account Linking Tab */}
          {activeTab === 'linking' && (
            <div style={styles.tabContent}>
              <div style={styles.sectionTitle}>Link External Accounts</div>

              <div style={styles.linkingIntro}>
                <div style={styles.introCard}>
                  <div style={styles.introIcon}>🔗</div>
                  <div>
                    <h3 style={styles.introTitle}>Connect Your Financial Accounts</h3>
                    <p style={styles.introDesc}>
                      Securely link your external bank accounts, credit cards, and investment accounts
                      to manage all your finances in one place. We use bank-level security to protect your information.
                    </p>
                  </div>
                </div>
              </div>

              <div style={styles.serviceCategory}>
                <h3 style={styles.categoryTitle}>🏦 Bank Accounts</h3>
                <div style={styles.servicesList}>
                  <div style={styles.linkingItem}>
                    <div style={styles.serviceIcon}>🏛️</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Connect Checking Account</div>
                      <div style={styles.serviceDesc}>Link external checking accounts for transfers and monitoring</div>
                    </div>
                    <button style={styles.linkButton}>+ Link Account</button>
                  </div>

                  <div style={styles.linkingItem}>
                    <div style={styles.serviceIcon}>💰</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Connect Savings Account</div>
                      <div style={styles.serviceDesc}>Add savings accounts from other banks to track your total savings</div>
                    </div>
                    <button style={styles.linkButton}>+ Link Account</button>
                  </div>

                  <div style={styles.linkingItem}>
                    <div style={styles.serviceIcon}>🌐</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>International Accounts</div>
                      <div style={styles.serviceDesc}>Connect accounts from international banks and manage currency exchange</div>
                    </div>
                    <button style={styles.linkButton}>+ Link Account</button>
                  </div>
                </div>
              </div>

              <div style={styles.serviceCategory}>
                <h3 style={styles.categoryTitle}>💳 Credit Cards & Loans</h3>
                <div style={styles.servicesList}>
                  <div style={styles.linkingItem}>
                    <div style={styles.serviceIcon}>💳</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Credit Cards</div>
                      <div style={styles.serviceDesc}>Track balances and payments across all your credit cards</div>
                    </div>
                    <button style={styles.linkButton}>+ Link Card</button>
                  </div>

                  <div style={styles.linkingItem}>
                    <div style={styles.serviceIcon}>🏠</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Mortgage & Home Loans</div>
                      <div style={styles.serviceDesc}>Monitor mortgage balances and payment schedules</div>
                    </div>
                    <button style={styles.linkButton}>+ Link Loan</button>
                  </div>

                  <div style={styles.linkingItem}>
                    <div style={styles.serviceIcon}>🚗</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Auto Loans</div>
                      <div style={styles.serviceDesc}>Track car loan payments and remaining balances</div>
                    </div>
                    <button style={styles.linkButton}>+ Link Loan</button>
                  </div>
                </div>
              </div>

              <div style={styles.serviceCategory}>
                <h3 style={styles.categoryTitle}>📈 Investment Accounts</h3>
                <div style={styles.servicesList}>
                  <div style={styles.linkingItem}>
                    <div style={styles.serviceIcon}>📊</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Brokerage Accounts</div>
                      <div style={styles.serviceDesc}>Connect investment accounts to track portfolio performance</div>
                    </div>
                    <button style={styles.linkButton}>+ Link Account</button>
                  </div>

                  <div style={styles.linkingItem}>
                    <div style={styles.serviceIcon}>🏖️</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Retirement Accounts (401k, IRA)</div>
                      <div style={styles.serviceDesc}>Monitor retirement savings and contribution limits</div>
                    </div>
                    <button style={styles.linkButton}>+ Link Account</button>
                  </div>

                  <div style={styles.linkingItem}>
                    <div style={styles.serviceIcon}>₿</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Cryptocurrency Wallets</div>
                      <div style={styles.serviceDesc}>Track crypto holdings across multiple exchanges and wallets</div>
                    </div>
                    <button style={styles.linkButton}>+ Link Wallet</button>
                  </div>
                </div>
              </div>

              <div style={styles.linkingSecurityInfo}>
                <div style={styles.securityCard}>
                  <div style={styles.securityIcon}>🔒</div>
                  <div>
                    <h4 style={styles.securityTitle}>Your Security is Our Priority</h4>
                    <ul style={styles.securityList}>
                      <li>We use 256-bit SSL encryption to protect your data</li>
                      <li>We never store your login credentials</li>
                      <li>All connections are read-only for your protection</li>
                      <li>You can disconnect accounts at any time</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div style={styles.tabContent}>
              <div style={styles.sectionTitle}>Banking Services & Account Management</div>

              <div style={styles.serviceCategory}>
                <h3 style={styles.categoryTitle}>🏦 Account Management</h3>
                <div style={styles.servicesList}>
                  <Link href="/account-details" style={styles.serviceItem}>
                    <div style={styles.serviceIcon}>📊</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Account Overview</div>
                      <div style={styles.serviceDesc}>View all account balances and details</div>
                    </div>
                    <div style={styles.serviceArrow}>→</div>
                  </Link>

                  <Link href="/account-types" style={styles.serviceItem}>
                    <div style={styles.serviceIcon}>🔗</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Link New Account</div>
                      <div style={styles.serviceDesc}>Connect external bank accounts and credit cards</div>
                    </div>
                    <div style={styles.serviceArrow}>→</div>
                  </Link>

                  <Link href="/transfer" style={styles.serviceItem}>
                    <div style={styles.serviceIcon}>💸</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Transfer Limits</div>
                      <div style={styles.serviceDesc}>Manage daily and monthly transfer limits</div>
                    </div>
                    <div style={styles.serviceArrow}>→</div>
                  </Link>

                  <div style={styles.serviceItem}>
                    <div style={styles.serviceIcon}>📋</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Account Statements</div>
                      <div style={styles.serviceDesc}>Download monthly and annual statements</div>
                    </div>
                    <div style={styles.serviceArrow}>→</div>
                  </div>
                </div>
              </div>

              <div style={styles.serviceCategory}>
                <h3 style={styles.categoryTitle}>💳 Card & Payment Services</h3>
                <div style={styles.servicesList}>
                  <Link href="/cards" style={styles.serviceItem}>
                    <div style={styles.serviceIcon}>💳</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Card Management</div>
                      <div style={styles.serviceDesc}>Manage debit and credit cards, set limits</div>
                    </div>
                    <div style={styles.serviceArrow}>→</div>
                  </Link>

                  <Link href="/zelle-settings" style={styles.serviceItem}>
                    <div style={styles.serviceIcon}>⚡</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Zelle Settings</div>
                      <div style={styles.serviceDesc}>Manage Zelle contacts and transaction limits</div>
                    </div>
                    <div style={styles.serviceArrow}>→</div>
                  </Link>

                  <Link href="/bill-pay" style={styles.serviceItem}>
                    <div style={styles.serviceIcon}>🧾</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Bill Pay Setup</div>
                      <div style={styles.serviceDesc}>Manage automatic bill payments and payees</div>
                    </div>
                    <div style={styles.serviceArrow}>→</div>
                  </Link>

                  <div style={styles.serviceItem}>
                    <div style={styles.serviceIcon}>📱</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Mobile Wallet</div>
                      <div style={styles.serviceDesc}>Apple Pay, Google Pay, Samsung Pay settings</div>
                    </div>
                    <div style={styles.serviceArrow}>→</div>
                  </div>
                </div>
              </div>

              <div style={styles.serviceCategory}>
                <h3 style={styles.categoryTitle}>🔐 Security & Identity</h3>
                <div style={styles.servicesList}>
                  <Link href="/security" style={styles.serviceItem}>
                    <div style={styles.serviceIcon}>🔐</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Advanced Security</div>
                      <div style={styles.serviceDesc}>Multi-factor authentication and device management</div>
                    </div>
                    <div style={styles.serviceArrow}>→</div>
                  </Link>

                  <Link href="/profile" style={styles.serviceItem}>
                    <div style={styles.serviceIcon}>👤</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Personal Information</div>
                      <div style={styles.serviceDesc}>Update address, phone, email, and tax information</div>
                    </div>
                    <div style={styles.serviceArrow}>→</div>
                  </Link>

                  <div style={styles.serviceItem}>
                    <div style={styles.serviceIcon}>🆔</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Identity Verification</div>
                      <div style={styles.serviceDesc}>Update ID documents and beneficiary information</div>
                    </div>
                    <div style={styles.serviceArrow}>→</div>
                  </div>

                  <div style={styles.serviceItem}>
                    <div style={styles.serviceIcon}>🔒</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Login & Password</div>
                      <div style={styles.serviceDesc}>Change password and security questions</div>
                    </div>
                    <div style={styles.serviceArrow}>→</div>
                  </div>
                </div>
              </div>

              <div style={styles.serviceCategory}>
                <h3 style={styles.categoryTitle}>📈 Investment & Loans</h3>
                <div style={styles.servicesList}>
                  <Link href="/investments" style={styles.serviceItem}>
                    <div style={styles.serviceIcon}>📈</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Investment Accounts</div>
                      <div style={styles.serviceDesc}>Manage portfolio, risk tolerance, and automatic investing</div>
                    </div>
                    <div style={styles.serviceArrow}>→</div>
                  </Link>

                  <Link href="/loans" style={styles.serviceItem}>
                    <div style={styles.serviceIcon}>🏠</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Loan Management</div>
                      <div style={styles.serviceDesc}>View loan details, make payments, and apply for new loans</div>
                    </div>
                    <div style={styles.serviceArrow}>→</div>
                  </Link>

                  <div style={styles.serviceItem}>
                    <div style={styles.serviceIcon}>💰</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Savings Goals</div>
                      <div style={styles.serviceDesc}>Set up and track savings goals and automatic transfers</div>
                    </div>
                    <div style={styles.serviceArrow}>→</div>
                  </div>

                  <Link href="/crypto" style={styles.serviceItem}>
                    <div style={styles.serviceIcon}>₿</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Cryptocurrency</div>
                      <div style={styles.serviceDesc}>Manage digital asset trading and storage preferences</div>
                    </div>
                    <div style={styles.serviceArrow}>→</div>
                  </Link>
                </div>
              </div>

              <div style={styles.serviceCategory}>
                <h3 style={styles.categoryTitle}>📞 Communication & Support</h3>
                <div style={styles.servicesList}>
                  <Link href="/notifications" style={styles.serviceItem}>
                    <div style={styles.serviceIcon}>🔔</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Notification Center</div>
                      <div style={styles.serviceDesc}>View and manage all alerts and messages</div>
                    </div>
                    <div style={styles.serviceArrow}>→</div>
                  </Link>

                  <Link href="/messages" style={styles.serviceItem}>
                    <div style={styles.serviceIcon}>💬</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Secure Messages</div>
                      <div style={styles.serviceDesc}>Communicate securely with your banking team</div>
                    </div>
                    <div style={styles.serviceArrow}>→</div>
                  </Link>

                  <div style={styles.serviceItem}>
                    <div style={styles.serviceIcon}>📧</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Email Preferences</div>
                      <div style={styles.serviceDesc}>Manage marketing emails and communication preferences</div>
                    </div>
                    <div style={styles.serviceArrow}>→</div>
                  </div>

                  <Link href="/support" style={styles.serviceItem}>
                    <div style={styles.serviceIcon}>🎧</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Customer Support</div>
                      <div style={styles.serviceDesc}>Contact support, schedule appointments, view case history</div>
                    </div>
                    <div style={styles.serviceArrow}>→</div>
                  </Link>
                </div>
              </div>

              <div style={styles.serviceCategory}>
                <h3 style={styles.categoryTitle}>📄 Documents & Legal</h3>
                <div style={styles.servicesList}>
                  <Link href="/forms-documents" style={styles.serviceItem}>
                    <div style={styles.serviceIcon}>📋</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Forms & Documents</div>
                      <div style={styles.serviceDesc}>Access tax forms, account agreements, and disclosures</div>
                    </div>
                    <div style={styles.serviceArrow}>→</div>
                  </Link>

                  <Link href="/privacy" style={styles.serviceItem}>
                    <div style={styles.serviceIcon}>🛡️</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Privacy Controls</div>
                      <div style={styles.serviceDesc}>Manage data sharing and privacy preferences</div>
                    </div>
                    <div style={styles.serviceArrow}>→</div>
                  </Link>

                  <Link href="/compliance" style={styles.serviceItem}>
                    <div style={styles.serviceIcon}>⚖️</div>
                    <div style={styles.serviceInfo}>
                      <div style={styles.serviceName}>Compliance & Reporting</div>
                      <div style={styles.serviceDesc}>Tax reporting, regulatory compliance, and legal notices</div>
                    </div>
                    <div style={styles.serviceArrow}>→</div>
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div style={styles.helpSection}>
            <h3 style={styles.helpTitle}>Need Help?</h3>
            <div style={styles.helpLinks}>
              <Link href="/support" style={styles.helpLink}>💬 Contact Support</Link>
              <Link href="/faq" style={styles.helpLink}>❓ View FAQ</Link>
              <a href="tel:+1-800-OAKLINE" style={styles.helpLink}>📞 Call: 1-800-OAKLINE</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: '100px'
  },
  header: {
    backgroundColor: '#1e40af',
    color: 'white',
    padding: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    textDecoration: 'none',
    color: 'white'
  },
  logoPlaceholder: {
    fontSize: '1.5rem'
  },
  logoText: {
    fontSize: '1.25rem',
    fontWeight: 'bold'
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  backButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.8rem'
  },
  content: {
    padding: '1rem',
    maxWidth: '800px',
    margin: '0 auto'
  },
  titleSection: {
    marginBottom: '1.5rem'
  },
  settingsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  settingsIcon: {
    fontSize: '2.5rem'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#64748b',
    margin: 0
  },
  tabContainer: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '0.5rem',
    marginBottom: '1rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap'
  },
  tab: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#64748b',
    minWidth: '120px'
  },
  activeTab: {
    backgroundColor: '#1e40af',
    color: 'white'
  },
  tabContent: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '1.5rem'
  },
  settingGroup: {
    marginBottom: '2rem'
  },
  groupTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #e5e7eb'
  },
  settingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '0.75rem',
    border: '1px solid #e2e8f0'
  },
  settingInfo: {
    flex: 1
  },
  settingName: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.25rem'
  },
  settingDesc: {
    fontSize: '0.8rem',
    color: '#64748b',
    lineHeight: '1.4'
  },
  toggle: {
    position: 'relative',
    display: 'inline-block',
    width: '50px',
    height: '24px'
  },
  toggleInput: {
    opacity: 0,
    width: 0,
    height: 0
  },
  toggleSlider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ccc',
    transition: '0.4s',
    borderRadius: '24px',
    '&:before': {
      position: 'absolute',
      content: '""',
      height: '16px',
      width: '16px',
      left: '4px',
      bottom: '4px',
      backgroundColor: 'white',
      transition: '0.4s',
      borderRadius: '50%'
    }
  },
  select: {
    padding: '0.5rem',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: 'white',
    fontSize: '0.9rem'
  },
  saveButton: {
    width: '100%',
    padding: '1rem',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  serviceCategory: {
    marginBottom: '2rem'
  },
  categoryTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '2px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  servicesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  serviceItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    textDecoration: 'none',
    transition: 'all 0.2s'
  },
  serviceIcon: {
    fontSize: '1.5rem'
  },
  serviceInfo: {
    flex: 1
  },
  serviceName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.25rem'
  },
  serviceDesc: {
    fontSize: '0.8rem',
    color: '#64748b'
  },
  serviceArrow: {
    fontSize: '1.2rem',
    color: '#94a3b8'
  },
  helpSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    marginTop: '2rem'
  },
  helpTitle: {
    color: '#1e40af',
    marginBottom: '1rem',
    fontSize: '1rem'
  },
  helpLinks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  helpLink: {
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '500',
    padding: '0.5rem',
    borderRadius: '6px',
    transition: 'all 0.2s'
  },
  message: {
    padding: '1rem',
    borderRadius: '8px',
    border: '2px solid',
    marginBottom: '1rem',
    fontSize: '0.9rem'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #1e40af',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '1rem',
    color: '#64748b',
    fontSize: '1rem'
  },
  loginPrompt: {
    textAlign: 'center',
    padding: '2rem 1rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    margin: '2rem auto',
    maxWidth: '400px'
  },
  loginTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 1rem 0'
  },
  loginMessage: {
    color: '#64748b',
    margin: '0 0 1.5rem 0',
    fontSize: '1rem'
  },
  loginButton: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#1e40af',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '500'
  },
  linkingIntro: {
    marginBottom: '2rem'
  },
  introCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    backgroundColor: '#f0f9ff',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '2px solid #0ea5e9'
  },
  introIcon: {
    fontSize: '2rem',
    flexShrink: 0
  },
  introTitle: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  introDesc: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: '1.5',
    margin: 0
  },
  linkingItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s'
  },
  linkButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    flexShrink: 0
  },
  linkingSecurityInfo: {
    marginTop: '2rem'
  },
  securityCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    backgroundColor: '#fefce8',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '2px solid #fbbf24'
  },
  securityIcon: {
    fontSize: '1.5rem',
    flexShrink: 0
  },
  securityTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.75rem'
  },
  securityList: {
    fontSize: '0.9rem',
    color: '#64748b',
    lineHeight: '1.6',
    margin: 0,
    paddingLeft: '1.2rem'
  },
  securityButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '1rem',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    backgroundColor: '#1e40af',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(26, 62, 111, 0.4)',
    minHeight: '48px'
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '1rem',
    background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(220, 38, 38, 0.4)'
  }
};
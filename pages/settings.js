import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');
  const [activeTab, setActiveTab] = useState('notifications');
  const [pendingChanges, setPendingChanges] = useState({});
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [savedSettings, setSavedSettings] = useState({});
  const router = useRouter();

  const [settings, setSettings] = useState({
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    transaction_alerts: true,
    low_balance_alerts: true,
    security_alerts: true,
    marketing_emails: false,
    monthly_statements: true,
    low_balance_threshold: 100,
    transaction_alert_amount: 500,
    preferred_language: 'en',
    currency: 'USD',
    theme: 'light',
    email_frequency: 'instant',
    statement_delivery: 'email',
    auto_save_enabled: true,
    two_factor_enabled: false,
    biometric_login: false,
    session_timeout: 30,
    login_notifications: true,
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setUserProfile(profile);

      if (profile) {
        const loadedSettings = {
          email_notifications: true,
          sms_notifications: false,
          push_notifications: true,
          transaction_alerts: true,
          low_balance_alerts: true,
          security_alerts: true,
          marketing_emails: false,
          monthly_statements: true,
          low_balance_threshold: 100,
          transaction_alert_amount: 500,
          preferred_language: 'en',
          currency: 'USD',
          theme: 'light',
          email_frequency: 'instant',
          statement_delivery: 'email',
          auto_save_enabled: true,
          two_factor_enabled: false,
          biometric_login: false,
          session_timeout: 30,
          login_notifications: true,
          data_sharing: false,
          analytics_tracking: true,
          third_party_sharing: false,
          ...profile.notification_settings,
          ...profile.security_settings,
          ...profile.privacy_settings,
          ...profile.preferences
        };
        setSettings(loadedSettings);
        setSavedSettings(loadedSettings);
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key, value) => {
    const previousValue = settings[key];
    setSaveStatus('saving');

    try {
      const updatedSettings = { ...settings, [key]: value };

      const categories = {
        notification_settings: ['email_notifications', 'sms_notifications', 'push_notifications', 
                                'transaction_alerts', 'low_balance_alerts', 'security_alerts', 
                                'marketing_emails', 'monthly_statements', 'email_frequency'],
        security_settings: ['two_factor_enabled', 'biometric_login', 'session_timeout', 
                           'login_notification_mode', 'require_login_code'],
        privacy_settings: ['data_sharing', 'analytics_tracking', 'third_party_sharing'],
        preferences: ['low_balance_threshold', 'transaction_alert_amount', 'preferred_language', 
                     'currency', 'theme', 'statement_delivery', 'auto_save_enabled']
      };

      const updateData = {};
      for (const [category, keys] of Object.entries(categories)) {
        const categoryData = {};
        keys.forEach(k => {
          categoryData[k] = updatedSettings[k];
        });
        updateData[category] = categoryData;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      setSettings(updatedSettings);
      setSavedSettings(updatedSettings);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);

    } catch (error) {
      console.error('Error saving setting:', error);
      setSettings({ ...settings, [key]: previousValue });
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const saveAllPendingChanges = async () => {
    setSaveStatus('saving');

    try {
      const updatedSettings = { ...settings, ...pendingChanges };

      const categories = {
        notification_settings: ['email_notifications', 'sms_notifications', 'push_notifications', 
                                'transaction_alerts', 'low_balance_alerts', 'security_alerts', 
                                'marketing_emails', 'monthly_statements', 'email_frequency'],
        security_settings: ['two_factor_enabled', 'biometric_login', 'session_timeout', 
                           'login_notification_mode', 'require_login_code'],
        privacy_settings: ['data_sharing', 'analytics_tracking', 'third_party_sharing'],
        preferences: ['low_balance_threshold', 'transaction_alert_amount', 'preferred_language', 
                     'currency', 'theme', 'statement_delivery', 'auto_save_enabled']
      };

      const updateData = {};
      for (const [category, keys] of Object.entries(categories)) {
        const categoryData = {};
        keys.forEach(k => {
          categoryData[k] = updatedSettings[k];
        });
        updateData[category] = categoryData;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      setSettings(updatedSettings);
      setSavedSettings(updatedSettings);
      setPendingChanges({});
      setHasPendingChanges(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);

    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const handleToggle = (key) => {
    const newValue = !settings[key];

    if (settings.auto_save_enabled && key !== 'auto_save_enabled') {
      saveSetting(key, newValue);
    } else {
      setSettings({ ...settings, [key]: newValue });
      if (key !== 'auto_save_enabled') {
        setPendingChanges({ ...pendingChanges, [key]: newValue });
        setHasPendingChanges(true);
      } else {
        saveSetting(key, newValue);
      }
    }
  };

  const handleSelectChange = (key, value) => {
    if (settings.auto_save_enabled) {
      saveSetting(key, value);
    } else {
      setSettings({ ...settings, [key]: value });
      setPendingChanges({ ...pendingChanges, [key]: value });
      setHasPendingChanges(true);
    }
  };

  const handleNumberChange = (key, value) => {
    const numValue = Number(value);
    if (settings.auto_save_enabled) {
      saveSetting(key, numValue);
    } else {
      setSettings({ ...settings, [key]: numValue });
      setPendingChanges({ ...pendingChanges, [key]: numValue });
      setHasPendingChanges(true);
    }
  };

  const discardPendingChanges = () => {
    const restoredSettings = { ...settings };
    Object.keys(pendingChanges).forEach(key => {
      restoredSettings[key] = savedSettings[key];
    });
    setSettings(restoredSettings);
    setPendingChanges({});
    setHasPendingChanges(false);
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
            <div style={styles.statusArea}>
              {saveStatus && (
                <div style={{
                  ...styles.saveStatus,
                  backgroundColor: saveStatus === 'saved' ? '#d4edda' : 
                                  saveStatus === 'saving' ? '#fff3cd' : '#f8d7da',
                  color: saveStatus === 'saved' ? '#155724' : 
                         saveStatus === 'saving' ? '#856404' : '#721c24'
                }}>
                  {saveStatus === 'saved' && '✅ Saved'}
                  {saveStatus === 'saving' && '⏳ Saving...'}
                  {saveStatus === 'error' && '❌ Error saving'}
                </div>
              )}
              {!settings.auto_save_enabled && hasPendingChanges && (
                <div style={styles.pendingButtons}>
                  <button 
                    style={styles.savePendingButton} 
                    onClick={saveAllPendingChanges}
                    disabled={saveStatus === 'saving'}
                  >
                    💾 Save {Object.keys(pendingChanges).length} Change{Object.keys(pendingChanges).length > 1 ? 's' : ''}
                  </button>
                  <button 
                    style={styles.discardButton} 
                    onClick={discardPendingChanges}
                    disabled={saveStatus === 'saving'}
                  >
                    ❌ Discard
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={styles.tabContainer}>
            <div style={styles.tabs}>
              <button
                style={{
                  ...styles.tab,
                  ...(activeTab === 'notifications' ? styles.activeTab : {})
                }}
                onClick={() => setActiveTab('notifications')}
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
                  ...(activeTab === 'preferences' ? styles.activeTab : {})
                }}
                onClick={() => setActiveTab('preferences')}
              >
                🎨 Preferences
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
                  ...(activeTab === 'advanced' ? styles.activeTab : {})
                }}
                onClick={() => setActiveTab('advanced')}
              >
                ⚡ Advanced
              </button>
            </div>
          </div>

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div style={styles.tabContent}>
              <div style={styles.sectionTitle}>📬 Notification Preferences</div>
              <div style={styles.sectionDesc}>Choose how and when you want to be notified</div>

              <div style={styles.settingGroup}>
                <h3 style={styles.groupTitle}>Communication Channels</h3>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>📧 Email Notifications</div>
                    <div style={styles.settingDesc}>Receive important updates and alerts via email</div>
                  </div>
                  <label style={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settings.email_notifications}
                      onChange={() => handleToggle('email_notifications')}
                      style={styles.toggleInput}
                    />
                    <span style={settings.email_notifications ? styles.toggleOn : styles.toggleOff}></span>
                  </label>
                </div>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>📱 SMS Notifications</div>
                    <div style={styles.settingDesc}>Get text messages for critical alerts and transactions</div>
                  </div>
                  <label style={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settings.sms_notifications}
                      onChange={() => handleToggle('sms_notifications')}
                      style={styles.toggleInput}
                    />
                    <span style={settings.sms_notifications ? styles.toggleOn : styles.toggleOff}></span>
                  </label>
                </div>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>🔔 Push Notifications</div>
                    <div style={styles.settingDesc}>Receive real-time notifications on your device</div>
                  </div>
                  <label style={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settings.push_notifications}
                      onChange={() => handleToggle('push_notifications')}
                      style={styles.toggleInput}
                    />
                    <span style={settings.push_notifications ? styles.toggleOn : styles.toggleOff}></span>
                  </label>
                </div>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>Email Frequency</div>
                    <div style={styles.settingDesc}>How often should we send email notifications?</div>
                  </div>
                  <select
                    style={styles.select}
                    value={settings.email_frequency}
                    onChange={(e) => handleSelectChange('email_frequency', e.target.value)}
                  >
                    <option value="instant">Instant (as they happen)</option>
                    <option value="hourly">Hourly digest</option>
                    <option value="daily">Daily summary</option>
                    <option value="weekly">Weekly summary</option>
                  </select>
                </div>
              </div>

              <div style={styles.settingGroup}>
                <h3 style={styles.groupTitle}>Alert Types</h3>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>💸 Transaction Alerts</div>
                    <div style={styles.settingDesc}>Get notified for every account transaction</div>
                  </div>
                  <label style={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settings.transaction_alerts}
                      onChange={() => handleToggle('transaction_alerts')}
                      style={styles.toggleInput}
                    />
                    <span style={settings.transaction_alerts ? styles.toggleOn : styles.toggleOff}></span>
                  </label>
                </div>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>⚠️ Low Balance Alerts</div>
                    <div style={styles.settingDesc}>Alert when your balance falls below threshold</div>
                  </div>
                  <label style={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settings.low_balance_alerts}
                      onChange={() => handleToggle('low_balance_alerts')}
                      style={styles.toggleInput}
                    />
                    <span style={settings.low_balance_alerts ? styles.toggleOn : styles.toggleOff}></span>
                  </label>
                </div>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>Low Balance Threshold</div>
                    <div style={styles.settingDesc}>Notify me when balance drops below this amount</div>
                  </div>
                  <div style={styles.inputGroup}>
                    <span style={styles.currencySymbol}>$</span>
                    <input
                      type="number"
                      style={styles.numberInput}
                      value={settings.low_balance_threshold}
                      onChange={(e) => handleNumberChange('low_balance_threshold', e.target.value)}
                      min="0"
                      step="10"
                    />
                  </div>
                </div>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>Large Transaction Alert Amount</div>
                    <div style={styles.settingDesc}>Alert for transactions exceeding this amount</div>
                  </div>
                  <div style={styles.inputGroup}>
                    <span style={styles.currencySymbol}>$</span>
                    <input
                      type="number"
                      style={styles.numberInput}
                      value={settings.transaction_alert_amount}
                      onChange={(e) => handleNumberChange('transaction_alert_amount', e.target.value)}
                      min="0"
                      step="100"
                    />
                  </div>
                </div>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>🔐 Security Alerts</div>
                    <div style={styles.settingDesc}>Notifications for security events and login attempts</div>
                  </div>
                  <label style={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settings.security_alerts}
                      onChange={() => handleToggle('security_alerts')}
                      style={styles.toggleInput}
                    />
                    <span style={settings.security_alerts ? styles.toggleOn : styles.toggleOff}></span>
                  </label>
                </div>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>🔑 Login Notifications</div>
                    <div style={styles.settingDesc}>Get notified when someone logs into your account</div>
                  </div>
                  <label style={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settings.login_notifications}
                      onChange={() => handleToggle('login_notifications')}
                      style={styles.toggleInput}
                    />
                    <span style={settings.login_notifications ? styles.toggleOn : styles.toggleOff}></span>
                  </label>
                </div>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>📊 Monthly Statements</div>
                    <div style={styles.settingDesc}>Receive monthly account statements</div>
                  </div>
                  <label style={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settings.monthly_statements}
                      onChange={() => handleToggle('monthly_statements')}
                      style={styles.toggleInput}
                    />
                    <span style={settings.monthly_statements ? styles.toggleOn : styles.toggleOff}></span>
                  </label>
                </div>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>📣 Marketing Emails</div>
                    <div style={styles.settingDesc}>Receive promotional offers and product updates</div>
                  </div>
                  <label style={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settings.marketing_emails}
                      onChange={() => handleToggle('marketing_emails')}
                      style={styles.toggleInput}
                    />
                    <span style={settings.marketing_emails ? styles.toggleOn : styles.toggleOff}></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div style={styles.tabContent}>
              <div style={styles.sectionTitle}>🔒 Security & Login Settings</div>
              <div style={styles.sectionDesc}>Manage login notifications and security preferences</div>

              <div style={styles.settingGroup}>
                <h3 style={styles.groupTitle}>Login Security</h3>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>📧 Login Notification Mode</div>
                    <div style={styles.settingDesc}>Choose when to receive login notifications</div>
                  </div>
                  <select
                    style={styles.select}
                    value={settings.login_notification_mode || 'all'}
                    onChange={(e) => handleSelectChange('login_notification_mode', e.target.value)}
                  >
                    <option value="all">Notify for every login (all devices)</option>
                    <option value="new_device">Notify for new devices only</option>
                  </select>
                </div>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>🔐 Require Login Confirmation Code</div>
                    <div style={styles.settingDesc}>Require email verification code for all logins (recommended for maximum security)</div>
                  </div>
                  <label style={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settings.require_login_code}
                      onChange={() => handleToggle('require_login_code')}
                      style={styles.toggleInput}
                    />
                    <span style={settings.require_login_code ? styles.toggleOn : styles.toggleOff}></span>
                  </label>
                </div>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>⏱️ Session Timeout</div>
                    <div style={styles.settingDesc}>Auto-logout after period of inactivity</div>
                  </div>
                  <select
                    style={styles.select}
                    value={settings.session_timeout}
                    onChange={(e) => handleNumberChange('session_timeout', e.target.value)}
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                    <option value="240">4 hours</option>
                  </select>
                </div>
              </div>

              <div style={styles.infoBox}>
                <div style={styles.infoIcon}>💡</div>
                <div>
                  <div style={styles.infoTitle}>Login Notification Modes Explained</div>
                  <div style={styles.infoText}>
                    <strong>Every login:</strong> You'll receive an email notification each time you log in, regardless of the device.<br/><br/>
                    <strong>New devices only:</strong> You'll only be notified when logging in from a device we haven't seen before.<br/><br/>
                    <strong>Login confirmation code:</strong> When enabled, you'll need to enter a code sent to your email for every login attempt, even from trusted devices.
                  </div>
                </div>
              </div>

              <div style={styles.settingGroup}>
                <h3 style={styles.groupTitle}>Security Center</h3>

                <div style={styles.actionItem}>
                  <div style={styles.actionInfo}>
                    <div style={styles.actionName}>🔑 Password & Authentication</div>
                    <div style={styles.actionDesc}>Change password, setup 2FA, and manage authentication methods</div>
                  </div>
                  <button 
                    style={styles.actionButton}
                    onClick={() => router.push('/security')}
                  >
                    Go to Security
                  </button>
                </div>

                <div style={styles.actionItem}>
                  <div style={styles.actionInfo}>
                    <div style={styles.actionName}>🔒 Transaction PIN</div>
                    <div style={styles.actionDesc}>Setup or reset your PIN for sensitive transactions</div>
                  </div>
                  <button 
                    style={styles.actionButton}
                    onClick={() => router.push('/setup-transaction-pin')}
                  >
                    Manage PIN
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div style={styles.tabContent}>
              <div style={styles.sectionTitle}>🎨 Preferences</div>
              <div style={styles.sectionDesc}>Customize your banking experience</div>

              <div style={styles.settingGroup}>
                <h3 style={styles.groupTitle}>Display & Language</h3>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>🌍 Preferred Language</div>
                    <div style={styles.settingDesc}>Choose your preferred language</div>
                  </div>
                  <select
                    style={styles.select}
                    value={settings.preferred_language}
                    onChange={(e) => handleSelectChange('preferred_language', e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="zh">中文</option>
                    <option value="ja">日本語</option>
                    <option value="ar">العربية</option>
                  </select>
                </div>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>💰 Currency</div>
                    <div style={styles.settingDesc}>Default currency for display</div>
                  </div>
                  <select
                    style={styles.select}
                    value={settings.currency}
                    onChange={(e) => handleSelectChange('currency', e.target.value)}
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="JPY">JPY - Japanese Yen</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                    <option value="CHF">CHF - Swiss Franc</option>
                  </select>
                </div>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>🎨 Theme</div>
                    <div style={styles.settingDesc}>Choose your preferred interface theme</div>
                  </div>
                  <select
                    style={styles.select}
                    value={settings.theme}
                    onChange={(e) => handleSelectChange('theme', e.target.value)}
                  >
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                    <option value="auto">Auto (System Default)</option>
                  </select>
                </div>
              </div>

              <div style={styles.settingGroup}>
                <h3 style={styles.groupTitle}>Statements & Documents</h3>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>📄 Statement Delivery</div>
                    <div style={styles.settingDesc}>How would you like to receive statements?</div>
                  </div>
                  <select
                    style={styles.select}
                    value={settings.statement_delivery}
                    onChange={(e) => handleSelectChange('statement_delivery', e.target.value)}
                  >
                    <option value="email">Email Only</option>
                    <option value="mail">Physical Mail</option>
                    <option value="both">Both Email & Mail</option>
                    <option value="online">Online Only (No Delivery)</option>
                  </select>
                </div>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>💾 Auto-Save Forms</div>
                    <div style={styles.settingDesc}>Automatically save form progress</div>
                  </div>
                  <label style={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settings.auto_save_enabled}
                      onChange={() => handleToggle('auto_save_enabled')}
                      style={styles.toggleInput}
                    />
                    <span style={settings.auto_save_enabled ? styles.toggleOn : styles.toggleOff}></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div style={styles.tabContent}>
              <div style={styles.sectionTitle}>🛡️ Privacy Settings</div>
              <div style={styles.sectionDesc}>Control how your data is used and shared</div>

              <div style={styles.settingGroup}>
                <h3 style={styles.groupTitle}>Data & Privacy</h3>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>📊 Data Sharing</div>
                    <div style={styles.settingDesc}>Share anonymized data to improve our services</div>
                  </div>
                  <label style={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settings.data_sharing}
                      onChange={() => handleToggle('data_sharing')}
                      style={styles.toggleInput}
                    />
                    <span style={settings.data_sharing ? styles.toggleOn : styles.toggleOff}></span>
                  </label>
                </div>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>📈 Analytics Tracking</div>
                    <div style={styles.settingDesc}>Help us improve by tracking app usage</div>
                  </div>
                  <label style={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settings.analytics_tracking}
                      onChange={() => handleToggle('analytics_tracking')}
                      style={styles.toggleInput}
                    />
                    <span style={settings.analytics_tracking ? styles.toggleOn : styles.toggleOff}></span>
                  </label>
                </div>

                <div style={styles.settingItem}>
                  <div style={styles.settingInfo}>
                    <div style={styles.settingName}>🤝 Third-Party Sharing</div>
                    <div style={styles.settingDesc}>Allow sharing data with trusted partners</div>
                  </div>
                  <label style={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settings.third_party_sharing}
                      onChange={() => handleToggle('third_party_sharing')}
                      style={styles.toggleInput}
                    />
                    <span style={settings.third_party_sharing ? styles.toggleOn : styles.toggleOff}></span>
                  </label>
                </div>
              </div>

              <div style={styles.infoBox}>
                <div style={styles.infoIcon}>ℹ️</div>
                <div>
                  <div style={styles.infoTitle}>Your Privacy Matters</div>
                  <div style={styles.infoText}>
                    We take your privacy seriously. Your financial data is never sold to third parties. 
                    Analytics help us improve our services, and all data is anonymized.
                  </div>
                  <Link href="/privacy-policy" style={styles.infoLink}>
                    Read our Privacy Policy →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div style={styles.tabContent}>
              <div style={styles.sectionTitle}>⚡ Advanced Settings</div>
              <div style={styles.sectionDesc}>Advanced options for power users</div>

              <div style={styles.settingGroup}>
                <h3 style={styles.groupTitle}>Account Actions</h3>

                <div style={styles.actionItem}>
                  <div style={styles.actionInfo}>
                    <div style={styles.actionName}>📥 Export Account Data</div>
                    <div style={styles.actionDesc}>Download all your account data and transaction history</div>
                  </div>
                  <button style={styles.actionButton}>
                    Export
                  </button>
                </div>

                <div style={styles.actionItem}>
                  <div style={styles.actionInfo}>
                    <div style={styles.actionName}>🔗 Connect External Accounts</div>
                    <div style={styles.actionDesc}>Link accounts from other banks using Plaid</div>
                  </div>
                  <button 
                    style={styles.actionButton}
                    onClick={() => router.push('/link-account')}
                  >
                    Connect
                  </button>
                </div>

                <div style={styles.actionItem}>
                  <div style={styles.actionInfo}>
                    <div style={styles.actionName}>🔄 Reset All Settings</div>
                    <div style={styles.actionDesc}>Restore all settings to default values</div>
                  </div>
                  <button style={{...styles.actionButton, backgroundColor: '#f59e0b'}}>
                    Reset
                  </button>
                </div>
              </div>

              <div style={styles.dangerZone}>
                <h3 style={styles.dangerTitle}>⚠️ Danger Zone</h3>

                <div style={styles.dangerItem}>
                  <div style={styles.dangerInfo}>
                    <div style={styles.dangerName}>Deactivate Account</div>
                    <div style={styles.dangerDesc}>
                      Temporarily disable your account. You can reactivate it anytime.
                    </div>
                  </div>
                  <button style={styles.dangerButton}>
                    Deactivate
                  </button>
                </div>

                <div style={styles.dangerItem}>
                  <div style={styles.dangerInfo}>
                    <div style={styles.dangerName}>Close Account</div>
                    <div style={styles.dangerDesc}>
                      Permanently close your account. This action cannot be undone.
                    </div>
                  </div>
                  <button style={styles.dangerButton}>
                    Close Account
                  </button>
                </div>
              </div>
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
    </>
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
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textDecoration: 'none',
    color: 'white'
  },
  logoPlaceholder: {
    fontSize: '28px'
  },
  logoText: {
    fontSize: '22px',
    fontWeight: 'bold'
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  backButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block'
  },
  content: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '30px 20px'
  },
  titleSection: {
    marginBottom: '30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  settingsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  settingsIcon: {
    fontSize: '48px'
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 5px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0
  },
  saveStatus: {
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    marginTop: '10px'
  },
  tabContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '10px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0'
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  tab: {
    flex: 1,
    minWidth: '120px',
    padding: '12px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '500',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap'
  },
  activeTab: {
    backgroundColor: '#3b82f6',
    color: 'white',
    fontWeight: '600'
  },
  tabContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0'
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '8px'
  },
  sectionDesc: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '30px'
  },
  settingGroup: {
    marginBottom: '30px',
    paddingBottom: '30px',
    borderBottom: '1px solid #e2e8f0'
  },
  groupTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '20px'
  },
  settingItem: {
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
  settingName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '5px'
  },
  settingDesc: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.5'
  },
  toggle: {
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
    transition: '0.3s',
    borderRadius: '28px',
    '::before': {
      position: 'absolute',
      content: '""',
      height: '20px',
      width: '20px',
      left: '4px',
      bottom: '4px',
      backgroundColor: 'white',
      transition: '0.3s',
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
    transition: '0.3s',
    borderRadius: '28px',
    '::before': {
      position: 'absolute',
      content: '""',
      height: '20px',
      width: '20px',
      left: '32px',
      bottom: '4px',
      backgroundColor: 'white',
      transition: '0.3s',
      borderRadius: '50%'
    }
  },
  select: {
    minWidth: '200px',
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
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0 15px'
  },
  currencySymbol: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#64748b'
  },
  numberInput: {
    width: '120px',
    padding: '10px 5px',
    border: 'none',
    fontSize: '14px',
    color: '#1e293b',
    backgroundColor: 'transparent',
    outline: 'none'
  },
  actionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    marginBottom: '15px',
    border: '1px solid #e2e8f0'
  },
  actionInfo: {
    flex: 1,
    paddingRight: '20px'
  },
  actionName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '5px'
  },
  actionDesc: {
    fontSize: '14px',
    color: '#64748b'
  },
  actionButton: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)'
  },
  infoBox: {
    display: 'flex',
    gap: '15px',
    padding: '20px',
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    border: '1px solid #bfdbfe',
    marginTop: '30px'
  },
  infoIcon: {
    fontSize: '24px'
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
    lineHeight: '1.6',
    marginBottom: '10px'
  },
  infoLink: {
    fontSize: '14px',
    color: '#2563eb',
    fontWeight: '600',
    textDecoration: 'none'
  },
  dangerZone: {
    marginTop: '40px',
    padding: '25px',
    backgroundColor: '#fef2f2',
    borderRadius: '12px',
    border: '2px solid #fecaca'
  },
  dangerTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: '20px'
  },
  dangerItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    marginBottom: '15px',
    border: '1px solid #fecaca'
  },
  dangerInfo: {
    flex: 1,
    paddingRight: '20px'
  },
  dangerName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: '5px'
  },
  dangerDesc: {
    fontSize: '14px',
    color: '#991b1b'
  },
  dangerButton: {
    padding: '10px 24px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
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
    width: '50px',
    height: '50px',
    border: '5px solid #e2e8f0',
    borderTop: '5px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  loadingText: {
    fontSize: '16px',
    color: '#64748b'
  },
  loginPrompt: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  loginTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '10px'
  },
  loginMessage: {
    fontSize: '16px',
    color: '#64748b',
    marginBottom: '30px'
  },
  loginButton: {
    display: 'inline-block',
    padding: '12px 32px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600'
  },
  statusArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    alignItems: 'flex-end'
  },
  pendingButtons: {
    display: 'flex',
    gap: '10px'
  },
  savePendingButton: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
  },
  discardButton: {
    padding: '10px 20px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)'
  }
};
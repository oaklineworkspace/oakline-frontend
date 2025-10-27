import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';
import { Html5Qrcode } from 'html5-qrcode';

export default function ZellePage() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('send');
  const [accounts, setAccounts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [zelleSettings, setZelleSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [receiverData, setReceiverData] = useState(null);
  const [pendingTransactionId, setPendingTransactionId] = useState(null);
  const [sending, setSending] = useState(false);
  const router = useRouter();
  const qrScannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

  const [sendForm, setSendForm] = useState({
    from_account: '',
    receiver_contact: '',
    amount: '',
    memo: ''
  });

  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    nickname: ''
  });

  const [settingsForm, setSettingsForm] = useState({
    daily_limit: 2500,
    monthly_limit: 20000,
    notification_enabled: true,
    require_verification: true
  });

  useEffect(() => {
    checkUserAndLoadData();
    return () => {
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const checkUserAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/sign-in');
        return;
      }
      setUser(session.user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      setUserProfile(profile);

      const { data: userAccounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active');
      setAccounts(userAccounts || []);
      if (userAccounts?.length > 0) {
        setSendForm(prev => ({ ...prev, from_account: userAccounts[0].id }));
      }

      const { data: settings } = await supabase
        .from('zelle_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (settings) {
        setZelleSettings(settings);
        setSettingsForm({
          daily_limit: settings.daily_limit || 2500,
          monthly_limit: settings.monthly_limit || 20000,
          notification_enabled: settings.notification_enabled ?? true,
          require_verification: settings.require_verification ?? true
        });
      } else {
        await supabase.from('zelle_settings').insert([{
          user_id: session.user.id,
          email: profile?.email || session.user.email,
          daily_limit: 2500,
          monthly_limit: 20000,
          is_enrolled: true,
          enrolled_at: new Date().toISOString()
        }]);
      }

      const { data: zelleContacts } = await supabase
        .from('zelle_contacts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name');
      setContacts(zelleContacts || []);

      const { data: zelleTxns } = await supabase
        .from('zelle_transactions')
        .select('*')
        .or(`sender_id.eq.${session.user.id},recipient_user_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false })
        .limit(10);
      setTransactions(zelleTxns || []);

    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMoneyClick = async () => {
    if (!sendForm.from_account || !sendForm.receiver_contact || !sendForm.amount) {
      setMessage('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(sendForm.amount);
    if (amount <= 0 || isNaN(amount)) {
      setMessage('Please enter a valid amount');
      return;
    }

    setSending(true);
    setMessage('');

    try {
      const response = await fetch('/api/zelle-send-money', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: user.id,
          sender_account_id: sendForm.from_account,
          recipient_contact: sendForm.receiver_contact,
          amount: sendForm.amount,
          memo: sendForm.memo,
          step: 'initiate'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to initiate transfer');
      }

      setReceiverData({
        name: result.recipient_name,
        email: result.recipient_email,
        amount: sendForm.amount
      });
      setPendingTransactionId(result.transaction_id);
      setShowConfirmModal(false);
      setShowVerificationModal(true);

    } catch (error) {
      console.error('Error initiating transfer:', error);
      setMessage(error.message);
    } finally {
      setSending(false);
    }
  };

  const handleVerifyAndSend = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setMessage('Please enter a valid 6-digit code');
      return;
    }

    setSending(true);
    setMessage('');

    try {
      const response = await fetch('/api/zelle-send-money', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: user.id,
          transaction_id: pendingTransactionId,
          verification_code: verificationCode,
          step: 'complete'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Verification failed');
      }

      setShowVerificationModal(false);
      setVerificationCode('');
      setSendForm({ from_account: accounts[0]?.id || '', receiver_contact: '', amount: '', memo: '' });
      setMessage('✅ Transfer completed successfully!');
      await checkUserAndLoadData();

    } catch (error) {
      console.error('Error completing transfer:', error);
      setMessage(error.message);
    } finally {
      setSending(false);
    }
  };

  const startQRScanner = async () => {
    setShowQRScanner(true);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      const scanner = new Html5Qrcode("qr-reader");
      scannerInstanceRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          try {
            const data = JSON.parse(decodedText);
            if (data.email || data.phone) {
              setSendForm(prev => ({ ...prev, receiver_contact: data.email || data.phone }));
              stopQRScanner();
            }
          } catch {
            setSendForm(prev => ({ ...prev, receiver_contact: decodedText }));
            stopQRScanner();
          }
        },
        (errorMessage) => {
          console.log(errorMessage);
        }
      );
    } catch (error) {
      console.error('Error starting QR scanner:', error);
      setMessage('Failed to start camera. Please check permissions.');
      setShowQRScanner(false);
    }
  };

  const stopQRScanner = () => {
    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.stop().then(() => {
        setShowQRScanner(false);
        scannerInstanceRef.current = null;
      }).catch(console.error);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!contactForm.name || (!contactForm.email && !contactForm.phone)) {
      setMessage('Please provide name and at least one contact method');
      return;
    }

    try {
      const { error } = await supabase
        .from('zelle_contacts')
        .insert([{
          user_id: user.id,
          name: contactForm.name,
          email: contactForm.email || null,
          phone: contactForm.phone || null,
          nickname: contactForm.nickname || null
        }]);

      if (error) throw error;

      setContactForm({ name: '', email: '', phone: '', nickname: '' });
      setMessage('✅ Contact added successfully');
      await checkUserAndLoadData();
    } catch (error) {
      console.error('Error adding contact:', error);
      setMessage('Failed to add contact');
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('zelle_settings')
        .update(settingsForm)
        .eq('user_id', user.id);

      if (error) throw error;

      setMessage('✅ Settings updated successfully');
      await checkUserAndLoadData();
    } catch (error) {
      console.error('Error updating settings:', error);
      setMessage('Failed to update settings');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading Zelle®...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Zelle® - Oakline Bank</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/dashboard" style={styles.backButton}>← Dashboard</Link>
          <h1 style={styles.headerTitle}>Zelle®</h1>
          <div style={styles.balanceDisplay}>
            {zelleSettings && (
              <div style={styles.limitInfo}>
                Daily: ${zelleSettings.daily_limit?.toLocaleString()}
              </div>
            )}
          </div>
        </div>

        <div style={styles.content}>
          {message && (
            <div style={{
              ...styles.message,
              backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2',
              color: message.includes('✅') ? '#065f46' : '#991b1b'
            }}>
              {message}
            </div>
          )}

          <div style={styles.tabs}>
            {['send', 'contacts', 'transactions', 'settings'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  ...styles.tab,
                  ...(activeTab === tab ? styles.activeTab : {})
                }}
              >
                {tab === 'send' && '💸 Send Money'}
                {tab === 'contacts' && '👥 Contacts'}
                {tab === 'transactions' && '📊 History'}
                {tab === 'settings' && '⚙️ Settings'}
              </button>
            ))}
          </div>

          {/* SEND MONEY TAB */}
          {activeTab === 'send' && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Send Money with Zelle®</h2>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>From Account</label>
                <select
                  style={styles.select}
                  value={sendForm.from_account}
                  onChange={(e) => setSendForm(prev => ({ ...prev, from_account: e.target.value }))}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_type} - {acc.account_number} (${parseFloat(acc.balance).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Recipient Email or Phone</label>
                <div style={styles.inputWithButton}>
                  <input
                    type="text"
                    style={styles.input}
                    value={sendForm.receiver_contact}
                    onChange={(e) => setSendForm(prev => ({ ...prev, receiver_contact: e.target.value }))}
                    placeholder="email@example.com or (555) 123-4567"
                  />
                  <button
                    onClick={startQRScanner}
                    style={styles.qrButton}
                    type="button"
                  >
                    📷 Scan QR
                  </button>
                </div>
                <small style={styles.helperText}>Or select from contacts below</small>
                {contacts.length > 0 && (
                  <div style={styles.contactChips}>
                    {contacts.slice(0, 5).map(contact => (
                      <button
                        key={contact.id}
                        onClick={() => setSendForm(prev => ({ ...prev, receiver_contact: contact.email || contact.phone }))}
                        style={styles.contactChip}
                      >
                        {contact.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  style={styles.input}
                  value={sendForm.amount}
                  onChange={(e) => setSendForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Memo (Optional)</label>
                <input
                  type="text"
                  style={styles.input}
                  value={sendForm.memo}
                  onChange={(e) => setSendForm(prev => ({ ...prev, memo: e.target.value }))}
                  placeholder="What's this for?"
                />
              </div>

              <button
                onClick={handleSendMoneyClick}
                style={styles.primaryButton}
                disabled={sending}
              >
                {sending ? '⏳ Processing...' : '💸 Send Money'}
              </button>
            </div>
          )}

          {/* CONTACTS TAB */}
          {activeTab === 'contacts' && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Zelle® Contacts</h2>
              
              <form onSubmit={handleAddContact} style={styles.form}>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Name *</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={contactForm.name}
                      onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Nickname</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={contactForm.nickname}
                      onChange={(e) => setContactForm(prev => ({ ...prev, nickname: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Email</label>
                    <input
                      type="email"
                      style={styles.input}
                      value={contactForm.email}
                      onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Phone</label>
                    <input
                      type="tel"
                      style={styles.input}
                      value={contactForm.phone}
                      onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <button type="submit" style={styles.primaryButton}>
                  ➕ Add Contact
                </button>
              </form>

              <div style={styles.contactList}>
                {contacts.map(contact => (
                  <div key={contact.id} style={styles.contactItem}>
                    <div>
                      <div style={styles.contactName}>{contact.name}</div>
                      <div style={styles.contactDetail}>
                        {contact.email || contact.phone}
                      </div>
                    </div>
                    <button
                      onClick={() => setSendForm(prev => ({ ...prev, receiver_contact: contact.email || contact.phone }))}
                      style={styles.sendToButton}
                    >
                      Send →
                    </button>
                  </div>
                ))}
                {contacts.length === 0 && (
                  <p style={styles.emptyState}>No contacts yet. Add your first contact above!</p>
                )}
              </div>
            </div>
          )}

          {/* TRANSACTIONS TAB */}
          {activeTab === 'transactions' && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Recent Zelle® Transactions</h2>
              
              <div style={styles.transactionList}>
                {transactions.map(txn => (
                  <div key={txn.id} style={styles.transactionItem}>
                    <div style={styles.transactionLeft}>
                      <div style={styles.transactionType}>
                        {txn.sender_id === user?.id ? '📤 Sent' : '📥 Received'}
                      </div>
                      <div style={styles.transactionName}>
                        {txn.sender_id === user?.id 
                          ? `To: ${txn.recipient_name}` 
                          : `From: ${txn.sender_id}`}
                      </div>
                      <div style={styles.transactionDate}>
                        {new Date(txn.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={styles.transactionRight}>
                      <div style={{
                        ...styles.transactionAmount,
                        color: txn.sender_id === user?.id ? '#ef4444' : '#10b981'
                      }}>
                        {txn.sender_id === user?.id ? '-' : '+'}${parseFloat(txn.amount).toFixed(2)}
                      </div>
                      <div style={{
                        ...styles.transactionStatus,
                        backgroundColor: getStatusColor(txn.status) + '20',
                        color: getStatusColor(txn.status)
                      }}>
                        {txn.status}
                      </div>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <p style={styles.emptyState}>No transactions yet. Start sending money!</p>
                )}
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Zelle® Settings</h2>
              
              <form onSubmit={handleUpdateSettings} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Daily Transfer Limit</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={settingsForm.daily_limit}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, daily_limit: parseFloat(e.target.value) }))}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Monthly Transfer Limit</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={settingsForm.monthly_limit}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, monthly_limit: parseFloat(e.target.value) }))}
                  />
                </div>

                <div style={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="notifications"
                    checked={settingsForm.notification_enabled}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, notification_enabled: e.target.checked }))}
                  />
                  <label htmlFor="notifications" style={styles.checkboxLabel}>
                    Enable transfer notifications
                  </label>
                </div>

                <div style={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="verification"
                    checked={settingsForm.require_verification}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, require_verification: e.target.checked }))}
                  />
                  <label htmlFor="verification" style={styles.checkboxLabel}>
                    Require verification code for transfers
                  </label>
                </div>

                <button type="submit" style={styles.primaryButton}>
                  💾 Save Settings
                </button>
              </form>

              <div style={styles.infoBox}>
                <h3 style={styles.infoTitle}>Your Zelle® Profile</h3>
                <p><strong>Email:</strong> {zelleSettings?.email}</p>
                <p><strong>Phone:</strong> {zelleSettings?.phone || 'Not set'}</p>
                <p><strong>Enrolled:</strong> {zelleSettings?.enrolled_at ? new Date(zelleSettings.enrolled_at).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          )}
        </div>

        {/* VERIFICATION MODAL */}
        {showVerificationModal && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <h2 style={styles.modalTitle}>Verify Transaction</h2>
              <p style={styles.modalText}>
                We've sent a 6-digit code to your email: <strong>{userProfile?.email}</strong>
              </p>
              
              <div style={styles.confirmDetails}>
                <p><strong>To:</strong> {receiverData?.name}</p>
                <p><strong>Amount:</strong> ${receiverData?.amount}</p>
              </div>

              <input
                type="text"
                maxLength="6"
                style={styles.verificationInput}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
              />

              <div style={styles.modalButtons}>
                <button
                  onClick={() => {
                    setShowVerificationModal(false);
                    setVerificationCode('');
                  }}
                  style={styles.cancelButton}
                  disabled={sending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifyAndSend}
                  style={styles.confirmButton}
                  disabled={sending || verificationCode.length !== 6}
                >
                  {sending ? 'Verifying...' : 'Verify & Send'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QR SCANNER MODAL */}
        {showQRScanner && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <h2 style={styles.modalTitle}>Scan Zelle® QR Code</h2>
              <div id="qr-reader" ref={qrScannerRef} style={styles.qrReader}></div>
              <button onClick={stopQRScanner} style={styles.cancelButton}>
                Close Scanner
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
    paddingBottom: '100px'
  },
  header: {
    backgroundColor: 'linear-gradient(135deg, #6B21A8 0%, #9333EA 100%)',
    background: 'linear-gradient(135deg, #6B21A8 0%, #9333EA 100%)',
    color: 'white',
    padding: '1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  backButton: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '1rem'
  },
  headerTitle: {
    margin: 0,
    fontSize: '1.5rem'
  },
  balanceDisplay: {
    textAlign: 'right'
  },
  limitInfo: {
    fontSize: '0.9rem',
    opacity: 0.9
  },
  content: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '1.5rem'
  },
  message: {
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontWeight: '500'
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    overflowX: 'auto'
  },
  tab: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    backgroundColor: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s'
  },
  activeTab: {
    background: 'linear-gradient(135deg, #6B21A8 0%, #9333EA 100%)',
    color: 'white',
    fontWeight: '600'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  cardTitle: {
    fontSize: '1.5rem',
    marginBottom: '1.5rem',
    color: '#1e293b'
  },
  formGroup: {
    marginBottom: '1.25rem'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginBottom: '1rem'
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '600',
    color: '#374151'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '1rem',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '1rem',
    boxSizing: 'border-box',
    backgroundColor: 'white'
  },
  inputWithButton: {
    display: 'flex',
    gap: '0.5rem'
  },
  qrButton: {
    padding: '0.75rem 1rem',
    backgroundColor: '#6B21A8',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  helperText: {
    fontSize: '0.85rem',
    color: '#64748b',
    marginTop: '0.25rem',
    display: 'block'
  },
  contactChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginTop: '0.75rem'
  },
  contactChip: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  primaryButton: {
    width: '100%',
    padding: '1rem',
    backgroundColor: '#6B21A8',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '1rem'
  },
  form: {
    marginBottom: '2rem'
  },
  contactList: {
    marginTop: '2rem'
  },
  contactItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '0.75rem'
  },
  contactName: {
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.25rem'
  },
  contactDetail: {
    fontSize: '0.9rem',
    color: '#64748b'
  },
  sendToButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#6B21A8',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  transactionList: {
    marginTop: '1rem'
  },
  transactionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '0.75rem'
  },
  transactionLeft: {
    flex: 1
  },
  transactionType: {
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.25rem'
  },
  transactionName: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginBottom: '0.25rem'
  },
  transactionDate: {
    fontSize: '0.85rem',
    color: '#94a3b8'
  },
  transactionRight: {
    textAlign: 'right'
  },
  transactionAmount: {
    fontSize: '1.1rem',
    fontWeight: '700',
    marginBottom: '0.5rem'
  },
  transactionStatus: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1rem'
  },
  checkboxLabel: {
    fontSize: '0.95rem',
    color: '#374151'
  },
  infoBox: {
    backgroundColor: '#f0fdf4',
    padding: '1.5rem',
    borderRadius: '8px',
    marginTop: '2rem',
    borderLeft: '4px solid #10b981'
  },
  infoTitle: {
    fontSize: '1.1rem',
    marginBottom: '1rem',
    color: '#065f46'
  },
  emptyState: {
    textAlign: 'center',
    color: '#94a3b8',
    padding: '2rem',
    fontStyle: 'italic'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto'
  },
  modalTitle: {
    fontSize: '1.5rem',
    marginBottom: '1rem',
    color: '#1e293b'
  },
  modalText: {
    marginBottom: '1.5rem',
    color: '#64748b'
  },
  confirmDetails: {
    backgroundColor: '#f1f5f9',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem'
  },
  verificationInput: {
    width: '100%',
    padding: '1rem',
    fontSize: '2rem',
    textAlign: 'center',
    letterSpacing: '1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    boxSizing: 'border-box'
  },
  modalButtons: {
    display: 'flex',
    gap: '1rem'
  },
  cancelButton: {
    flex: 1,
    padding: '0.875rem',
    backgroundColor: '#e2e8f0',
    color: '#475569',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  confirmButton: {
    flex: 1,
    padding: '0.875rem',
    backgroundColor: '#6B21A8',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  qrReader: {
    width: '100%',
    marginBottom: '1rem'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh'
  },
  spinner: {
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #6B21A8',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite'
  }
};

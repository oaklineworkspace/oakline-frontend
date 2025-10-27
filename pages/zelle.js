
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function ZellePage() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('send');
  const [accounts, setAccounts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [zelleSettings, setZelleSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [receiverData, setReceiverData] = useState(null);
  const router = useRouter();

  const [sendForm, setSendForm] = useState({
    from_account: '',
    receiver_contact: '',
    amount: '',
    memo: ''
  });

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

  const checkUserAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/sign-in');
        return;
      }
      setUser(session.user);

      // Load accounts
      const { data: userAccounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active');
      setAccounts(userAccounts || []);
      if (userAccounts?.length > 0) {
        setSendForm(prev => ({ ...prev, from_account: userAccounts[0].id }));
      }

      // Load Zelle settings
      const { data: settings } = await supabase
        .from('zelle_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      setZelleSettings(settings);

      // Load contacts
      const { data: zelleContacts } = await supabase
        .from('zelle_contacts')
        .select('*')
        .eq('user_id', session.user.id);
      setContacts(zelleContacts || []);

      // Load transactions
      const { data: zelleTxns } = await supabase
        .from('zelle_transactions')
        .select('*')
        .or(`sender_id.eq.${session.user.id},recipient_user_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false })
        .limit(10);
      setTransactions(zelleTxns || []);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLookupReceiver = async () => {
    if (!sendForm.receiver_contact) {
      setMessage('Please enter email or phone number');
      return;
    }

    setLoading(true);
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isEmail = emailRegex.test(sendForm.receiver_contact);

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone')
        .eq(isEmail ? 'email' : 'phone', sendForm.receiver_contact)
        .single();

      if (!profile) {
        setMessage('❌ Recipient not found in Oakline Bank');
        setLoading(false);
        return;
      }

      setReceiverData(profile);
      setShowConfirmModal(true);
    } catch (error) {
      setMessage('Error looking up recipient');
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationCode = async () => {
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentCode(code);

      const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          code: code,
          type: 'zelle_transfer'
        })
      });

      if (!response.ok) throw new Error('Failed to send code');

      setShowConfirmModal(false);
      setShowVerificationModal(true);
      setMessage('✅ Verification code sent to your email');
    } catch (error) {
      setMessage('❌ Error sending verification code');
    }
  };

  const completeTransfer = async () => {
    if (verificationCode !== sentCode) {
      setMessage('❌ Invalid verification code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/zelle-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: user.id,
          sender_account_id: sendForm.from_account,
          recipient_contact: sendForm.receiver_contact,
          amount: parseFloat(sendForm.amount),
          memo: sendForm.memo,
          transaction_type: 'send'
        })
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      setMessage('✅ Transfer completed successfully!');
      setShowVerificationModal(false);
      setSendForm({ from_account: sendForm.from_account, receiver_contact: '', amount: '', memo: '' });
      setReceiverData(null);
      setVerificationCode('');
      setSentCode('');
      
      setTimeout(() => {
        checkUserAndLoadData();
      }, 1000);

    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  if (loading && !user) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading Zelle...</p>
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
          <Link href="/" style={styles.logoContainer}>
            <div style={styles.logoPlaceholder}>🏦</div>
            <span style={styles.logoText}>Oakline Bank</span>
          </Link>
          <Link href="/dashboard" style={styles.backButton}>← Dashboard</Link>
        </div>

        <div style={styles.content}>
          <div style={styles.titleSection}>
            <h1 style={styles.title}>Zelle® Dashboard</h1>
            <p style={styles.subtitle}>Send and receive money instantly</p>
          </div>

          {/* Balance and Limits Card */}
          {zelleSettings && (
            <div style={styles.balanceCard}>
              <div style={styles.balanceItem}>
                <span style={styles.balanceLabel}>Daily Limit</span>
                <span style={styles.balanceValue}>{formatCurrency(zelleSettings.daily_limit)}</span>
              </div>
              <div style={styles.balanceItem}>
                <span style={styles.balanceLabel}>Monthly Limit</span>
                <span style={styles.balanceValue}>{formatCurrency(zelleSettings.monthly_limit)}</span>
              </div>
            </div>
          )}

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

          {/* Tabs */}
          <div style={styles.tabs}>
            <button
              style={{ ...styles.tab, ...(activeTab === 'send' ? styles.activeTab : {}) }}
              onClick={() => setActiveTab('send')}
            >
              💸 Send Money
            </button>
            <button
              style={{ ...styles.tab, ...(activeTab === 'contacts' ? styles.activeTab : {}) }}
              onClick={() => setActiveTab('contacts')}
            >
              👥 Contacts
            </button>
            <button
              style={{ ...styles.tab, ...(activeTab === 'history' ? styles.activeTab : {}) }}
              onClick={() => setActiveTab('history')}
            >
              📋 History
            </button>
            <button
              style={{ ...styles.tab, ...(activeTab === 'settings' ? styles.activeTab : {}) }}
              onClick={() => setActiveTab('settings')}
            >
              ⚙️ Settings
            </button>
          </div>

          {/* Send Money Tab */}
          {activeTab === 'send' && (
            <div style={styles.tabContent}>
              <h3 style={styles.sectionTitle}>Send Money with Zelle®</h3>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>From Account</label>
                <select
                  style={styles.select}
                  value={sendForm.from_account}
                  onChange={(e) => setSendForm(prev => ({ ...prev, from_account: e.target.value }))}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_type?.toUpperCase()} - ****{acc.account_number?.slice(-4)} - {formatCurrency(acc.balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Recipient Email or Phone</label>
                <input
                  type="text"
                  style={styles.input}
                  value={sendForm.receiver_contact}
                  onChange={(e) => setSendForm(prev => ({ ...prev, receiver_contact: e.target.value }))}
                  placeholder="email@example.com or (555) 123-4567"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Amount</label>
                <input
                  type="number"
                  style={styles.input}
                  value={sendForm.amount}
                  onChange={(e) => setSendForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  step="0.01"
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
                style={styles.primaryButton}
                onClick={handleLookupReceiver}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Continue →'}
              </button>
            </div>
          )}

          {/* Contacts Tab */}
          {activeTab === 'contacts' && (
            <div style={styles.tabContent}>
              <h3 style={styles.sectionTitle}>Zelle Contacts</h3>
              {contacts.length === 0 ? (
                <p style={styles.emptyText}>No contacts yet</p>
              ) : (
                <div style={styles.contactsList}>
                  {contacts.map(contact => (
                    <div key={contact.id} style={styles.contactCard}>
                      <div style={styles.contactAvatar}>{contact.name?.charAt(0)?.toUpperCase()}</div>
                      <div>
                        <div style={styles.contactName}>{contact.name}</div>
                        <div style={styles.contactDetail}>{contact.email || contact.phone}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div style={styles.tabContent}>
              <h3 style={styles.sectionTitle}>Recent Zelle Transactions</h3>
              {transactions.length === 0 ? (
                <p style={styles.emptyText}>No transactions yet</p>
              ) : (
                <div style={styles.transactionsList}>
                  {transactions.map(txn => (
                    <div key={txn.id} style={styles.transactionCard}>
                      <div style={styles.transactionInfo}>
                        <div style={styles.transactionType}>
                          {txn.sender_id === user.id ? '↑ Sent' : '↓ Received'}
                        </div>
                        <div style={styles.transactionContact}>{txn.recipient_contact}</div>
                        <div style={styles.transactionDate}>
                          {new Date(txn.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={styles.transactionRight}>
                        <div style={styles.transactionAmount}>
                          {txn.sender_id === user.id ? '-' : '+'}{formatCurrency(txn.amount)}
                        </div>
                        <div style={{
                          ...styles.transactionStatus,
                          color: txn.status === 'completed' ? '#059669' : 
                                 txn.status === 'pending' ? '#ea580c' : '#dc2626'
                        }}>
                          {txn.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div style={styles.tabContent}>
              <h3 style={styles.sectionTitle}>Zelle Settings</h3>
              <Link href="/zelle-settings" style={styles.settingsLink}>
                Manage Zelle Settings →
              </Link>
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && receiverData && (
          <div style={styles.modalOverlay} onClick={() => setShowConfirmModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Confirm Transfer</h2>
              <div style={styles.modalContent}>
                <div style={styles.modalRow}>
                  <span style={styles.modalLabel}>Recipient:</span>
                  <span style={styles.modalValue}>{receiverData.first_name} {receiverData.last_name}</span>
                </div>
                <div style={styles.modalRow}>
                  <span style={styles.modalLabel}>Email:</span>
                  <span style={styles.modalValue}>{receiverData.email}</span>
                </div>
                <div style={styles.modalRow}>
                  <span style={styles.modalLabel}>Amount:</span>
                  <span style={styles.modalValue}>{formatCurrency(sendForm.amount)}</span>
                </div>
                {sendForm.memo && (
                  <div style={styles.modalRow}>
                    <span style={styles.modalLabel}>Memo:</span>
                    <span style={styles.modalValue}>{sendForm.memo}</span>
                  </div>
                )}
              </div>
              <div style={styles.modalButtons}>
                <button style={styles.cancelButton} onClick={() => setShowConfirmModal(false)}>
                  Cancel
                </button>
                <button style={styles.confirmButton} onClick={sendVerificationCode}>
                  Send Verification Code
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Verification Modal */}
        {showVerificationModal && (
          <div style={styles.modalOverlay} onClick={() => setShowVerificationModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Enter Verification Code</h2>
              <p style={styles.modalText}>We sent a 6-digit code to {user.email}</p>
              <input
                type="text"
                style={styles.verificationInput}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="000000"
                maxLength="6"
              />
              <div style={styles.modalButtons}>
                <button style={styles.cancelButton} onClick={() => setShowVerificationModal(false)}>
                  Cancel
                </button>
                <button style={styles.confirmButton} onClick={completeTransfer} disabled={loading}>
                  {loading ? 'Processing...' : 'Complete Transfer'}
                </button>
              </div>
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: '100px'
  },
  header: {
    backgroundColor: '#0a1a2f',
    color: 'white',
    padding: '1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(10, 26, 47, 0.25)'
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
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem'
  },
  content: {
    padding: '2rem',
    maxWidth: '900px',
    margin: '0 auto'
  },
  titleSection: {
    marginBottom: '2rem',
    textAlign: 'center'
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#0a1a2f',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '1rem',
    color: '#64748b'
  },
  balanceCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '2rem',
    marginBottom: '2rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  balanceItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  balanceLabel: {
    fontSize: '0.9rem',
    color: '#64748b',
    fontWeight: '500'
  },
  balanceValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#0a1a2f'
  },
  message: {
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    border: '2px solid'
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '2rem',
    backgroundColor: 'white',
    padding: '0.5rem',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
  },
  tab: {
    flex: 1,
    padding: '0.875rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#64748b'
  },
  activeTab: {
    backgroundColor: '#0a1a2f',
    color: 'white'
  },
  tabContent: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#0a1a2f',
    marginBottom: '1.5rem'
  },
  formGroup: {
    marginBottom: '1.5rem'
  },
  label: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem'
  },
  select: {
    width: '100%',
    padding: '0.875rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    backgroundColor: 'white'
  },
  input: {
    width: '100%',
    padding: '0.875rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    boxSizing: 'border-box'
  },
  primaryButton: {
    width: '100%',
    padding: '1rem',
    backgroundColor: '#0a1a2f',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '1rem'
  },
  contactsList: {
    display: 'grid',
    gap: '1rem'
  },
  contactCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '2px solid #e2e8f0'
  },
  contactAvatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: '#d4af37',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: 'bold'
  },
  contactName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#0a1a2f'
  },
  contactDetail: {
    fontSize: '0.85rem',
    color: '#64748b'
  },
  transactionsList: {
    display: 'grid',
    gap: '1rem'
  },
  transactionCard: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '2px solid #e2e8f0'
  },
  transactionInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  transactionType: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#0a1a2f'
  },
  transactionContact: {
    fontSize: '0.85rem',
    color: '#64748b'
  },
  transactionDate: {
    fontSize: '0.8rem',
    color: '#94a3b8'
  },
  transactionRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.25rem'
  },
  transactionAmount: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#0a1a2f'
  },
  transactionStatus: {
    fontSize: '0.8rem',
    fontWeight: '600'
  },
  settingsLink: {
    display: 'inline-block',
    padding: '1rem 2rem',
    backgroundColor: '#0a1a2f',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontWeight: '600'
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    padding: '2rem'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#0a1a2f',
    marginBottom: '1.5rem'
  },
  modalContent: {
    marginBottom: '2rem'
  },
  modalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.75rem 0',
    borderBottom: '1px solid #e2e8f0'
  },
  modalLabel: {
    fontSize: '0.9rem',
    color: '#64748b',
    fontWeight: '500'
  },
  modalValue: {
    fontSize: '0.9rem',
    color: '#0a1a2f',
    fontWeight: '600'
  },
  modalText: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginBottom: '1.5rem'
  },
  verificationInput: {
    width: '100%',
    padding: '1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1.5rem',
    textAlign: 'center',
    letterSpacing: '0.5rem',
    fontWeight: 'bold',
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
    backgroundColor: '#f1f5f9',
    color: '#0a1a2f',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  confirmButton: {
    flex: 1,
    padding: '0.875rem',
    backgroundColor: '#d4af37',
    color: '#0a1a2f',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer'
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
    borderTop: '3px solid #0a1a2f',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '1rem',
    color: '#64748b',
    fontSize: '1rem'
  }
};

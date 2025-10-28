import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';
import QRCode from 'qrcode';

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
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const router = useRouter();
  const qrCanvasRef = useRef(null);

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

  const generateQRCode = async () => {
    try {
      const zelleData = JSON.stringify({
        email: user.email,
        name: userProfile?.full_name || 'User'
      });

      const qrDataUrl = await QRCode.toDataURL(zelleData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#6B21A8',
          light: '#FFFFFF'
        }
      });

      setQrCodeDataUrl(qrDataUrl);
      setShowQRModal(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
      setMessage('Failed to generate QR code');
    }
  };

  const handleSendMoney = async () => {
    if (!sendForm.from_account || !sendForm.receiver_contact || !sendForm.amount) {
      setMessage('❌ Please fill in all required fields');
      return;
    }

    const amount = parseFloat(sendForm.amount);
    if (amount <= 0 || isNaN(amount)) {
      setMessage('❌ Please enter a valid amount');
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
          amount: amount,
          memo: sendForm.memo || 'Zelle Transfer',
          transaction_type: 'send'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Transfer failed');
      }

      setMessage('✅ Transfer completed successfully!');
      setSendForm({ from_account: sendForm.from_account, receiver_contact: '', amount: '', memo: '' });
      await checkUserAndLoadData();

    } catch (error) {
      console.error('Error sending money:', error);
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
          <button onClick={generateQRCode} style={styles.qrButton}>
            📷 My QR Code
          </button>
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
            {['send', 'contacts', 'transactions'].map(tab => (
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
                      {acc.account_type?.toUpperCase()} - ****{acc.account_number?.slice(-4)} ({formatCurrency(acc.balance)})
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
                onClick={handleSendMoney}
                style={styles.primaryButton}
                disabled={loading}
              >
                {loading ? '⏳ Processing...' : '💸 Send Money'}
              </button>
            </div>
          )}

          {/* CONTACTS TAB */}
          {activeTab === 'contacts' && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Zelle® Contacts</h2>

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
                      onClick={() => {
                        setSendForm(prev => ({ ...prev, receiver_contact: contact.email || contact.phone }));
                        setActiveTab('send');
                      }}
                      style={styles.sendToButton}
                    >
                      Send →
                    </button>
                  </div>
                ))}
                {contacts.length === 0 && (
                  <p style={styles.emptyState}>No contacts yet.</p>
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
                          ? `To: ${txn.recipient_name || txn.recipient_contact}` 
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
        </div>

        {/* QR CODE MODAL */}
        {showQRModal && (
          <div style={styles.modal} onClick={() => setShowQRModal(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>My Zelle® QR Code</h2>
              <p style={styles.modalText}>Share this QR code to receive money</p>

              {qrCodeDataUrl && (
                <div style={styles.qrCodeContainer}>
                  <img src={qrCodeDataUrl} alt="Zelle QR Code" style={styles.qrCodeImage} />
                </div>
              )}

              <div style={styles.qrInfo}>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Name:</strong> {userProfile?.full_name || 'User'}</p>
              </div>

              <button onClick={() => setShowQRModal(false)} style={styles.closeButton}>
                Close
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
  qrButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem'
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
  contactList: {
    marginTop: '1rem'
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
    textAlign: 'center'
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
  qrCodeContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '1.5rem'
  },
  qrCodeImage: {
    maxWidth: '300px',
    width: '100%',
    height: 'auto'
  },
  qrInfo: {
    backgroundColor: '#f1f5f9',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    textAlign: 'left'
  },
  closeButton: {
    padding: '0.75rem 2rem',
    backgroundColor: '#6B21A8',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600'
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
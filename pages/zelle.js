import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function Zelle() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [activeTab, setActiveTab] = useState('send');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const router = useRouter();

  // Form states
  const [sendForm, setSendForm] = useState({
    recipient: '',
    amount: '',
    memo: '',
    account_id: ''
  });

  const [requestForm, setRequestForm] = useState({
    recipient: '',
    amount: '',
    memo: '',
    account_id: ''
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

      // Fetch user accounts
      const { data: userAccounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active');

      setAccounts(userAccounts || []);

      if (userAccounts?.length > 0) {
        setSendForm(prev => ({ ...prev, account_id: userAccounts[0].id }));
        setRequestForm(prev => ({ ...prev, account_id: userAccounts[0].id }));
      }

    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading data. Please try again.');
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

  const handleSendMoney = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const amount = parseFloat(sendForm.amount);
      if (amount <= 0 || amount > 2500) {
        setMessage('Amount must be between $0.01 and $2,500');
        setLoading(false);
        return;
      }

      // Validate recipient (email or phone)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;

      if (!emailRegex.test(sendForm.recipient) && !phoneRegex.test(sendForm.recipient)) {
        setMessage('Please enter a valid email address or phone number');
        setLoading(false);
        return;
      }

      // Call the API to process the transaction
      const response = await fetch('/api/zelle-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_id: user.id,
          sender_account_id: sendForm.account_id,
          recipient_contact: sendForm.recipient,
          amount: amount,
          memo: sendForm.memo || 'Zelle Transfer',
          transaction_type: 'send'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Transaction failed');
      }

      setMessage('✅ Zelle payment sent successfully!');
      setSendForm({ recipient: '', amount: '', memo: '', account_id: sendForm.account_id });

      setTimeout(() => {
        checkUserAndFetchData();
      }, 2000);

    } catch (error) {
      console.error('Error sending money:', error);
      setMessage('Error sending money. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestMoney = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const amount = parseFloat(requestForm.amount);
      if (amount <= 0 || amount > 2500) {
        setMessage('Amount must be between $0.01 and $2,500');
        setLoading(false);
        return;
      }

      // Validate recipient
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;

      if (!emailRegex.test(requestForm.recipient) && !phoneRegex.test(requestForm.recipient)) {
        setMessage('Please enter a valid email address or phone number');
        setLoading(false);
        return;
      }

      // Call the API to process the request
      const response = await fetch('/api/zelle-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_id: user.id,
          sender_account_id: requestForm.account_id,
          recipient_contact: requestForm.recipient,
          amount: amount,
          memo: requestForm.memo || 'Zelle Request',
          transaction_type: 'request'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Request failed');
      }

      setMessage('✅ Zelle request sent successfully!');
      setRequestForm({ recipient: '', amount: '', memo: '', account_id: requestForm.account_id });

    } catch (error) {
      console.error('Error requesting money:', error);
      setMessage('Error sending request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !user) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading Zelle...</p>
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
          <p style={styles.loginMessage}>You need to be logged in to use Zelle</p>
          <Link href="/login" style={styles.loginButton}>Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Zelle - Send & Request Money - Oakline Bank</title>
        <meta name="description" content="Send and request money quickly with Zelle" />
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
            <div style={styles.zelleHeader}>
              <div style={styles.zelleLogo}>Z</div>
              <div>
                <h1 style={styles.title}>Zelle®</h1>
                <p style={styles.subtitle}>Send money in minutes</p>
              </div>
            </div>
          </div>

          {/* Email Verification Alert */}
          <div style={styles.verificationAlert}>
            <div style={styles.alertIcon}>⚠️</div>
            <div style={styles.alertContent}>
              <h3 style={styles.alertTitle}>Verify Your Email</h3>
              <p style={styles.alertText}>
                Please verify your email address to complete your Zelle profile and ensure secure transactions.
              </p>
              <button style={styles.resendButton}>Resend Verification Email</button>
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
                  ...(activeTab === 'send' ? styles.activeTab : {})
                }}
                onClick={() => setActiveTab('send')}
              >
                💸 Send
              </button>
              <button
                style={{
                  ...styles.tab,
                  ...(activeTab === 'request' ? styles.activeTab : {})
                }}
                onClick={() => setActiveTab('request')}
              >
                💰 Request
              </button>
              <button
                style={{
                  ...styles.tab,
                  ...(activeTab === 'activity' ? styles.activeTab : {})
                }}
                onClick={() => setActiveTab('activity')}
              >
                📋 Activity
              </button>
            </div>
          </div>

          {/* Send Money Tab */}
          {activeTab === 'send' && (
            <div style={styles.tabContent}>
              <form onSubmit={handleSendMoney} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>From Account *</label>
                  <select
                    style={styles.select}
                    value={sendForm.account_id}
                    onChange={(e) => setSendForm(prev => ({ ...prev, account_id: e.target.value }))}
                    required
                  >
                    <option value="">Select account</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.account_type?.replace('_', ' ')?.toUpperCase()} -
                        ****{account.account_number?.slice(-4)} -
                        {formatCurrency(account.balance || 0)}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>To (Email or Phone) *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={sendForm.recipient}
                    onChange={(e) => setSendForm(prev => ({ ...prev, recipient: e.target.value }))}
                    placeholder="email@example.com or (555) 123-4567"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Amount ($) *</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={sendForm.amount}
                    onChange={(e) => setSendForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    max="2500"
                    required
                  />
                  <small style={styles.helperText}>Daily limit: $2,500</small>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>What's this for? (Optional)</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={sendForm.memo}
                    onChange={(e) => setSendForm(prev => ({ ...prev, memo: e.target.value }))}
                    placeholder="Dinner, rent, etc."
                    maxLength="100"
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    ...styles.submitButton,
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                  disabled={loading}
                >
                  {loading ? '🔄 Sending...' : `Send ${formatCurrency(parseFloat(sendForm.amount) || 0)}`}
                </button>
              </form>
            </div>
          )}

          {/* Request Money Tab */}
          {activeTab === 'request' && (
            <div style={styles.tabContent}>
              <form onSubmit={handleRequestMoney} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>To Account *</label>
                  <select
                    style={styles.select}
                    value={requestForm.account_id}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, account_id: e.target.value }))}
                    required
                  >
                    <option value="">Select account</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.account_type?.replace('_', ' ')?.toUpperCase()} -
                        ****{account.account_number?.slice(-4)}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>From (Email or Phone) *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={requestForm.recipient}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, recipient: e.target.value }))}
                    placeholder="email@example.com or (555) 123-4567"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Amount ($) *</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={requestForm.amount}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    max="2500"
                    required
                  />
                  <small style={styles.helperText}>Daily limit: $2,500</small>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>What's this for? (Optional)</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={requestForm.memo}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, memo: e.target.value }))}
                    placeholder="Dinner, rent, etc."
                    maxLength="100"
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    ...styles.submitButton,
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                  disabled={loading}
                >
                  {loading ? '🔄 Requesting...' : `Request ${formatCurrency(parseFloat(requestForm.amount) || 0)}`}
                </button>
              </form>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div style={styles.tabContent}>
              <ZelleActivity userId={user.id} />
            </div>
          )}

          <div style={styles.servicesGrid}>
            <Link href="/zelle/send" className="serviceCard">
              <div style={styles.serviceIcon}>➡️</div>
              <h3 style={styles.serviceTitle}>Send Money</h3>
              <p style={styles.serviceDesc}>Quickly send money to friends and family.</p>
            </Link>
            <Link href="/zelle/request" className="serviceCard">
              <div style={styles.serviceIcon}>📥</div>
              <h3 style={styles.serviceTitle}>Request Money</h3>
              <p style={styles.serviceDesc}>Easily request money from anyone.</p>
            </Link>
            <Link href="/zelle/history" className="serviceCard">
              <div style={styles.serviceIcon}>⏱️</div>
              <h3 style={styles.serviceTitle}>Transaction History</h3>
              <p style={styles.serviceDesc}>View your past Zelle transactions.</p>
            </Link>
            <Link href="/settings/user" className="serviceCard">
              <div style={styles.serviceIcon}>⚙️</div>
              <h3 style={styles.serviceTitle}>General Settings</h3>
              <p style={styles.serviceDesc}>Manage your account and banking preferences.</p>
            </Link>
          </div>


          <div style={styles.infoSection}>
            <h4 style={styles.infoTitle}>🔒 Zelle Safety</h4>
            <ul style={styles.infoList}>
              <li>Only send money to people you know and trust</li>
              <li>Zelle payments are typically delivered in minutes</li>
              <li>Daily sending limit: $2,500</li>
              <li>Monthly sending limit: $20,000</li>
              <li>Payments can't be canceled once sent</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

// Zelle Activity Component
function ZelleActivity({ userId }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchZelleActivity();
  }, [userId]);

  const fetchZelleActivity = async () => {
    try {
      const { data, error } = await supabase
        .from('zelle_transactions')
        .select('*')
        .eq('sender_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching Zelle activity:', error);
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

  if (loading) {
    return <div style={styles.activityLoading}>Loading activity...</div>;
  }

  if (transactions.length === 0) {
    return (
      <div style={styles.emptyActivity}>
        <div style={styles.emptyIcon}>📱</div>
        <h3>No Zelle Activity</h3>
        <p>Your Zelle transactions will appear here</p>
      </div>
    );
  }

  return (
    <div style={styles.activityContainer}>
      {transactions.map((transaction) => (
        <div key={transaction.id} style={styles.activityItem}>
          <div style={styles.activityIcon}>
            {transaction.transaction_type === 'send' ? '💸' : '💰'}
          </div>
          <div style={styles.activityDetails}>
            <div style={styles.activityTitle}>
              {transaction.transaction_type === 'send' ? 'Sent to' : 'Requested from'} {transaction.recipient_contact}
            </div>
            <div style={styles.activityMemo}>{transaction.memo}</div>
            <div style={styles.activityDate}>
              {new Date(transaction.created_at).toLocaleDateString()}
            </div>
          </div>
          <div style={styles.activityAmount}>
            <div style={{
              ...styles.activityAmountText,
              color: transaction.transaction_type === 'send' ? '#dc2626' : '#059669'
            }}>
              {transaction.transaction_type === 'send' ? '-' : '+'}{formatCurrency(transaction.amount)}
            </div>
            <div style={styles.activityStatus}>
              {transaction.status}
            </div>
          </div>
        </div>
      ))}
    </div>
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
    backgroundColor: '#1A3E6F',
    color: 'white',
    padding: '1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(26, 62, 111, 0.25)',
    borderBottom: '3px solid #059669'
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
    maxWidth: '600px',
    margin: '0 auto'
  },
  titleSection: {
    marginBottom: '1.5rem'
  },
  zelleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  zelleLogo: {
    width: '60px',
    height: '60px',
    backgroundColor: '#6B46C1',
    color: 'white',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontWeight: 'bold'
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
    gap: '0.5rem'
  },
  tab: {
    flex: 1,
    padding: '0.75rem',
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
    backgroundColor: '#6B46C1',
    color: 'white'
  },
  tabContent: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#374151'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.9rem',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.9rem',
    backgroundColor: 'white',
    boxSizing: 'border-box'
  },
  helperText: {
    fontSize: '0.8rem',
    color: '#64748b',
    fontStyle: 'italic'
  },
  submitButton: {
    width: '100%',
    padding: '1rem',
    backgroundColor: '#6B46C1',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: '0.5rem'
  },
  message: {
    padding: '1rem',
    borderRadius: '8px',
    border: '2px solid',
    marginBottom: '1rem',
    fontSize: '0.9rem'
  },
  infoSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
  },
  infoTitle: {
    color: '#6B46C1',
    marginBottom: '0.75rem',
    fontSize: '1rem'
  },
  infoList: {
    margin: 0,
    paddingLeft: '1.2rem',
    color: '#374151',
    lineHeight: '1.6',
    fontSize: '0.85rem'
  },
  activityContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  activityIcon: {
    fontSize: '1.5rem'
  },
  activityDetails: {
    flex: 1
  },
  activityTitle: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.25rem'
  },
  activityMemo: {
    fontSize: '0.8rem',
    color: '#64748b',
    marginBottom: '0.25rem'
  },
  activityDate: {
    fontSize: '0.7rem',
    color: '#94a3b8'
  },
  activityAmount: {
    textAlign: 'right'
  },
  activityAmountText: {
    fontSize: '0.9rem',
    fontWeight: '600',
    marginBottom: '0.25rem'
  },
  activityStatus: {
    fontSize: '0.7rem',
    color: '#64748b',
    textTransform: 'capitalize'
  },
  emptyActivity: {
    textAlign: 'center',
    padding: '3rem 1rem',
    color: '#64748b'
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },
  activityLoading: {
    textAlign: 'center',
    padding: '2rem',
    color: '#64748b'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f1f5f9'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #6B46C1',
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
    backgroundColor: '#6B46C1',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '500'
  },

  // Email Verification Alert
  verificationAlert: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '2rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  alertIcon: {
    fontSize: '1.5rem'
  },
  alertContent: {
    flex: 1
  },
  alertTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#856404',
    marginBottom: '0.5rem'
  },
  alertText: {
    color: '#856404',
    marginBottom: '1rem',
    lineHeight: '1.5'
  },
  resendButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#856404',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },

  // Zelle Services Grid
  servicesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },
  serviceCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    textAlign: 'center',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'all 0.3s ease',
    border: '1px solid #e2e8f0'
  },
  serviceIcon: {
    fontSize: '2rem',
    marginBottom: '1rem'
  },
  serviceTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  serviceDesc: {
    fontSize: '0.9rem',
    color: '#64748b',
    lineHeight: '1.4'
  },

  // Zelle Activity Component
};

if (typeof document !== 'undefined') {
  const existingStyle = document.querySelector('#zelle-styles');
  if (!existingStyle) {
    const zelleStyles = document.createElement('style');
    zelleStyles.id = 'zelle-styles';
    zelleStyles.textContent = `
      .serviceCard:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
        border-color: #6B46C1 !important;
      }

      .resendButton:hover {
        background-color: #6c5ce7 !important;
        transform: translateY(-2px);
      }

      input:focus {
        outline: none !important;
        border-color: #6B46C1 !important;
        box-shadow: 0 0 0 3px rgba(107, 70, 193, 0.1) !important;
      }

      select:focus {
        outline: none !important;
        border-color: #6B46C1 !important;
        box-shadow: 0 0 0 3px rgba(107, 70, 193, 0.1) !important;
      }
`;
    document.head.appendChild(zelleStyles);
  }
}
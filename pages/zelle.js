import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function ZellePage() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('send');
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingTransfer, setPendingTransfer] = useState(null);
  const [recipientData, setRecipientData] = useState(null);
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

  const lookupRecipient = async () => {
    if (!sendForm.receiver_contact) {
      setMessage('❌ Please enter recipient email or phone');
      return;
    }

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .or(`email.eq.${sendForm.receiver_contact},phone.eq.${sendForm.receiver_contact}`)
        .single();

      if (!profile) {
        setMessage('❌ Recipient not found in Oakline Bank');
        setRecipientData(null);
        setLoading(false);
        return;
      }

      setRecipientData(profile);
      setMessage(`✅ Found: ${profile.full_name}`);
    } catch (error) {
      console.error('Error looking up recipient:', error);
      setMessage('❌ Recipient not found');
      setRecipientData(null);
    } finally {
      setLoading(false);
    }
  };

  const initiateTransfer = async () => {
    if (!sendForm.from_account || !sendForm.receiver_contact || !sendForm.amount || !recipientData) {
      setMessage('❌ Please fill all fields and verify recipient');
      return;
    }

    const amount = parseFloat(sendForm.amount);
    if (amount <= 0 || isNaN(amount)) {
      setMessage('❌ Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/zelle-send-money', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          sender_account_id: sendForm.from_account,
          recipient_contact: sendForm.receiver_contact,
          amount: amount,
          memo: sendForm.memo,
          step: 'initiate'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to initiate transfer');
      }

      setPendingTransfer(result);
      setShowVerificationModal(true);
      setMessage('✅ Verification code sent to your email');

    } catch (error) {
      console.error('Error initiating transfer:', error);
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const completeTransfer = async () => {
    if (!verificationCode) {
      setMessage('❌ Please enter verification code');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/zelle-send-money', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          transaction_id: pendingTransfer.transaction_id,
          verification_code: verificationCode,
          step: 'complete'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Verification failed');
      }

      setMessage('✅ Transfer completed successfully!');
      setShowVerificationModal(false);
      setSendForm({ from_account: sendForm.from_account, receiver_contact: '', amount: '', memo: '' });
      setRecipientData(null);
      setVerificationCode('');
      setPendingTransfer(null);

      await checkUserAndLoadData();

    } catch (error) {
      console.error('Error completing transfer:', error);
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

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f1f5f9',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      background: 'linear-gradient(135deg, #6B21A8 0%, #9333EA 100%)',
      color: 'white',
      padding: '1.5rem 2rem',
      boxShadow: '0 4px 20px rgba(107, 33, 168, 0.3)'
    },
    headerContent: {
      maxWidth: '1200px',
      margin: '0 auto',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    logo: {
      height: '45px'
    },
    backButton: {
      padding: '0.6rem 1.2rem',
      background: 'rgba(255,255,255,0.2)',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '8px',
      fontSize: '0.95rem',
      border: '1px solid rgba(255,255,255,0.3)'
    },
    content: {
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '2rem'
    },
    title: {
      fontSize: '2rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '0.5rem'
    },
    subtitle: {
      fontSize: '1.1rem',
      color: '#64748b',
      marginBottom: '2rem'
    },
    tabs: {
      display: 'flex',
      gap: '0.5rem',
      marginBottom: '1.5rem'
    },
    tab: {
      padding: '0.75rem 1.5rem',
      border: 'none',
      background: 'white',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '1rem',
      fontWeight: '500',
      color: '#64748b'
    },
    activeTab: {
      background: 'linear-gradient(135deg, #6B21A8 0%, #9333EA 100%)',
      color: 'white',
      fontWeight: '600'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '2rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
    },
    formGroup: {
      marginBottom: '1.5rem'
    },
    label: {
      display: 'block',
      marginBottom: '0.5rem',
      fontWeight: '600',
      color: '#374151'
    },
    input: {
      width: '100%',
      padding: '0.875rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '1rem',
      boxSizing: 'border-box'
    },
    select: {
      width: '100%',
      padding: '0.875rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '1rem',
      backgroundColor: 'white',
      boxSizing: 'border-box'
    },
    button: {
      width: '100%',
      padding: '1rem',
      background: 'linear-gradient(135deg, #6B21A8 0%, #9333EA 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '1.1rem',
      fontWeight: '600',
      cursor: 'pointer',
      marginTop: '1rem'
    },
    secondaryButton: {
      padding: '0.75rem 1.5rem',
      background: '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '0.9rem',
      fontWeight: '600'
    },
    message: {
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      fontWeight: '500'
    },
    recipientCard: {
      backgroundColor: '#ecfdf5',
      border: '2px solid #10b981',
      borderRadius: '12px',
      padding: '1.25rem',
      marginBottom: '1.5rem'
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
      borderRadius: '16px',
      maxWidth: '500px',
      width: '90%'
    },
    transactionItem: {
      padding: '1rem',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      marginBottom: '0.75rem',
      display: 'flex',
      justifyContent: 'space-between'
    }
  };

  if (loading && !user) {
    return <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p>Loading...</p>
    </div>;
  }

  return (
    <>
      <Head>
        <title>Zelle® - Oakline Bank</title>
      </Head>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={styles.logo} />
            <Link href="/dashboard" style={styles.backButton}>← Dashboard</Link>
          </div>
        </div>

        <div style={styles.content}>
          <h1 style={styles.title}>Zelle®</h1>
          <p style={styles.subtitle}>Send money instantly with Zelle®</p>

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
            <button onClick={() => setActiveTab('send')}
              style={{ ...styles.tab, ...(activeTab === 'send' ? styles.activeTab : {}) }}>
              💸 Send Money
            </button>
            <button onClick={() => setActiveTab('transactions')}
              style={{ ...styles.tab, ...(activeTab === 'transactions' ? styles.activeTab : {}) }}>
              📊 History
            </button>
          </div>

          {activeTab === 'send' && (
            <div style={styles.card}>
              <div style={styles.formGroup}>
                <label style={styles.label}>From Account</label>
                <select style={styles.select} value={sendForm.from_account}
                  onChange={(e) => setSendForm(prev => ({ ...prev, from_account: e.target.value }))}>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_type?.toUpperCase()} - ****{acc.account_number?.slice(-4)} ({formatCurrency(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Recipient Email or Phone</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="text" style={{ ...styles.input, flex: 1 }} value={sendForm.receiver_contact}
                    onChange={(e) => setSendForm(prev => ({ ...prev, receiver_contact: e.target.value }))}
                    placeholder="email@example.com or (555) 123-4567" />
                  <button onClick={lookupRecipient} style={styles.secondaryButton} disabled={loading}>
                    {loading ? '🔄' : '✓ Verify'}
                  </button>
                </div>
              </div>

              {recipientData && (
                <div style={styles.recipientCard}>
                  <div style={{ fontWeight: '700', color: '#065f46', marginBottom: '0.5rem' }}>✓ Recipient Verified</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#064e3b' }}>{recipientData.full_name}</div>
                  <div style={{ fontSize: '0.9rem', color: '#065f46' }}>{recipientData.email}</div>
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Amount</label>
                <input type="number" step="0.01" style={styles.input} value={sendForm.amount}
                  onChange={(e) => setSendForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00" disabled={!recipientData} />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Memo (Optional)</label>
                <input type="text" style={styles.input} value={sendForm.memo}
                  onChange={(e) => setSendForm(prev => ({ ...prev, memo: e.target.value }))}
                  placeholder="What's this for?" disabled={!recipientData} />
              </div>

              <button onClick={initiateTransfer} style={styles.button} disabled={loading || !recipientData}>
                {loading ? '⏳ Processing...' : '💸 Send Money'}
              </button>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div style={styles.card}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '1.5rem' }}>Recent Transactions</h2>
              {transactions.map(txn => (
                <div key={txn.id} style={styles.transactionItem}>
                  <div>
                    <div style={{ fontWeight: '600' }}>
                      {txn.sender_id === user?.id ? '📤 Sent' : '📥 Received'}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                      {txn.sender_id === user?.id ? `To: ${txn.recipient_name}` : 'From Zelle®'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                      {new Date(txn.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '700', color: txn.sender_id === user?.id ? '#ef4444' : '#10b981' }}>
                      {txn.sender_id === user?.id ? '-' : '+'}${parseFloat(txn.amount).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'capitalize' }}>
                      {txn.status}
                    </div>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>No transactions yet</p>
              )}
            </div>
          )}
        </div>

        {showVerificationModal && (
          <div style={styles.modal} onClick={() => setShowVerificationModal(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Enter Verification Code</h2>
              <p style={{ marginBottom: '1.5rem', color: '#64748b' }}>
                We sent a 6-digit code to {userProfile?.email}
              </p>
              <input type="text" style={styles.input} value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="000000" maxLength="6" />
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button onClick={() => setShowVerificationModal(false)}
                  style={{ flex: 1, padding: '0.875rem', background: '#f1f5f9', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={completeTransfer} style={{ ...styles.button, marginTop: 0, flex: 1 }} disabled={loading}>
                  {loading ? 'Verifying...' : 'Complete Transfer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}